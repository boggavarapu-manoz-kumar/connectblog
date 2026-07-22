const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const User = require('../models/User.model');
const Post = require('../models/Post.model');

// @desc    Get system health metrics
// @route   GET /api/health/metrics
// @access  Public
const getSystemMetrics = asyncHandler(async (req, res) => {
    // 1. Get database status
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    }[dbStatus] || 'unknown';

    // 2. Get system memory usage
    const memory = process.memoryUsage();
    
    // 3. Get system uptime
    const uptime = process.uptime();

    // 4. Get total platform counts (users, posts)
    // Run in parallel for speed
    const [userCount, postCount] = await Promise.all([
        User.countDocuments(),
        Post.countDocuments()
    ]);

    res.status(200).json({
        status: dbStatus === 1 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatusText,
            state: dbStatus
        },
        system: {
            uptimeSeconds: uptime,
            memoryUsageMB: {
                rss: Math.round(memory.rss / 1024 / 1024),
                heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memory.heapUsed / 1024 / 1024)
            }
        },
        platform: {
            totalUsers: userCount,
            totalPosts: postCount
        }
    });
});

module.exports = {
    getSystemMetrics
};
