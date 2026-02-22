const Post = require('../models/Post.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const { sendNotification, processMentions } = require('../utils/notify');

const getPosts = async (req, res) => {
    try {
        const { sort, search, author, archived } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        let posts;

        // Build search query match block
        let matchStage = { isArchived: archived === 'true' };

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            matchStage.$or = [
                { title: searchRegex },
                { content: searchRegex },
                { hashtags: searchRegex }
            ];
        }

        if (author) {
            if (mongoose.Types.ObjectId.isValid(author)) {
                matchStage.author = new mongoose.Types.ObjectId(author);
            }
        }

        if (sort === 'trending') {
            const pipeline = [];
            if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });

            pipeline.push(
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
                                { $size: { $ifNull: ["$likes", []] } },
                                { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] }
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
                { $limit: limit }
            );

            posts = await Post.aggregate(pipeline);
            posts = await Post.populate(posts, {
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username profilePic'
                }
            });
        } else if (!search && !author) {
            // Instagram-Style Algorithmic Feed
            // Blends: Popularity (Likes/Comments) + Personalization (Follows) + Freshness (Time Decay)
            const pipeline = [];
            if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });

            pipeline.push(
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
                        // 1. Calculate base engagement popularity
                        basePopularity: {
                            $add: [
                                { $size: { $ifNull: ["$likes", []] } },
                                { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] }
                            ]
                        },

                        // 2. Personalization - check if current user follows the author
                        isFollowingAuthor: req.user ? {
                            $in: [
                                new mongoose.Types.ObjectId(req.user._id),
                                { $ifNull: ["$authorDetails.followers", []] }
                            ]
                        } : false,

                        // 3. Time decay - hours since post was created
                        hoursOld: {
                            $divide: [
                                { $subtract: [new Date(), "$createdAt"] },
                                1000 * 60 * 60
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
                        // 4. Algorithm Score Formula:
                        // (Base Popularity) + (Follower Boost: +50) - (Decay: 0.5 per hour)
                        // Ensures posts from friends float to top, but huge viral posts can still compete
                        algoScore: {
                            $subtract: [
                                {
                                    $add: [
                                        "$basePopularity",
                                        { $cond: ["$isFollowingAuthor", 50, 0] }
                                    ]
                                },
                                { $multiply: ["$hoursOld", 0.5] }
                            ]
                        }
                    }
                },
                { $sort: { algoScore: -1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            );

            posts = await Post.aggregate(pipeline);
            posts = await Post.populate(posts, {
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username profilePic'
                }
            });
        } else if (search) {
            // High-Performance Text Search using MongoDB Text Index
            posts = await Post.find({
                $text: { $search: search },
                isArchived: archived === 'true'
            })
                .select('title content image hashtags author createdAt likes comments')
                .populate('author', 'username profilePic')
                .populate({
                    path: 'comments',
                    populate: {
                        path: 'user',
                        select: 'username profilePic'
                    }
                })
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limit)
                .lean();
        } else {
            // Standard deterministic queries with optimization
            posts = await Post.find(matchStage)
                .select('title content image hashtags author createdAt likes comments')
                .populate('author', 'username profilePic')
                .populate({
                    path: 'comments',
                    populate: {
                        path: 'user',
                        select: 'username profilePic'
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
        }

        // Calculate total for metadata
        const totalPosts = await Post.countDocuments(matchStage);
        const totalPages = Math.ceil(totalPosts / limit);

        res.status(200).json({
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

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username profilePic bio pronouns socialLinks')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username profilePic bio'
                }
            })
            .lean();

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
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

        const fullPost = await Post.findById(post._id).populate('author', 'username profilePic');

        // Extract mentions asynchronously without blocking UI return
        processMentions(req, content, post._id).catch(console.error);

        res.status(201).json(fullPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('author', 'username profilePic');

        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await post.deleteOne();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Like a post
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Idempotent add using $addToSet
        await post.updateOne({ $addToSet: { likes: req.user.id } });

        // ------------------ Notification Engine Trigger ------------------
        sendNotification(req, {
            recipientId: post.author,
            type: 'like',
            post: post._id
        }).catch(err => console.error('[Notification Error]', err.message));
        // -----------------------------------------------------------------

        // Fetch updated likes for the response
        const updatedPost = await Post.findById(req.params.id).select('likes');
        res.status(200).json(updatedPost.likes);
    } catch (error) {
        console.error('[Like Error]', error);
        res.status(500).json({ message: 'Server Error while liking post' });
    }
};

// @desc    Unlike a post
// @route   PUT /api/posts/:id/unlike
// @access  Private
const unlikePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Idempotent remove using $pull
        await post.updateOne({ $pull: { likes: req.user.id } });

        const updatedPost = await Post.findById(req.params.id).select('likes');
        res.status(200).json(updatedPost.likes);
    } catch (error) {
        console.error('[Unlike Error]', error);
        res.status(500).json({ message: 'Server Error while unliking post' });
    }
};

const getBookmarkedPosts = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('bookmarks').lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const posts = await Post.find({ _id: { $in: user.bookmarks } })
            .select('title content image hashtags author createdAt likes comments isArchived')
            .populate('author', 'username profilePic')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username profilePic'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ posts });
    } catch (error) {
        console.error('Error in getBookmarkedPosts:', error);
        res.status(500).json({ message: error.message });
    }
};

const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const posts = await Post.find({
            author: new mongoose.Types.ObjectId(userId),
            isArchived: false
        })
            .select('title content image hashtags author createdAt likes comments')
            .populate('author', 'username profilePic')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username profilePic'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ posts });
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
