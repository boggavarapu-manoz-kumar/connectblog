const mongoose = require('mongoose');
const Post = require('../models/Post.model');
const Like = require('../models/Like.model');
const Bookmark = require('../models/Bookmark.model');
const postService = require('./post.service');

// Mock the models
jest.mock('../models/Post.model');
jest.mock('../models/Like.model');
jest.mock('../models/Bookmark.model');

describe('Post Service Unit Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createPost', () => {
        it('should successfully create a post and return the populated post', async () => {
            const mockUserId = new mongoose.Types.ObjectId().toString();
            const mockPostData = { title: 'Test Post', content: 'Test Content' };
            const mockCreatedPost = { _id: 'post1', title: 'Test Post', content: 'Test Content' };
            
            // Mock Post.create
            Post.create.mockResolvedValue(mockCreatedPost);
            
            // Mock Post.findById().populate().lean()
            const mockPopulate = jest.fn().mockReturnThis();
            const mockLean = jest.fn().mockResolvedValue({
                ...mockCreatedPost,
                author: { _id: mockUserId, username: 'testuser' }
            });
            Post.findById.mockReturnValue({ populate: mockPopulate, lean: mockLean });

            const result = await postService.createPost(mockUserId, mockPostData);

            expect(Post.create).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Test Post',
                author: mockUserId,
                hashtags: []
            }));
            expect(Post.findById).toHaveBeenCalledWith(mockCreatedPost._id);
            expect(result.author.username).toBe('testuser');
        });
    });

    describe('deletePost', () => {
        it('should delete a post if the user is the author', async () => {
            const mockUserId = new mongoose.Types.ObjectId().toString();
            const mockPostId = new mongoose.Types.ObjectId().toString();
            
            const mockPost = {
                _id: mockPostId,
                author: { toString: () => mockUserId },
                deleteOne: jest.fn().mockResolvedValue(true)
            };
            
            Post.findById.mockResolvedValue(mockPost);
            Like.deleteMany.mockResolvedValue(true);
            Bookmark.deleteMany.mockResolvedValue(true);

            await postService.deletePost(mockPostId, mockUserId);

            expect(Post.findById).toHaveBeenCalledWith(mockPostId);
            expect(mockPost.deleteOne).toHaveBeenCalled();
            expect(Like.deleteMany).toHaveBeenCalledWith({ post: mockPostId });
            expect(Bookmark.deleteMany).toHaveBeenCalledWith({ post: mockPostId });
        });

        it('should throw an error if the post does not exist', async () => {
            Post.findById.mockResolvedValue(null);
            
            await expect(postService.deletePost('invalid_id', 'user_id'))
                .rejects.toThrow('Post not found');
        });

        it('should throw an error if the user is not the author', async () => {
            const mockPost = {
                author: { toString: () => 'author_id' }
            };
            Post.findById.mockResolvedValue(mockPost);
            
            await expect(postService.deletePost('post_id', 'hacker_id'))
                .rejects.toThrow('User not authorized');
        });
    });

    describe('likePost', () => {
        it('should create a like if it does not exist', async () => {
            const mockUserId = 'user_id';
            const mockPostId = 'post_id';
            
            Post.findById.mockResolvedValue({ _id: mockPostId });
            Like.findOne.mockResolvedValue(null);
            Like.create.mockResolvedValue(true);
            Post.findByIdAndUpdate.mockResolvedValue(true);

            const result = await postService.likePost(mockPostId, mockUserId);

            expect(Like.create).toHaveBeenCalledWith({ user: mockUserId, post: mockPostId });
            expect(Post.findByIdAndUpdate).toHaveBeenCalledWith(mockPostId, { $inc: { likeCount: 1 } });
            expect(result.liked).toBe(true);
        });

        it('should not create a like if it already exists', async () => {
            const mockUserId = 'user_id';
            const mockPostId = 'post_id';
            
            Post.findById.mockResolvedValue({ _id: mockPostId });
            Like.findOne.mockResolvedValue({ _id: 'like_id' }); // Like exists

            const result = await postService.likePost(mockPostId, mockUserId);

            expect(Like.create).not.toHaveBeenCalled();
            expect(result.liked).toBe(false);
        });
    });

    describe('attachUserContext', () => {
        // Because attachUserContext is not exported directly in module.exports 
        // we can test it indirectly via getBookmarkedPosts.
        it('should correctly attach isLiked and isBookmarked to posts via getBookmarkedPosts', async () => {
            const mockUserId = 'user_id';
            
            Bookmark.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ post: 'post_1' }])
            });
            
            const mockPosts = [{ _id: 'post_1', title: 'Post 1' }];
            const mockPopulate = jest.fn().mockReturnThis();
            const mockSort = jest.fn().mockReturnThis();
            const mockLean = jest.fn().mockResolvedValue(mockPosts);
            
            Post.find.mockReturnValue({
                populate: mockPopulate,
                sort: mockSort,
                lean: mockLean
            });

            Like.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ post: 'post_1' }])
            });

            const result = await postService.getBookmarkedPosts(mockUserId);
            
            expect(result.posts[0].isLiked).toBe(true);
            expect(result.posts[0].isBookmarked).toBe(true);
            expect(result.posts[0].likes).toEqual([mockUserId]);
        });
    });

    describe('getPostById', () => {
        it('should get a single post by id', async () => {
            const mockPostId = 'post_id';
            const mockPopulate = jest.fn().mockReturnThis();
            const mockLean = jest.fn().mockResolvedValue({ _id: mockPostId, title: 'Found Post' });
            Post.findById.mockReturnValue({ populate: mockPopulate, lean: mockLean });
            Like.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
            Bookmark.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

            const result = await postService.getPostById(mockPostId, 'user_id');
            expect(result.title).toBe('Found Post');
        });

        it('should throw if post is not found', async () => {
            Post.findById.mockReturnValue({ populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
            await expect(postService.getPostById('bad_id', 'user_id')).rejects.toThrow('Post not found');
        });
    });

    describe('updatePost', () => {
        it('should update a post if authorized', async () => {
            const mockPost = { _id: 'post_id', author: { toString: () => 'user_id' } };
            Post.findById.mockResolvedValue(mockPost);
            
            const mockPopulate = jest.fn().mockReturnThis();
            const mockLean = jest.fn().mockResolvedValue({ _id: 'post_id', title: 'Updated' });
            Post.findByIdAndUpdate.mockReturnValue({ populate: mockPopulate, lean: mockLean });

            const result = await postService.updatePost('post_id', 'user_id', { title: 'Updated' });
            expect(result.title).toBe('Updated');
        });

        it('should throw if not authorized to update', async () => {
            const mockPost = { _id: 'post_id', author: { toString: () => 'hacker' } };
            Post.findById.mockResolvedValue(mockPost);
            await expect(postService.updatePost('post_id', 'user_id', {})).rejects.toThrow('User not authorized');
        });
    });

    describe('unlikePost', () => {
        it('should unlike a post', async () => {
            Post.findById.mockResolvedValue({ _id: 'post_id' });
            const mockLike = { deleteOne: jest.fn().mockResolvedValue(true) };
            Like.findOne.mockResolvedValue(mockLike);
            Post.findByIdAndUpdate.mockResolvedValue(true);

            await postService.unlikePost('post_id', 'user_id');
            expect(mockLike.deleteOne).toHaveBeenCalled();
            expect(Post.findByIdAndUpdate).toHaveBeenCalled();
        });
    });
});
