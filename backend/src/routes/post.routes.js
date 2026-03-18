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
const { cacheMiddleware } = require('../utils/cache');

// ─── Comment sub-router ───────────────────────────────────────────────────────
const commentRouter = require('./comment.routes');
router.use('/:postId/comments', commentRouter);

// ─── Post Routes ──────────────────────────────────────────────────────────────
//  Cache TTLs:
//    Feed list          60s  — fresh enough, but avoids DB hit on every nav
//    Single post       180s  — rarely changes between visits
//    User posts        120s  — profile posts, paginated
//    Bookmarks          30s  — personal, should stay fresh
//    Trending          600s  — heavy aggregation, changes slowly

router.route('/')
    .get(optionalProtect, cacheMiddleware(60), getPosts)   // Main feed — 60 s
    .post(protect, createPost);

router.route('/bookmarks')
    .get(protect, cacheMiddleware(30), getBookmarkedPosts); // Private — 30 s

router.route('/user/:userId')
    .get(cacheMiddleware(120), getUserPosts);               // Profile posts — 120 s

router.route('/:id')
    .get(cacheMiddleware(180), getPost)                    // Single post — 180 s
    .put(protect, updatePost)
    .delete(protect, deletePost);

router.route('/:id/like').put(protect, likePost);
router.route('/:id/unlike').put(protect, unlikePost);

module.exports = router;
