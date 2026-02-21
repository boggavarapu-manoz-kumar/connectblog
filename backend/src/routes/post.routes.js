const express = require('express');
const router = express.Router();
const {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getBookmarkedPosts,
    getUserPosts
} = require('../controllers/post.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');

// Re-route into other resource routers
const commentRouter = require('./comment.routes');
router.use('/:postId/comments', commentRouter);

router.route('/').get(optionalProtect, getPosts).post(protect, createPost);
router.route('/bookmarks').get(protect, getBookmarkedPosts);
router.route('/user/:userId').get(getUserPosts);
router.route('/:id').get(getPost).put(protect, updatePost).delete(protect, deletePost);
router.route('/:id/like').put(protect, likePost);
router.route('/:id/unlike').put(protect, unlikePost);

module.exports = router;
