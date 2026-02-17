// @desc    Get all posts (with sorting algorithm)
// @route   GET /api/posts?sort=latest|trending
// @access  Public
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const getPosts = async (req, res) => {
    try {
        const { sort } = req.query;
        let posts;

        if (sort === 'trending') {
            // Best Feed Algorithm: Prioritize posts with most engagement (likes + comments)
            // Using aggregation pipeline for efficient sorting
            posts = await Post.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorDetails'
                    }
                },
                { $unwind: '$authorDetails' }, // Flatten array
                {
                    $addFields: {
                        engagementScore: {
                            $add: [
                                { $size: { $ifNull: ["$likes", []] } },
                                { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] } // Weigh comments x2
                            ]
                        },
                        author: { // Project author details we need
                            _id: '$authorDetails._id',
                            username: '$authorDetails.username',
                            profilePic: '$authorDetails.profilePic'
                        }
                    }
                },
                { $sort: { engagementScore: -1, createdAt: -1 } } // Sort by Score DESC, then Date DESC
            ]);

            // Note: Since aggregate returns POJOs, not Mongoose docs, we might miss virtuals but for this use case it's fine.
            // Alternatively, fetch IDs and populate.
        } else {
            // Default: Latest (Date DESC)
            posts = await Post.find()
                .populate('author', 'username profilePic')
                .sort({ createdAt: -1 });
        }

        res.status(200).json(posts);
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
            .populate('author', 'username profilePic bio');

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
        const { title, content, image } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        const post = await Post.create({
            title,
            content,
            image,
            author: req.user.id
        });

        const fullPost = await Post.findById(post._id).populate('author', 'username profilePic');

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

        // Check for user
        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Make sure the logged in user matches the post author
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

        // Check for user
        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Make sure the logged in user matches the post author
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await post.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        console.log(error);
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

        // Check if the post has already been liked
        if (post.likes.includes(req.user.id)) {
            return res.status(400).json({ message: 'Post already liked' });
        }

        post.likes.push(req.user.id);
        await post.save();

        res.status(200).json(post.likes);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
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

        // Check if the post has not yet been liked
        if (!post.likes.includes(req.user.id)) {
            return res.status(400).json({ message: 'Post has not yet been liked' });
        }

        // Remove user from likes
        const index = post.likes.indexOf(req.user.id);
        post.likes.splice(index, 1);
        await post.save();

        res.status(200).json(post.likes);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
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
};
