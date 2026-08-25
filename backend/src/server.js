require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const leadsRoutes = require('./routes/leadsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const blogRoutes = require('./routes/blogRoutes');
const caseStudiesRoutes = require('./routes/caseStudiesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for local dev with CDN fonts/Tailwind; configure for production
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/case-studies', caseStudiesRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- Serve the frontend (static site) ----
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'), (err) => { if (err) next(); });
});

// ---- 404 + error handling ----
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Infinity Marketing backend running on http://localhost:${PORT}`);
});
