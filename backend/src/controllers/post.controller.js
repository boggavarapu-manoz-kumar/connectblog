const postService = require('../services/post.service');
const { sendNotification, processMentions } = require('../utils/notify');
const { invalidateCache } = require('../utils/cache');
const asyncHandler = require('express-async-handler');

const getPosts = asyncHandler(async (req, res) => {
    const { sort, search, author, archived } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 10);
    
    const result = await postService.getPosts({
        sort, search, author, archived, page, limit, userId: req.user?.id
    });
    
    res.status(200).json(result);
});

const getPost = asyncHandler(async (req, res) => {
    try {
        const post = await postService.getPostById(req.params.id, req.user?.id);
        res.status(200).json(post);
    } catch (err) {
        if (err.message === 'Post not found') {
            return res.status(404).json({ message: err.message });
        }
        throw err;
    }
});

const createPost = asyncHandler(async (req, res) => {
    const fullPost = await postService.createPost(req.user.id, req.body);

    // Side effects
    processMentions(req, fullPost.content, fullPost._id).catch(console.error);
    invalidateCache('api/posts');
    invalidateCache(req.user.id);

    res.status(201).json(fullPost);
});

const updatePost = asyncHandler(async (req, res) => {
    try {
        const updatedPost = await postService.updatePost(req.params.id, req.user.id, req.body);
        
        invalidateCache(req.params.id);
        invalidateCache('api/posts');
        
        res.status(200).json(updatedPost);
    } catch (err) {
        if (err.message === 'Post not found') return res.status(404).json({ message: err.message });
        if (err.message === 'User not authorized') return res.status(401).json({ message: err.message });
        throw err;
    }
});

const deletePost = asyncHandler(async (req, res) => {
    try {
        await postService.deletePost(req.params.id, req.user.id);
        
        invalidateCache('api/posts');
        invalidateCache(`api/posts/${req.params.id}`);
        invalidateCache(req.user.id);

        res.status(200).json({ message: 'Post removed' });
    } catch (err) {
        if (err.message === 'Post not found') return res.status(404).json({ message: err.message });
        if (err.message === 'User not authorized') return res.status(401).json({ message: err.message });
        throw err;
    }
});

const likePost = asyncHandler(async (req, res) => {
    try {
        const { post, liked } = await postService.likePost(req.params.id, req.user.id);
        
        if (liked) {
            sendNotification(req, {
                recipientId: post.author,
                type: 'like',
                post: post._id
            }).catch(err => console.error('[Notification Error]', err.message));
        }

        invalidateCache(`api/posts/${req.params.id}`);
        invalidateCache('api/posts');
        
        res.status(200).json([req.user.id]);
    } catch (err) {
        if (err.message === 'Post not found') return res.status(404).json({ message: err.message });
        throw err;
    }
});

const unlikePost = asyncHandler(async (req, res) => {
    try {
        await postService.unlikePost(req.params.id, req.user.id);
        
        invalidateCache(`api/posts/${req.params.id}`);
        invalidateCache('api/posts');

        res.status(200).json([]);
    } catch (err) {
        if (err.message === 'Post not found') return res.status(404).json({ message: err.message });
        throw err;
    }
});

const getBookmarkedPosts = asyncHandler(async (req, res) => {
    const result = await postService.getBookmarkedPosts(req.user.id);
    res.status(200).json(result);
});

const getUserPosts = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 10);
    
    try {
        const result = await postService.getUserPosts({
            targetUserId: req.params.userId,
            page,
            limit,
            currentUserId: req.user?.id
        });
        res.status(200).json(result);
    } catch (err) {
        if (err.message === 'Invalid user ID') return res.status(400).json({ message: err.message });
        throw err;
    }
});

module.exports = {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getBookmarkedPosts,
    getUserPosts
};
