const Notification = require('../models/Notification.model');
const User = require('../models/User.model');

// Helper to create and emit notification via Socket.IO
const sendNotification = async (req, { recipientId, type, post = null }) => {
    try {
        const senderId = req.user._id;
        if (recipientId.toString() === senderId.toString()) return; // Don't notify self

        await Notification.create({
            recipient: recipientId,
            sender: senderId,
            type,
            post
        });

        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');
        if (io && userSockets) {
            const socketId = userSockets.get(recipientId.toString());
            if (socketId) {
                // Emit event
                io.to(socketId).emit('newNotification', {
                    type,
                    from: req.user.username
                });
            }
        }
    } catch (err) {
        // Notification likely exists / unique index constraints constraint caught
        // Just fail silently for UX purity
    }
};

// Extractor to find @mentions in strings and send notifications
const processMentions = async (req, content, postId) => {
    if (!content) return;

    // Regex matches @username ensuring generic rich text is safely parsed
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;
    const mentionedUsernames = [];

    while ((match = mentionRegex.exec(content)) !== null) {
        mentionedUsernames.push(match[1]);
    }

    if (mentionedUsernames.length > 0) {
        const uniqueNames = [...new Set(mentionedUsernames)];
        const mentionedUsers = await User.find({ username: { $in: uniqueNames } });

        for (const user of mentionedUsers) {
            await sendNotification(req, {
                recipientId: user._id,
                type: 'mention',
                post: postId
            });
        }
    }
};

module.exports = {
    sendNotification,
    processMentions
};
