const Post = require('../models/Post.model');
const User = require('../models/User.model');
const Like = require('../models/Like.model');
const Bookmark = require('../models/Bookmark.model');
const mongoose = require('mongoose');

// Helper function to get liked and bookmarked status for a list of posts
const attachUserContext = async (posts, userId) => {
    if (!userId || !posts.length) return posts;
    const postIds = posts.map(p => p._id);
    const [userLikes, userBookmarks] = await Promise.all([
        Like.find({ user: userId, post: { $in: postIds } }).lean(),
        Bookmark.find({ user: userId, post: { $in: postIds } }).lean()
    ]);
    const likedSet = new Set(userLikes.map(l => l.post.toString()));
    const bookmarkedSet = new Set(userBookmarks.map(b => b.post.toString()));
    
    return posts.map(p => ({
        ...p,
        isLiked: likedSet.has(p._id.toString()),
        isBookmarked: bookmarkedSet.has(p._id.toString()),
        // Provide backwards compatibility for frontend components
        likes: likedSet.has(p._id.toString()) ? [userId] : [],
    }));
};

const getPosts = async ({ sort, search, author, archived, page = 1, limit = 10, userId }) => {
    const skip = (page - 1) * limit;
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

    let postsPromise;
    let countPromise = Post.countDocuments(matchStage);

    if (sort === 'trending') {
        postsPromise = Post.find(matchStage)
            .sort({ likeCount: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'username profilePic')
            .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
            .lean();
    } else if (!search && !author) {
        postsPromise = Post.find(matchStage)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'username profilePic')
            .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
            .lean();
    } else if (search) {
        postsPromise = Post.find({
            $text: { $search: search },
            isArchived: archived === 'true'
        })
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .populate('author', 'username profilePic')
            .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
            .lean();
    } else {
        postsPromise = Post.find(matchStage)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'username profilePic')
            .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
            .lean();
    }

    let [posts, totalPosts] = await Promise.all([postsPromise, countPromise]);
    posts = await attachUserContext(posts, userId);

    return {
        posts,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        currentPage: page,
        hasMore: page < Math.ceil(totalPosts / limit)
    };
};

const getPostById = async (postId, userId) => {
    let post = await Post.findById(postId)
        .populate('author', 'username profilePic bio pronouns socialLinks')
        .populate({
            path: 'comments',
            populate: { path: 'user', select: 'username profilePic bio' }
        })
        .lean();

    if (!post) throw new Error('Post not found');
    
    const [postsContext] = await attachUserContext([post], userId);
    return postsContext;
};

const createPost = async (userId, data) => {
    const { title, content, image, hashtags } = data;

    const post = await Post.create({
        title,
        content,
        image,
        author: userId,
        hashtags: Array.isArray(hashtags) ? hashtags : []
    });

    return await Post.findById(post._id)
        .populate('author', 'username profilePic')
        .lean();
};

const updatePost = async (postId, userId, data) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');
    if (post.author.toString() !== userId.toString()) {
        throw new Error('User not authorized');
    }

    return await Post.findByIdAndUpdate(postId, data, {
        returnDocument: 'after',
        runValidators: true
    }).populate('author', 'username profilePic').lean();
};

const deletePost = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');
    if (post.author.toString() !== userId.toString()) {
        throw new Error('User not authorized');
    }

    await post.deleteOne();
    await Like.deleteMany({ post: postId });
    await Bookmark.deleteMany({ post: postId });
    return post;
};

const likePost = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const existingLike = await Like.findOne({ user: userId, post: post._id });
    if (!existingLike) {
        await Like.create({ user: userId, post: post._id });
        await Post.findByIdAndUpdate(post._id, { $inc: { likeCount: 1 } });
        return { post, liked: true };
    }
    return { post, liked: false };
};

const unlikePost = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const existingLike = await Like.findOne({ user: userId, post: post._id });
    if (existingLike) {
        await existingLike.deleteOne();
        await Post.findByIdAndUpdate(post._id, { $inc: { likeCount: -1 } });
    }
    return post;
};

const getBookmarkedPosts = async (userId) => {
    const bookmarks = await Bookmark.find({ user: userId }).lean();
    if (!bookmarks.length) return { posts: [] };

    const postIds = bookmarks.map(b => b.post);
    let posts = await Post.find({ _id: { $in: postIds } })
        .populate('author', 'username profilePic')
        .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
        .sort({ createdAt: -1 })
        .lean();
        
    posts = await attachUserContext(posts, userId);
    return { posts };
};

const getUserPosts = async ({ targetUserId, page = 1, limit = 10, currentUserId }) => {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new Error('Invalid user ID');
    }

    const skip = (page - 1) * limit;
    const query = {
        author: new mongoose.Types.ObjectId(targetUserId),
        isArchived: false
    };

    let [posts, totalPosts] = await Promise.all([
        Post.find(query)
            .populate('author', 'username profilePic')
            .populate({ path: 'comments', populate: { path: 'user', select: 'username profilePic' } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Post.countDocuments(query)
    ]);
    
    posts = await attachUserContext(posts, currentUserId);

    return {
        posts,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        currentPage: page,
        hasMore: page < Math.ceil(totalPosts / limit)
    };
};

module.exports = {
    getPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getBookmarkedPosts,
    getUserPosts
};
