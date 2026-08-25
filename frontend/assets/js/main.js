// ============================================================
// Infinity Marketing & Advertisement — shared front-end behaviour
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Mobile nav ---- */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      item.closest('.faq-list')?.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ---- Scroll reveal ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---- Contact / lead forms: posts to the live backend ---- */
  const API_BASE = window.location.origin.includes('5500') || window.location.protocol === 'file:'
    ? 'http://localhost:5000' // static file server / file:// preview → point at local API
    : ''; // same-origin when served by the Express backend itself

  document.querySelectorAll('form[data-lead-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Sending…';
      btn.disabled = true;

      const data = Object.fromEntries(new FormData(form).entries());
      // Careers form maps "role" -> message context; contact form already has "goal"
      if (form.closest('#apply')) { data.source = 'careers_form'; data.goal = data.role; }
      else if (form.querySelector('#l-email')) { data.source = 'login_form'; } // handled separately below
      else if (form.closest('.wrap-960') && !data.goal) { data.source = 'newsletter'; }
      else { data.source = data.source || 'contact_form'; }

      try {
        const res = await fetch(`${API_BASE}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Something went wrong.');
        form.reset();
        btn.textContent = 'Sent — we\u2019ll be in touch';
      } catch (err) {
        btn.textContent = 'Error — please try again';
        console.error(err);
      } finally {
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2600);
      }
    });
  });

  /* ---- Login form: real auth call ---- */
  const loginForm = document.querySelector('#l-email')?.closest('form');
  if (loginForm) {
    loginForm.removeAttribute('data-lead-form'); // don't double-handle as a lead
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Logging in…';
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: document.getElementById('l-email').value,
            password: document.getElementById('l-pass').value,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Login failed.');
        localStorage.setItem('im_token', json.token);
        btn.textContent = 'Welcome back!';
        // In a full app: redirect to a dashboard.html that reads /api/dashboard/reports
      } catch (err) {
        btn.textContent = err.message || 'Login failed';
      } finally {
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2600);
      }
    });
  }

  initChatbot();
});

/* ============================================================
   AI Chatbot widget
   Posts each user message to POST /api/chat on the backend, which
   calls OpenAI with the company knowledge-base system prompt
   (see backend/src/controllers/chatController.js) and logs the
   full conversation to chat_sessions / chat_messages in Postgres.
   If OPENAI_API_KEY isn't set on the backend, it still responds
   with a safe fallback message instead of failing.
   ============================================================ */

function initChatbot() {
  const fab = document.querySelector('.chat-fab');
  const panel = document.querySelector('.chat-panel');
  const body = document.querySelector('.chat-body');
  const inputRow = document.querySelector('.chat-input-row');
  const input = document.querySelector('.chat-input-row input');
  const quickRow = document.querySelector('.chat-quick');
  if (!fab || !panel) return;

  const API_BASE = window.location.origin.includes('5500') || window.location.protocol === 'file:'
    ? 'http://localhost:5000'
    : '';

  let sessionId = null;
  let askedForLead = false;

  fab.addEventListener('click', () => panel.classList.toggle('open'));
  panel.querySelector('.chat-close')?.addEventListener('click', () => panel.classList.remove('open'));

  function addMsg(text, who) {
    const div = document.createElement('div');
    div.className = `chat-msg ${who}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg bot typing-dots';
    div.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  async function respond(text) {
    const typing = showTyping();
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text, pageUrl: window.location.href }),
      });
      const json = await res.json();
      typing.remove();
      if (!res.ok) throw new Error(json.error || 'The assistant is temporarily unavailable.');
      sessionId = json.sessionId;
      addMsg(json.reply, 'bot');
      if (!askedForLead && /consult|call|quote|yes|interested/i.test(text)) {
        askedForLead = true;
        setTimeout(() => addMsg("Great — drop your email or phone number here and we'll follow up within one business day.", 'bot'), 400);
      }
    } catch (err) {
      typing.remove();
      addMsg("Sorry, I'm having trouble connecting right now. Please try the contact form instead.", 'bot');
      console.error(err);
    }
  }

  quickRow?.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const text = e.target.textContent;
      addMsg(text, 'user');
      respond(text);
      quickRow.remove();
    }
  });

  inputRow?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    addMsg(val, 'user');
    input.value = '';

    // If we've asked for contact details, treat this message as the lead capture
    if (askedForLead && /@|\+?\d{6,}/.test(val)) {
      try {
        await fetch(`${API_BASE}/api/chat/lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            email: val.includes('@') ? val : undefined,
            phone: !val.includes('@') ? val : undefined,
          }),
        });
        addMsg("Got it — thank you! A member of our team will reach out shortly.", 'bot');
        return;
      } catch (err) { console.error(err); }
    }
    respond(val);
  });
}
