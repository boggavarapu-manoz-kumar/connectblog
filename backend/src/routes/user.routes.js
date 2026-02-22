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

router.get('/', getUsers);
router.put('/profile', protect, updateUserProfile);
router.delete('/profile', protect, deleteUserAccount);
router.route('/:id/follow').put(protect, followUser);
router.route('/:id/unfollow').put(protect, unfollowUser);
router.route('/:id/followers').get(getFollowers);
router.route('/:id/following').get(getFollowing);
router.put('/bookmarks/:postId', protect, toggleBookmark);
router.get('/:id', getUserProfile);

module.exports = router;
