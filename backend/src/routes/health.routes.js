const express = require('express');
const router = express.Router();
const { getSystemMetrics } = require('../controllers/health.controller');

// Basic health check for keep-alive pingers
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'ConnectBlog API',
        uptime: `${Math.floor(process.uptime())}s`,
        timestamp: new Date().toISOString(),
        message: '🟢 Server is awake and healthy'
    });
});

// Advanced metrics for dashboard
router.get('/metrics', getSystemMetrics);

module.exports = router;
