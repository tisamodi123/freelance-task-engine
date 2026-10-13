require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins for CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parser middleware with multipart bypass
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('multipart/form-data')) {
    next();
  } else {
    express.json()(req, res, () => {
      express.urlencoded({ extended: true })(req, res, next);
    });
  }
});

app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes setup
const routes = require('./routes/index');
const apiPrefix = process.env.default_start_point || '/api/v1';
app.use(apiPrefix, routes);

// Connect to Database
connectDB();

app.listen(PORT, () => {
  console.log(`?? Task.io Server running on port ${PORT} (API Prefix: ${apiPrefix})`);
});
