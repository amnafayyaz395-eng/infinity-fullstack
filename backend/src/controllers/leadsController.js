const db = require('../db');

// POST /api/leads  (public — contact form, careers form, newsletter signup)
exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, company, goal, message, source } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const result = await db.query(
      `INSERT INTO leads (name, email, phone, company, goal, message, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
      [name || null, email, phone || null, company || null, goal || null, message || null, source || 'contact_form']
    );
    res.status(201).json({ message: 'Thanks — we\u2019ll be in touch within one business day.', lead: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong submitting your request.' });
  }
};

// GET /api/leads  (admin only)
exports.listLeads = async (req, res) => {
  const { status, source } = req.query;
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (source) { params.push(source); conditions.push(`source = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT 200`, params);
  res.json({ leads: result.rows });
};

// PATCH /api/leads/:id  (admin only — update status)
exports.updateLeadStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'contacted', 'qualified', 'closed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }
  const result = await db.query(
    'UPDATE leads SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Lead not found.' });
  res.json({ lead: result.rows[0] });
};
