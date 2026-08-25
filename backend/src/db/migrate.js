// Runs schema.sql against DATABASE_URL. Usage: npm run migrate
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    console.log('Running schema.sql against database...');
    await pool.query(sql);
    console.log('✅ Migration complete — tables created (or already existed).');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
