const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    followUser,
    unfollowUser,
    toggleBookmark,
    deleteUserAccount,
    getUsers
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', getUsers);
router.put('/profile', protect, updateUserProfile);
router.delete('/profile', protect, deleteUserAccount);
router.put('/:id/follow', protect, followUser);
router.put('/:id/unfollow', protect, unfollowUser);
router.put('/bookmarks/:postId', protect, toggleBookmark);
router.get('/:id', getUserProfile);

module.exports = router;
