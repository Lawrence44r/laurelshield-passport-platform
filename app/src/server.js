require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const ssoRoutes = require('./routes/sso');
const customerRoutes = require('./routes/customer');
const opsRoutes = require('./routes/ops');
const brokerRoutes = require('./routes/broker');
const carrierRoutes = require('./routes/carrier');
const internalRoutes = require('./routes/internal');

const app = express();
const PORT = process.env.PORT || 4100;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(session({
  name: 'ls.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 8 * 3600 * 1000,
  },
}));

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/ops', opsRoutes);
app.use('/api/broker', brokerRoutes);
app.use('/api/carrier', carrierRoutes);
// Server-to-server only -- not session-authenticated, see routes/internal.js.
app.use('/internal', internalRoutes);

// Render (and any other host) health check -- unauthenticated by design.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  res.status(404).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`Laurelshield Passport Platform listening on http://localhost:${PORT}`);
});
