const User = require('../models/User.model');
const Post = require('../models/Post.model');
const { sendNotification } = require('../utils/notify');
const mongoose = require('mongoose');

// @desc    Get all users (Discovery)
// @route   GET /api/users
// @access  Public
const getUsers = async (req, res) => {
    try {
        const { search, limit } = req.query;
        let matchStage = {};

        if (search) {
            matchStage.username = { $regex: search, $options: 'i' };
        }

        const users = await User.aggregate([
            { $match: matchStage },
            {
                $project: {
                    username: 1,
                    profilePic: 1,
                    bio: 1,
                    followers: 1,
                    following: 1,
                    followersCount: { $size: { $ifNull: ["$followers", []] } }
                }
            },
            { $sort: { followersCount: -1, username: 1 } },
            { $limit: parseInt(limit) || 20 }
        ]);

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Public
const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        let user;

        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).select('-password');
        } else {
            // Routing based on exact @username string 
            user = await User.findOne({ username: id }).select('-password');
        }

        if (!user) {
            console.log(`[Backend] Profile not found for: ${id}`);
            return res.status(404).json({ message: 'User profile not found in our database' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('[Backend] Profile fetch error:', error);
        res.status(500).json({ message: 'Internal server error while fetching profile' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            if (req.body.username && req.body.username !== user.username) {
                const existingUser = await User.findOne({ username: req.body.username });
                if (existingUser) return res.status(400).json({ message: 'Username already taken' });
                user.username = req.body.username;
            }

            if (req.body.email && req.body.email !== user.email) {
                const existingEmail = await User.findOne({ email: req.body.email });
                if (existingEmail) return res.status(400).json({ message: 'Email already in use' });
                user.email = req.body.email;
            }
            user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
            user.pronouns = req.body.pronouns !== undefined ? req.body.pronouns : user.pronouns;
            user.profilePic = req.body.profilePic || user.profilePic;
            user.coverImage = req.body.coverImage !== undefined ? req.body.coverImage : user.coverImage;

            if (req.body.password) {
                user.password = req.body.password;
            }

            if (req.body.socialLinks) {
                user.socialLinks = {
                    ...user.socialLinks,
                    ...req.body.socialLinks
                };
            }

            const updatedUser = await user.save();

            res.status(200).json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                bio: updatedUser.bio,
                pronouns: updatedUser.pronouns,
                profilePic: updatedUser.profilePic,
                coverImage: updatedUser.coverImage,
                socialLinks: updatedUser.socialLinks
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Follow a user
// @route   PUT /api/users/:id/follow
// @access  Private
const followUser = async (req, res) => {
    if (req.user.id === req.params.id) {
        return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (userToFollow.followers.some(f => f.toString() === req.user.id)) {
            return res.status(400).json({ message: 'You already follow this user' });
        }

        await userToFollow.updateOne({ $push: { followers: req.user.id } });
        await currentUser.updateOne({ $push: { following: req.params.id } });

        // ------------- Notify Target User ------------------
        sendNotification(req, {
            recipientId: req.params.id,
            type: 'follow'
        }).catch(console.error);

        return res.status(200).json({ message: 'User followed', status: 'following' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unfollow a user
// @route   PUT /api/users/:id/unfollow
// @access  Private
const unfollowUser = async (req, res) => {
    if (req.user.id === req.params.id) {
        return res.status(400).json({ message: 'You cannot unfollow yourself' });
    }

    try {
        const userToUnfollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (userToUnfollow.followers.some(f => f.toString() === req.user.id)) {
            await userToUnfollow.updateOne({ $pull: { followers: req.user.id } });
            await currentUser.updateOne({ $pull: { following: req.params.id } });
            res.status(200).json({ message: 'User unfollowed' });
        } else {
            res.status(403).json({ message: 'You do not follow this user' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const toggleBookmark = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const postId = req.params.postId;

        if (user.bookmarks.some(b => b.toString() === postId)) {
            await user.updateOne({ $pull: { bookmarks: postId } });
            res.status(200).json({ message: 'Post removed from bookmarks', bookmarked: false });
        } else {
            await user.updateOne({ $push: { bookmarks: postId } });
            res.status(200).json({ message: 'Post bookmarked', bookmarked: true });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
const deleteUserAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Delete all posts by this user
        const Post = require('../models/Post.model');
        await Post.deleteMany({ author: req.user.id });

        // 2. Delete the user
        await user.deleteOne();

        res.status(200).json({ message: 'User account and all associated data deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    followUser,
    unfollowUser,
    toggleBookmark,
    deleteUserAccount,
    getUsers
};
