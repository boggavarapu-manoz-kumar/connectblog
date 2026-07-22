const User = require('../models/User.model');
const Post = require('../models/Post.model');
const Follow = require('../models/Follow.model');
const Bookmark = require('../models/Bookmark.model');
const mongoose = require('mongoose');
const { invalidateCache } = require('../utils/cache');
const { sendNotification } = require('../utils/notify');
const asyncHandler = require('express-async-handler');

// Helper to attach follow status and dynamic follower count
const attachFollowContext = async (users, currentUser) => {
    if (!users.length) return users;
    const userIds = users.map(u => u._id);
    
    // Dynamically calculate actual follower counts
    const followerCounts = await Follow.aggregate([
        { $match: { following: { $in: userIds } } },
        { $group: { _id: "$following", count: { $sum: 1 } } }
    ]);
    
    const countMap = new Map();
    followerCounts.forEach(f => countMap.set(f._id.toString(), f.count));

    let followingSet = new Set();
    if (currentUser) {
        const following = await Follow.find({ follower: currentUser, following: { $in: userIds } }).lean();
        followingSet = new Set(following.map(f => f.following.toString()));
    }
    
    return users.map(u => ({
        ...u,
        followerCount: countMap.get(u._id.toString()) || 0,
        isFollowing: currentUser ? followingSet.has(u._id.toString()) : false
    }));
};

const getUsers = asyncHandler(async (req, res) => {
    const { search, limit } = req.query;
    let matchStage = {};

    if (search) {
        matchStage.username = { $regex: search, $options: 'i' };
    }

    let users = await User.find(matchStage)
        .select('username profilePic bio followerCount followingCount')
        .sort({ followerCount: -1, username: 1 })
        .limit(parseInt(limit) || 20)
        .lean();
        
    users = await attachFollowContext(users, req.user?.id);

    res.status(200).json(users);
});

const getUserProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let user;

    if (mongoose.Types.ObjectId.isValid(id)) {
        user = await User.findById(id).select('-password').lean();
    } else {
        user = await User.findOne({ username: id }).select('-password').lean();
    }

    if (!user) {
        return res.status(404).json({ message: 'User profile not found in our database' });
    }
    
    const [userWithContext] = await attachFollowContext([user], req.user?.id);

    res.status(200).json(userWithContext);
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

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

    invalidateCache(user._id.toString());
    invalidateCache(user.username);
    invalidateCache('api/users');

    res.status(200).json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        bio: updatedUser.bio,
        pronouns: updatedUser.pronouns,
        profilePic: updatedUser.profilePic,
        coverImage: updatedUser.coverImage,
        socialLinks: updatedUser.socialLinks,
        followerCount: updatedUser.followerCount,
        followingCount: updatedUser.followingCount
    });
});

const followUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let userToFollow;

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

    const existingFollow = await Follow.findOne({ follower: req.user.id, following: userToFollow._id });
    
    if (!existingFollow) {
        await Follow.create({ follower: req.user.id, following: userToFollow._id });
        await Promise.all([
            User.updateOne({ _id: userToFollow._id }, { $inc: { followerCount: 1 } }),
            User.updateOne({ _id: req.user.id }, { $inc: { followingCount: 1 } })
        ]);
        
        sendNotification(req, {
            recipientId: userToFollow._id,
            type: 'follow'
        }).catch(err => console.error('[Notification Error]', err.message));
    }

    invalidateCache(req.user.id);
    invalidateCache(userToFollow._id.toString());
    invalidateCache(userToFollow.username);

    return res.status(200).json({
        message: 'User followed successfully',
        status: 'following',
        followerId: req.user.id,
        followingId: userToFollow._id
    });
});

const unfollowUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let userToUnfollow;

    if (mongoose.Types.ObjectId.isValid(id)) {
        userToUnfollow = await User.findById(id);
    } else {
        userToUnfollow = await User.findOne({ username: id });
    }

    if (!userToUnfollow) {
        return res.status(404).json({ message: 'User to unfollow not found' });
    }

    const existingFollow = await Follow.findOne({ follower: req.user.id, following: userToUnfollow._id });
    
    if (existingFollow) {
        await existingFollow.deleteOne();
        await Promise.all([
            User.updateOne({ _id: userToUnfollow._id }, { $inc: { followerCount: -1 } }),
            User.updateOne({ _id: req.user.id }, { $inc: { followingCount: -1 } })
        ]);
    }

    invalidateCache(req.user.id);
    invalidateCache(userToUnfollow._id.toString());
    invalidateCache(userToUnfollow.username);

    res.status(200).json({ message: 'User unfollowed successfully', status: 'unfollowed' });
});

const toggleBookmark = asyncHandler(async (req, res) => {
    const postId = req.params.postId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid Post ID' });
    }

    const existingBookmark = await Bookmark.findOne({ user: req.user.id, post: postId });

    if (existingBookmark) {
        await existingBookmark.deleteOne();
        res.status(200).json({ message: 'Removed from bookmarks', bookmarked: false });
    } else {
        await Bookmark.create({ user: req.user.id, post: postId });
        res.status(200).json({ message: 'Added to bookmarks', bookmarked: true });
    }
});

const deleteUserAccount = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    await Post.deleteMany({ author: req.user.id });
    await Follow.deleteMany({ $or: [{ follower: req.user.id }, { following: req.user.id }] });
    await Bookmark.deleteMany({ user: req.user.id });
    
    // Also remove likes?
    const Like = require('../models/Like.model');
    await Like.deleteMany({ user: req.user.id });

    await user.deleteOne();

    res.status(200).json({ message: 'User account and all associated data deleted' });
});

const getFollowers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let user;
    if (mongoose.Types.ObjectId.isValid(id)) {
        user = await User.findById(id);
    } else {
        user = await User.findOne({ username: id });
    }
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const follows = await Follow.find({ following: user._id }).populate('follower', 'username profilePic bio');
    let followers = follows.map(f => f.follower).filter(f => f != null);
    followers = await attachFollowContext(followers, req.user?.id);
    
    res.status(200).json(followers);
});

const getFollowing = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let user;
    if (mongoose.Types.ObjectId.isValid(id)) {
        user = await User.findById(id);
    } else {
        user = await User.findOne({ username: id });
    }
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const follows = await Follow.find({ follower: user._id }).populate('following', 'username profilePic bio');
    let following = follows.map(f => f.following).filter(f => f != null);
    following = await attachFollowContext(following, req.user?.id);
    
    res.status(200).json(following);
});

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
