const OpenAI = require('openai');
const db = require('../db');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Used when OPENAI_API_KEY isn't set, so the assistant still gives real,
// on-brand answers locally instead of a generic "not configured" message.
const FALLBACK_KB = [
  { k: ['hi', 'hello', 'hey', 'salam'], a: "Hi there! I'm glad you reached out. Before I recommend anything, tell me a bit about your business \u2014 what do you sell, and who's your typical customer?" },
  { k: ['sales', 'increase sales', 'revenue'], a: "Got it \u2014 growing sales. Quick question: right now, are you relying mostly on digital ads, or do you not have a strong acquisition channel yet? That'll tell me how a field campaign would fit in." },
  { k: ['brand', 'awareness', 'recognition'], a: "Makes sense. Is this for a new launch/rebrand, or an existing brand that needs more visibility in specific locations? Knowing that helps me suggest retail vs. event-based activation." },
  { k: ['lead', 'leads', 'generate leads', 'generation'], a: "Understood \u2014 lead generation. What does a 'good lead' look like for you right now (e.g. budget size, decision-maker, location)? I want to make sure the campaign targets the right people." },
  { k: ['digital', 'online', 'website', 'social media'], a: "That's useful context \u2014 most of our clients pair digital with face-to-face campaigns rather than replacing it. Have you noticed digital alone plateauing on conversions, or is this more about adding a new channel?" },
  { k: ['location', 'address', 'office', 'where'], a: "We're at 58 Marsh Wall, Unit 3&4, London E14 9TP, Canary Wharf. Are you based nearby, or is your business in a different city/region? Just confirming our field teams can cover your area." },
  { k: ['contact', 'phone', 'email', 'call'], a: "Sure, happy to connect you with the team. Before that \u2014 what's the main outcome you want from working with us: more sales, more brand recall, or more qualified leads?" },
  { k: ['industries', 'sector', 'clients'], a: "We work across corporate, retail, telecom, energy, financial services and consumer brands. What industry is your business in? I'll tell you honestly if direct marketing is a strong fit." },
  { k: ['price', 'cost', 'budget', 'quote'], a: "Pricing depends on team size, campaign length and territory, so I don't want to guess a number. What's roughly the scale you're thinking \u2014 a single city, or multi-region?" },
  { k: ['who', 'director', 'ahmed', 'founder'], a: "Infinity Marketing was founded in 2015, led by Director Ahmed Sarfraz, with 26+ years of combined direct-sales leadership. Are you exploring us for a specific project, or just researching agencies right now?" },
  { k: ['yes', 'interested', 'sounds good', 'sure', 'okay', 'ok'], a: "Great \u2014 I'll get this in front of our team. Can I get your name and either an email or phone number so someone can follow up with a tailored plan?" },
];

const FOLLOWUPS = [
  "What's the size of your team or business, roughly \u2014 that changes what scale of campaign makes sense.",
  "Have you run any outsourced sales or marketing campaigns before, or would this be a first?",
  "Is there a timeline you're working toward, like a launch date or a quarter you want results by?",
];
let followupIndex = 0;

function fallbackReply(userText) {
  const t = userText.toLowerCase();
  const hit = FALLBACK_KB.find(row => row.k.some(k => t.includes(k)));
  if (hit) return hit.a;
  // No keyword match: ask a real follow-up question instead of a generic non-answer, like a consultant would
  const q = FOLLOWUPS[followupIndex % FOLLOWUPS.length];
  followupIndex++;
  return `That's helpful context. ${q}`;
}

const SYSTEM_PROMPT = `
You are the Infinity Marketing & Advertisement assistant. Infinity Marketing &
Advertisement is a London-based direct marketing and advertising agency,
founded in 2015, HQ at 58 Marsh Wall, Unit 3&4, London E14 9TP, team of
11-50 with over 26 years of combined direct-sales leadership experience.
Director: Ahmed Sarfraz.

Core service: face-to-face direct marketing - outsourced field sales teams,
campaign strategy & planning, field sales team deployment, customer
acquisition campaigns, brand ambassador & promotional campaigns, and
performance reporting & optimisation. Delivered as tailored, per-client
campaigns rather than generic advertising.

Mission: deliver cost-effective, high-performance marketing that increases
sales, generates new business, and builds brand awareness for client brands.

Differentiators: tailored campaigns per client; higher acquisition
performance and lead quality than mass-advertising approaches; direct,
personal customer engagement; transparent weekly performance reporting.

Industries served: corporate/B2B, retail, telecom, energy, financial
services, consumer brands.

Your job:
1. Greet the visitor and ask what outcome they want (increase sales, build
   brand awareness, generate leads, or something else).
2. Map their answer to the relevant service from the list above and explain,
   in their terms: what it is, how it applies to their business, and what
   results/ROI they can expect versus traditional advertising.
3. Offer a free consultation and ask for their name plus email or phone if
   they're interested, so a human can follow up.
4. Answer general questions about location, contact details, and industries
   served accurately using only the facts above.
Tone: professional, confident, concise. Never invent facts, pricing, or
guarantees not listed here. If asked something you don't know, say a team
member will follow up rather than guessing.
`.trim();

// POST /api/chat
// body: { sessionId?, message, pageUrl? }
exports.chat = async (req, res) => {
  const { message, pageUrl } = req.body;
  let { sessionId } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  let dbAvailable = true;
  let history = [];

  // Session + message logging is best-effort: if the database isn't reachable
  // (e.g. Postgres not running locally yet), the assistant still replies —
  // it just won't have conversation history or save a transcript.
  try {
    if (!sessionId) {
      const s = await db.query(
        'INSERT INTO chat_sessions (page_url) VALUES ($1) RETURNING id',
        [pageUrl || null]
      );
      sessionId = s.rows[0].id;
    }
    await db.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', message]
    );
    if (openai) {
      const h = await db.query(
        'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 20',
        [sessionId]
      );
      history = h.rows;
    }
  } catch (err) {
    dbAvailable = false;
    console.warn('Chat DB logging skipped (database unreachable):', err.message);
  }

  let reply;
  try {
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(history.length ? history.map(m => ({ role: m.role, content: m.content })) : [{ role: 'user', content: message }]),
        ],
        temperature: 0.4,
        max_tokens: 300,
      });
      reply = completion.choices[0].message.content.trim();
    } else {
      reply = fallbackReply(message);
    }
  } catch (err) {
    console.error('OpenAI call failed, using fallback:', err.message);
    reply = fallbackReply(message);
  }

  if (dbAvailable) {
    try {
      await db.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'assistant', reply]
      );
    } catch (err) {
      console.warn('Could not log assistant reply (database unreachable):', err.message);
    }
  }

  res.json({ sessionId, reply });
};

// POST /api/chat/lead — capture a lead captured mid-conversation
// body: { sessionId, name, email, phone }
exports.captureLead = async (req, res) => {
  try {
    const { sessionId, name, email, phone } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required.' });
    }
    const lead = await db.query(
      `INSERT INTO leads (name, email, phone, source) VALUES ($1,$2,$3,'chatbot') RETURNING id`,
      [name || null, email || null, phone || null]
    );
    if (sessionId) {
      await db.query('UPDATE chat_sessions SET lead_id = $1 WHERE id = $2', [lead.rows[0].id, sessionId]);
    }
    res.status(201).json({ message: 'Thanks — a team member will be in touch shortly.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving your details. Please make sure the database is running.' });
  }
};
