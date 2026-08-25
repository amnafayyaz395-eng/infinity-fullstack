const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/signup  (client signup; admin only via invite code)
exports.signup = async (req, res) => {
  try {
    const { name, email, password, company, adminCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const role = adminCode && adminCode === process.env.ADMIN_SIGNUP_CODE ? 'admin' : 'client';
    const password_hash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, company)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, company, created_at`,
      [name, email.toLowerCase(), password_hash, role, company || null]
    );

    const user = result.rows[0];
    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong logging you in.' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out.' });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const result = await db.query(
    'SELECT id, name, email, role, company, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: result.rows[0] });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email?.toLowerCase()]);
    // Always respond the same way, whether or not the account exists (avoid leaking which emails are registered)
    if (!result.rows[0]) {
      return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, expires, result.rows[0].id]
    );
    // TODO: send resetToken via email (e.g. using an email provider). Logged here for local dev/testing:
    console.log(`Password reset requested. Token (dev only): ${resetToken}`);
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'A valid token and an 8+ character password are required.' });
    }
    const result = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > now()',
      [token]
    );
    if (!result.rows[0]) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [password_hash, result.rows[0].id]
    );
    res.json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};
