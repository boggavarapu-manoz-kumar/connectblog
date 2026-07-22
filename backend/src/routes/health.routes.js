const express = require('express');
const router = express.Router();
const { getSystemMetrics } = require('../controllers/health.controller');

const { protect, admin } = require('../middleware/auth.middleware');

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

// Advanced metrics for dashboard - protected for admins only
router.get('/metrics', protect, admin, getSystemMetrics);

module.exports = router;
