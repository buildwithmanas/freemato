const express = require('express');
const path = require('path');

const channelsRoutes = require('./routes/channels.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const riderRoutes = require('./routes/rider.routes');

const app = express();
app.use(express.json());

// Serve frontend public directory
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

// Mount routes
app.use('/', channelsRoutes);
app.use('/', restaurantRoutes);
app.use('/', riderRoutes);

// Helper entry point
app.get('/', (req, res) => {
  res.send(`
    <html><head><title>Freemato</title>
    <link rel="icon" type="image/png" href="/freemato-favicon.png">
    <style>body{font-family:Arial;max-width:600px;margin:50px auto;padding:20px}h1{color:#5C33ED}.link{display:block;margin:15px 0;padding:15px;background:#f5f7fa;border-radius:8px;text-decoration:none;color:#2c3e50}.link:hover{background:#e9ecef}</style>
    </head><body>
      <h1>🍕 Freemato System</h1>
      <p>Welcome to Freemato food delivery system</p>
      <a href="/restaurant" class="link">🏪 Restaurant Dashboard</a>
      <a href="/rider?order=SAMPLE" class="link">🛵 Rider App (Demo)</a>
      <p style="color:#95a5a6;font-size:14px">Backend is running. Configure webhooks to start receiving orders.</p>
    </body></html>
  `);
});

module.exports = app;
