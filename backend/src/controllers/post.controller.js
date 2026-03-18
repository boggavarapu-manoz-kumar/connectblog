const Post = require('../models/Post.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const { sendNotification, processMentions } = require('../utils/notify');
const { invalidateCache } = require('../utils/cache');

// ─── GET /api/posts ────────────────────────────────────────────────────────────
// Supports: ?page, ?limit, ?search, ?author, ?sort, ?archived
const getPosts = async (req, res) => {
    try {
        const { sort, search, author, archived } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(30, parseInt(req.query.limit, 10) || 10); // cap at 30 posts per page
        const skip = (page - 1) * limit;

        // ── Base match ──────────────────────────────────────────────────────
        let matchStage = { isArchived: archived === 'true' };

        if (search) {
            const rx = { $regex: search, $options: 'i' };
            matchStage.$or = [
                { title: rx },
                { content: rx },
                { hashtags: rx }
            ];
        }

        if (author && mongoose.Types.ObjectId.isValid(author)) {
            matchStage.author = new mongoose.Types.ObjectId(author);
        }

        // ── Run count + data fetch in PARALLEL ──────────────────────────────
        let postsPromise;
        let countPromise = Post.countDocuments(matchStage); // always run in parallel

        // ── TRENDING ────────────────────────────────────────────────────────
        if (sort === 'trending') {
            const pipeline = [
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorDetails'
                    }
                },
                { $unwind: '$authorDetails' },
                {
                    $addFields: {
                        engagementScore: {
                            $add: [
                                { $size: { $ifNull: ['$likes', []] } },
                                { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] }
                            ]
                        },
                        author: {
                            _id: '$authorDetails._id',
                            username: '$authorDetails.username',
                            profilePic: '$authorDetails.profilePic'
                        }
                    }
                },
                { $sort: { engagementScore: -1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                // Project only essential fields — exclude heavy authorDetails
                {
                    $project: {
                        authorDetails: 0
                    }
                }
            ];

            postsPromise = Post.aggregate(pipeline).then(posts =>
                Post.populate(posts, {
                    path: 'comments',
                    populate: { path: 'user', select: 'username profilePic' }
                })
            );

            // ── DEFAULT ALGORITHMIC FEED ────────────────────────────────────────
        } else if (!search && !author) {
            const pipeline = [
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorDetails'
                    }
                },
                { $unwind: '$authorDetails' },
                {
                    $addFields: {
                        basePopularity: {
                            $add: [
                                { $size: { $ifNull: ['$likes', []] } },
                                { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] }
                            ]
                        },
                        isFollowingAuthor: req.user ? {
                            $in: [
                                new mongoose.Types.ObjectId(req.user._id),
                                { $ifNull: ['$authorDetails.followers', []] }
                            ]
                        } : false,
                        hoursOld: {
                            $divide: [
                                { $subtract: [new Date(), '$createdAt'] },
                                3_600_000 // ms per hour
                            ]
                        },
                        author: {
                            _id: '$authorDetails._id',
                            username: '$authorDetails.username',
                            profilePic: '$authorDetails.profilePic'
                        }
                    }
                },
                {
                    $addFields: {
                        algoScore: {
                            $subtract: [
                                {
                                    $add: [
                                        '$basePopularity',
                                        { $cond: ['$isFollowingAuthor', 50, 0] }
                                    ]
                                },
                                { $multiply: ['$hoursOld', 0.5] }
                            ]
                        }
                    }
                },
                { $sort: { algoScore: -1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                { $project: { authorDetails: 0, basePopularity: 0, isFollowingAuthor: 0, hoursOld: 0, algoScore: 0 } }
            ];

            postsPromise = Post.aggregate(pipeline).then(posts =>
                Post.populate(posts, {
                    path: 'comments',
                    populate: { path: 'user', select: 'username profilePic' }
                })
            );

            // ── TEXT SEARCH ─────────────────────────────────────────────────────
        } else if (search) {
            postsPromise = Post.find({
                $text: { $search: search },
                isArchived: archived === 'true'
            })
                .select('title content image hashtags author createdAt likes comments')
                .populate('author', 'username profilePic')
                .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limit)
                .lean();

            // ── AUTHOR FILTER ────────────────────────────────────────────────────
        } else {
            postsPromise = Post.find(matchStage)
                .select('title content image hashtags author createdAt likes comments')
                .populate('author', 'username profilePic')
                .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
        }

        // ── Await BOTH in parallel ──────────────────────────────────────────
        const [posts, totalPosts] = await Promise.all([postsPromise, countPromise]);

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            posts,
            totalPosts,
            totalPages,
            currentPage: page,
            hasMore: page < totalPages
        });

    } catch (error) {
        console.error('Error in getPosts:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── GET /api/posts/:id ────────────────────────────────────────────────────────
const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username profilePic bio pronouns socialLinks')
            .populate({
                path: 'comments',
                populate: { path: 'user', select: 'username profilePic bio' }
            })
            .lean();

        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── POST /api/posts ───────────────────────────────────────────────────────────
const createPost = async (req, res) => {
    try {
        const { title, content, image, hashtags } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        const post = await Post.create({
            title,
            content,
            image,
            author: req.user.id,
            hashtags: Array.isArray(hashtags) ? hashtags : []
        });

        const fullPost = await Post.findById(post._id)
            .populate('author', 'username profilePic')
            .lean();

        processMentions(req, content, post._id).catch(console.error);

        // Invalidate feed caches for everyone (posts list) and this author's profile
        invalidateCache('api/posts');
        invalidateCache(req.user.id);

        res.status(201).json(fullPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── PUT /api/posts/:id ────────────────────────────────────────────────────────
const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('author', 'username profilePic').lean();

        invalidateCache(req.params.id);
        invalidateCache('api/posts');

        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── DELETE /api/posts/:id ─────────────────────────────────────────────────────
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await post.deleteOne();

        invalidateCache('api/posts');
        invalidateCache(`api/posts/${req.params.id}`);
        invalidateCache(req.user.id); // user's profile feed cache

        res.status(200).json({ message: 'Post removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── PUT /api/posts/:id/like ───────────────────────────────────────────────────
const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).select('author likes');
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Atomic idempotent update — no separate read after write needed
        const updated = await Post.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { likes: req.user.id } },
            { new: true, select: 'likes' }
        );

        // Invalidate only the specific post cache (not entire feed for performance)
        invalidateCache(`api/posts/${req.params.id}`);
        invalidateCache('api/posts');

        sendNotification(req, {
            recipientId: post.author,
            type: 'like',
            post: post._id
        }).catch(err => console.error('[Notification Error]', err.message));

        res.status(200).json(updated.likes);
    } catch (error) {
        console.error('[Like Error]', error);
        res.status(500).json({ message: 'Server Error while liking post' });
    }
};

// ─── PUT /api/posts/:id/unlike ─────────────────────────────────────────────────
const unlikePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).select('likes');
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const updated = await Post.findByIdAndUpdate(
            req.params.id,
            { $pull: { likes: req.user.id } },
            { new: true, select: 'likes' }
        );

        invalidateCache(`api/posts/${req.params.id}`);
        invalidateCache('api/posts');

        res.status(200).json(updated.likes);
    } catch (error) {
        console.error('[Unlike Error]', error);
        res.status(500).json({ message: 'Server Error while unliking post' });
    }
};

// ─── GET /api/posts/bookmarks ──────────────────────────────────────────────────
const getBookmarkedPosts = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('bookmarks').lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.bookmarks || user.bookmarks.length === 0) {
            return res.status(200).json({ posts: [] });
        }

        const posts = await Post.find({ _id: { $in: user.bookmarks } })
            .select('title content image hashtags author createdAt likes comments isArchived')
            .populate('author', 'username profilePic')
            .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ posts });
    } catch (error) {
        console.error('Error in getBookmarkedPosts:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── GET /api/posts/user/:userId ───────────────────────────────────────────────
// Now supports pagination: ?page=1&limit=10
const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(20, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        const query = {
            author: new mongoose.Types.ObjectId(userId),
            isArchived: false
        };

        // Run count + fetch in parallel
        const [posts, totalPosts] = await Promise.all([
            Post.find(query)
                .select('title content image hashtags author createdAt likes comments')
                .populate('author', 'username profilePic')
                .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Post.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        res.status(200).json({
            posts,
            totalPosts,
            totalPages,
            currentPage: page,
            hasMore: page < totalPages
        });
    } catch (error) {
        console.error('Error in getUserPosts:', error);
        res.status(500).json({ message: error.message });
    }
};

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
