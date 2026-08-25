const db = require('../db');

function slugify(title) {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/blog  (public — published only)
exports.list = async (req, res) => {
  const result = await db.query(
    `SELECT id, title, slug, category, excerpt, cover_image, created_at
     FROM blog_posts WHERE published = true ORDER BY created_at DESC`
  );
  res.json({ posts: result.rows });
};

// GET /api/blog/:slug  (public)
exports.getBySlug = async (req, res) => {
  const result = await db.query(
    'SELECT * FROM blog_posts WHERE slug = $1 AND published = true',
    [req.params.slug]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Post not found.' });
  res.json({ post: result.rows[0] });
};

// GET /api/blog/admin/all  (admin — includes drafts)
exports.listAllAdmin = async (req, res) => {
  const result = await db.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
  res.json({ posts: result.rows });
};

// POST /api/blog  (admin)
exports.create = async (req, res) => {
  const { title, category, excerpt, content, cover_image, published } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });
  const slug = slugify(title);
  const result = await db.query(
    `INSERT INTO blog_posts (title, slug, category, excerpt, content, cover_image, author_id, published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [title, slug, category || null, excerpt || null, content, cover_image || null, req.user.id, !!published]
  );
  res.status(201).json({ post: result.rows[0] });
};

// PUT /api/blog/:id  (admin)
exports.update = async (req, res) => {
  const { title, category, excerpt, content, cover_image, published } = req.body;
  const result = await db.query(
    `UPDATE blog_posts SET title=COALESCE($1,title), category=COALESCE($2,category),
     excerpt=COALESCE($3,excerpt), content=COALESCE($4,content), cover_image=COALESCE($5,cover_image),
     published=COALESCE($6,published), updated_at=now()
     WHERE id=$7 RETURNING *`,
    [title, category, excerpt, content, cover_image, published, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Post not found.' });
  res.json({ post: result.rows[0] });
};

// DELETE /api/blog/:id  (admin)
exports.remove = async (req, res) => {
  await db.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
  res.json({ message: 'Post deleted.' });
};
