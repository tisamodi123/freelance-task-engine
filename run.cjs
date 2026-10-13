// run.cjs - Entry point for iisnode
// This file bridges CommonJS (required by iisnode) with your ES modules

// Set up environment for IIS
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || process.env.IISNODE_HTTP_PORT || 3000;

// Import and start the ES module server
import('./server.js').catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});