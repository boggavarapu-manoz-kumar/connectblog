const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    followUser,
    unfollowUser,
    toggleBookmark,
    deleteUserAccount,
    getUsers,
    getFollowers,
    getFollowing
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { cacheMiddleware } = require('../utils/cache');

router.get('/', cacheMiddleware(60), getUsers);
router.put('/profile', protect, updateUserProfile);
router.delete('/profile', protect, deleteUserAccount);
router.route('/:id/follow').put(protect, followUser);
router.route('/:id/unfollow').put(protect, unfollowUser);
router.route('/:id/followers').get(cacheMiddleware(120), getFollowers);
router.route('/:id/following').get(cacheMiddleware(120), getFollowing);
router.put('/bookmarks/:postId', protect, toggleBookmark);
router.get('/:id', cacheMiddleware(60), getUserProfile);

module.exports = router;
