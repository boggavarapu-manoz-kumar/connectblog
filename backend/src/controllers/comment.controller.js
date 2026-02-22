const Comment = require('../models/Comment.model');
const Post = require('../models/Post.model');
const { sendNotification, processMentions } = require('../utils/notify');

// @desc    Add a comment
// @route   POST /api/posts/:postId/comments
// @access  Private
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = await Comment.create({
            text,
            user: req.user.id,
            post: req.params.postId
        });

        // Add comment to post's comment array
        post.comments.push(comment._id);
        await post.save();

        // ------------------ Notification Engine Trigger ------------------
        await sendNotification(req, {
            recipientId: post.author,
            type: 'comment',
            post: post._id
        });

        // Scan comment text for rich-text @mentions
        await processMentions(req, text, post._id);
        // -----------------------------------------------------------------

        const fullComment = await Comment.findById(comment._id).populate('user', 'username profilePic');

        res.status(201).json(fullComment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public
const getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.params.postId })
            .populate('user', 'username profilePic')
            .sort({ createdAt: -1 });

        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check user (Comment owner or Post owner should be able to delete)
        // For simplicity, only allow comment owner to delete for now
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Remove comment from post
        await Post.findByIdAndUpdate(comment.post, {
            $pull: { comments: comment._id }
        });

        await comment.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addComment,
    getComments,
    deleteComment
};
