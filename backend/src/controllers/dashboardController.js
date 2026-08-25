const db = require('../db');

// GET /api/dashboard/reports  (client — own reports only; admin can pass ?userId=)
exports.myReports = async (req, res) => {
  const userId = req.user.role === 'admin' && req.query.userId ? req.query.userId : req.user.id;
  const result = await db.query(
    'SELECT * FROM campaign_reports WHERE user_id = $1 ORDER BY week_ending DESC',
    [userId]
  );
  res.json({ reports: result.rows });
};

// POST /api/dashboard/reports  (admin — add a report for a client)
exports.addReport = async (req, res) => {
  const { userId, campaign_name, week_ending, reps_deployed, conversions, territory, notes } = req.body;
  if (!userId || !campaign_name || !week_ending) {
    return res.status(400).json({ error: 'userId, campaign_name and week_ending are required.' });
  }
  const result = await db.query(
    `INSERT INTO campaign_reports (user_id, campaign_name, week_ending, reps_deployed, conversions, territory, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, campaign_name, week_ending, reps_deployed || 0, conversions || 0, territory || null, notes || null]
  );
  res.status(201).json({ report: result.rows[0] });
};
