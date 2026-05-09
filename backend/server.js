const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const listingRoutes = require('./routes/listing');
const chatRoutes = require('./routes/chat');
const { errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./utils/socket');

const app = express();
const httpServer = http.createServer(app); // needed for Socket.io

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:3000', 'http://127.0.0.1:3000',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', message: 'ZamMarket API — Sprint 4', timestamp: new Date() })
);

app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✅ MongoDB connected');

  // Init Socket.io AFTER server is created
  initSocket(httpServer);
  console.log('✅ Socket.io initialized');

  httpServer.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 ZamMarket API running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ MongoDB failed:', err.message);
  process.exit(1);
});

module.exports = app;