const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'follow', 'mention'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // Optional, not needed for follow
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Avoid duplicate notifications (e.g. repeated likes)
notificationSchema.index({ recipient: 1, sender: 1, type: 1, post: 1 }, { unique: true });

// Query optimization for fetching user's latest notifications
notificationSchema.index({ recipient: 1, createdAt: -1 });

// TTL index to automatically delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Notification', notificationSchema);
