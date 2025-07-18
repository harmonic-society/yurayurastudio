const express = require('express');
const { createServer } = require('http');
const path = require('path');

const app = express();
const server = createServer(app);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Import and register routes dynamically
async function setupServer() {
  try {
    // Dynamic import for ESM modules
    const { registerRoutes } = await import('../server/routes.js');
    await registerRoutes(app);
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Error handling
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        error: {
          message: err.message || 'Internal Server Error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
      });
    });
  } catch (error) {
    console.error('Failed to setup server:', error);
    // Fallback error response
    app.use((req, res) => {
      res.status(500).json({ error: 'Server initialization failed' });
    });
  }
}

// Initialize server
setupServer();

// Export for Vercel
module.exports = app;