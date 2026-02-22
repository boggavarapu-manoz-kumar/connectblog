const User = require('../models/User.model');
const Post = require('../models/Post.model');
const mongoose = require('mongoose');
const { invalidateCache } = require('../utils/cache');

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
        const user = await User.findById(req.user.id).select('+password');

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

            if (req.body.newPassword) {
                if (!req.body.currentPassword) {
                    return res.status(400).json({ message: 'Current password is required to set a new password' });
                }
                const isMatch = await user.matchPassword(req.body.currentPassword);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Incorrect current password' });
                }
                user.password = req.body.newPassword;
            }

            if (req.body.socialLinks) {
                user.socialLinks = {
                    ...user.socialLinks,
                    ...req.body.socialLinks
                };
            }

            const updatedUser = await user.save();

            // Invalidate profile cache
            invalidateCache(user._id.toString());
            invalidateCache(user.username);
            invalidateCache('api/users'); // Invalidate user discovery list

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
    try {
        let userToFollow;
        const { id } = req.params;

        if (mongoose.Types.ObjectId.isValid(id)) {
            userToFollow = await User.findById(id);
        } else {
            userToFollow = await User.findOne({ username: id });
        }

        if (!userToFollow) {
            return res.status(404).json({ message: 'User to follow not found' });
        }

        if (userToFollow._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const currentUser = await User.findById(req.user.id);

        // Idempotent add using $addToSet
        await userToFollow.updateOne({ $addToSet: { followers: req.user.id } });
        await currentUser.updateOne({ $addToSet: { following: userToFollow._id } });

        // Invalidate feed and follower/following lists
        invalidateCache(req.user.id); // Follower's feed might change
        invalidateCache(userToFollow._id.toString()); // Followed's profile/followers list change

        // ------------- Notify Target User ------------------
        sendNotification(req, {
            recipientId: userToFollow._id,
            type: 'follow'
        }).catch(err => console.error('[Notification Error]', err.message));

        return res.status(200).json({
            message: 'User followed successfully',
            status: 'following',
            followerId: req.user.id,
            followingId: userToFollow._id
        });
    } catch (error) {
        console.error('[Follow Error]', error);
        res.status(500).json({ message: 'Server error while following user' });
    }
};

// @desc    Unfollow a user
// @route   PUT /api/users/:id/unfollow
// @access  Private
const unfollowUser = async (req, res) => {
    try {
        let userToUnfollow;
        const { id } = req.params;

        if (mongoose.Types.ObjectId.isValid(id)) {
            userToUnfollow = await User.findById(id);
        } else {
            userToUnfollow = await User.findOne({ username: id });
        }

        if (!userToUnfollow) {
            return res.status(404).json({ message: 'User to unfollow not found' });
        }

        const currentUser = await User.findById(req.user.id);

        // Idempotent remove using $pull
        await userToUnfollow.updateOne({ $pull: { followers: req.user.id } });
        await currentUser.updateOne({ $pull: { following: userToUnfollow._id } });

        // Invalidate feed and follower/following lists
        invalidateCache(req.user.id);
        invalidateCache(userToUnfollow._id.toString());

        res.status(200).json({ message: 'User unfollowed successfully', status: 'unfollowed' });
    } catch (error) {
        console.error('[Unfollow Error]', error);
        res.status(500).json({ message: 'Server error while unfollowing user' });
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

// @desc    Get followers
// @route   GET /api/users/:id/followers
// @access  Public
const getFollowers = async (req, res) => {
    try {
        const { id } = req.params;
        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).populate('followers', 'username profilePic bio');
        } else {
            user = await User.findOne({ username: id }).populate('followers', 'username profilePic bio');
        }
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.followers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get following
// @route   GET /api/users/:id/following
// @access  Public
const getFollowing = async (req, res) => {
    try {
        const { id } = req.params;
        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).populate('following', 'username profilePic bio');
        } else {
            user = await User.findOne({ username: id }).populate('following', 'username profilePic bio');
        }
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.following);
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
    getUsers,
    getFollowers,
    getFollowing
};
