const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead } = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.route('/').get(protect, getNotifications);
router.route('/read').put(protect, markAsRead);

module.exports = router;
