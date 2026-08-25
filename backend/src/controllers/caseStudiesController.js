const db = require('../db');

// GET /api/case-studies  (public)
exports.list = async (req, res) => {
  const result = await db.query(
    'SELECT * FROM case_studies WHERE published = true ORDER BY created_at DESC'
  );
  res.json({ caseStudies: result.rows });
};

// POST /api/case-studies  (admin)
exports.create = async (req, res) => {
  const { client_name, sector, title, challenge, approach, stats, cover_image, published } = req.body;
  if (!client_name || !title) return res.status(400).json({ error: 'Client name and title are required.' });
  const result = await db.query(
    `INSERT INTO case_studies (client_name, sector, title, challenge, approach, stats, cover_image, published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [client_name, sector || null, title, challenge || null, approach || null, JSON.stringify(stats || []), cover_image || null, published !== false]
  );
  res.status(201).json({ caseStudy: result.rows[0] });
};

// PUT /api/case-studies/:id  (admin)
exports.update = async (req, res) => {
  const { client_name, sector, title, challenge, approach, stats, cover_image, published } = req.body;
  const result = await db.query(
    `UPDATE case_studies SET client_name=COALESCE($1,client_name), sector=COALESCE($2,sector),
     title=COALESCE($3,title), challenge=COALESCE($4,challenge), approach=COALESCE($5,approach),
     stats=COALESCE($6,stats), cover_image=COALESCE($7,cover_image), published=COALESCE($8,published)
     WHERE id=$9 RETURNING *`,
    [client_name, sector, title, challenge, approach, stats ? JSON.stringify(stats) : null, cover_image, published, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Case study not found.' });
  res.json({ caseStudy: result.rows[0] });
};

// DELETE /api/case-studies/:id  (admin)
exports.remove = async (req, res) => {
  await db.query('DELETE FROM case_studies WHERE id = $1', [req.params.id]);
  res.json({ message: 'Case study deleted.' });
};
