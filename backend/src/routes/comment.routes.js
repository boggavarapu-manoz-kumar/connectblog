const express = require('express');
const router = express.Router({ mergeParams: true }); // Merge params to access postId from parent route
const {
    addComment,
    getComments,
    deleteComment
} = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');

router.route('/')
    .get(getComments)
    .post(protect, addComment);

router.route('/:id')
    .delete(protect, deleteComment);

module.exports = router;
