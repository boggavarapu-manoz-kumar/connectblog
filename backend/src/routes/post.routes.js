const express = require('express');
const router = express.Router();
const {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost
} = require('../controllers/post.controller');
const { protect } = require('../middleware/auth.middleware');

// Re-route into other resource routers
const commentRouter = require('./comment.routes');
router.use('/:postId/comments', commentRouter);

router.route('/').get(getPosts).post(protect, createPost);
router.route('/:id').get(getPost).put(protect, updatePost).delete(protect, deletePost);
router.route('/:id/like').put(protect, likePost);
router.route('/:id/unlike').put(protect, unlikePost);

module.exports = router;
