import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Edit, Trash2, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PostCard = ({ post, onPostUpdate }) => {
    const { user, updateUser } = useAuth();
    const [isLiked, setIsLiked] = useState(post.likes.includes(user?._id));
    const [likesCount, setLikesCount] = useState(post.likes.length);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState(post.comments || []);
    const [loadingComment, setLoadingComment] = useState(false);
    const [fetchedComments, setFetchedComments] = useState(false);
    const isBookmarked = user?.bookmarks?.includes(post._id) || false;
    const [showMenu, setShowMenu] = useState(false);

    const navigate = useNavigate();

    const isAuthor = user?._id === (post.author._id || post.author);

    // Toggle comments and fetch if needed
    const toggleComments = async () => {
        setShowComments(!showComments);
        if (!showComments && !fetchedComments) {
            try {
                const { data } = await api.get(`/posts/${post._id}/comments`);
                setComments(data);
                setFetchedComments(true);
            } catch (error) {
                console.error('Failed to load full comments', error);
            }
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (window.confirm('Delete this comment?')) {
            try {
                await api.delete(`/posts/${post._id}/comments/${commentId}`);
                setComments(comments.filter(c => c._id !== commentId));
                toast.success('Comment deleted');
            } catch (error) {
                toast.error('Failed to delete comment');
            }
        }
    };

    // Handle Like/Unlike
    const handleLike = async () => {
        if (!user) {
            toast.error('Please login to like posts');
            return;
        }

        try {
            if (isLiked) {
                await api.put(`/posts/${post._id}/unlike`);
                setLikesCount(prev => prev - 1);
                setIsLiked(false);
            } else {
                await api.put(`/posts/${post._id}/like`);
                setLikesCount(prev => prev + 1);
                setIsLiked(true);
            }
        } catch (error) {
            toast.error('Failed to update like');
        }
    };

    // Handle Bookmark
    const handleBookmark = async () => {
        if (!user) {
            toast.error('Please login to bookmark posts');
            return;
        }

        try {
            const res = await api.put(`/users/bookmarks/${post._id}`);
            toast.success(res.data.message);

            // Sync user bookmarks globally
            const updatedBookmarks = res.data.bookmarked
                ? [...(user.bookmarks || []), post._id]
                : (user.bookmarks || []).filter(id => id !== post._id);
            updateUser({ ...user, bookmarks: updatedBookmarks });
        } catch (error) {
            toast.error('Failed to update bookmark');
        }
    };

    // Handle Comment Submission
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        if (!user) {
            toast.error('Please login to comment');
            return;
        }

        setLoadingComment(true);
        try {
            const { data } = await api.post(`/posts/${post._id}/comments`, { text: commentText });
            setComments([data, ...comments]);
            setCommentText('');
            toast.success('Comment added!');
            // Update global feed if needed, or just local state
            if (onPostUpdate) onPostUpdate();
        } catch (error) {
            toast.error('Failed to add comment');
        } finally {
            setLoadingComment(false);
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
        try {
            await api.delete(`/posts/${post._id}`);
            toast.success('Post deleted successfully');
            if (onPostUpdate) onPostUpdate();
        } catch (error) {
            toast.error('Failed to delete post');
        }
        setShowMenu(false);
    };

    const handleToggleArchive = async () => {
        try {
            await api.put(`/posts/${post._id}`, { isArchived: !post.isArchived });
            toast.success(post.isArchived ? 'Post unarchived' : 'Post archived securely');
            if (onPostUpdate) onPostUpdate();
        } catch (error) {
            toast.error('Failed to update archive status');
        }
        setShowMenu(false);
    };

    return (
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Link to={`/profile/${post.author._id || post.author}`}>
                        <img
                            src={post.author.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`}
                            alt={post.author.username}
                            className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`;
                            }}
                        />
                    </Link>
                    <div>
                        <Link to={`/profile/${post.author._id || post.author}`} className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                            {post.author.username}
                        </Link>
                        <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleBookmark}
                        className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        title="Save Post"
                    >
                        <Bookmark size={20} className={isBookmarked ? "fill-current" : ""} />
                    </button>

                    {isAuthor && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="text-gray-400 p-2 rounded-full hover:bg-gray-50 transition-colors"
                            >
                                <MoreHorizontal size={20} />
                            </button>

                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <button
                                            onClick={() => navigate(`/edit-post/${post._id}`)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Edit size={16} /> Edit Post
                                        </button>
                                        <button
                                            onClick={handleToggleArchive}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Archive size={16} /> {post.isArchived ? 'Unarchive' : 'Archive'}
                                        </button>
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <button
                                            onClick={handleDeletePost}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={16} /> Delete Post
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Link wrapper */}
            <Link to={`/posts/${post._id}`} className="block group">
                <div className="px-4 pb-2">
                    <h2 className="text-[17px] font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors leading-snug">
                        {post.title}
                    </h2>
                    <div className="text-gray-700 text-[14px] leading-relaxed mb-3 font-sans prose prose-sm max-w-none prose-p:my-1 text-container-styles">
                        <div
                            dangerouslySetInnerHTML={{
                                __html: post?.content?.length > 300
                                    ? post.content.substring(0, 300) + '...'
                                    : post?.content || ''
                            }}
                        />
                        {post?.content?.length > 300 && (
                            <span className="text-gray-500 font-medium mt-1 inline-block group-hover:underline cursor-pointer">read more</span>
                        )}
                    </div>
                </div>

                {/* Hashtags Display */}
                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {post.hashtags.map((tag, index) => (
                            <span
                                key={index}
                                className="text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline transition-colors z-10 relative cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/?search=${encodeURIComponent(tag)}`);
                                }}
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Image */}
                {post.image && (
                    <div className="w-full bg-[#f8f9fa] border-y border-gray-100 overflow-hidden relative">
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full max-h-[500px] object-cover sm:object-contain"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/opacity-0 group-hover:bg-black/5 transition-colors duration-200"></div>
                    </div>
                )}
            </Link>

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={handleLike}
                        className={`flex items-center space-x-2 group ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                    >
                        <Heart size={20} className={`transform group-hover:scale-110 transition-transform ${isLiked ? 'fill-current' : ''}`} />
                        <span className="font-medium text-sm">
                            {likesCount}
                        </span>
                    </button>

                    <button
                        onClick={toggleComments}
                        className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 group"
                    >
                        <MessageCircle size={20} className="transform group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-sm">{comments.length}</span>
                    </button>

                    <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 group">
                        <Share2 size={20} className="transform group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            {
                showComments && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                        {/* Comment Form */}
                        <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <button
                                type="submit"
                                disabled={!commentText.trim() || loadingComment}
                                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-full hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                                Post
                            </button>
                        </form>

                        {/* Comments List */}
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {comments.length > 0 ? (
                                comments.map((comment, index) => (
                                    <div key={comment._id || index} className="flex space-x-3 group items-start">
                                        <Link to={`/profile/${comment.user?._id}`}>
                                            <img
                                                src={comment.user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=0ea5e9&color=fff&bold=true`}
                                                alt="User"
                                                className="w-8 h-8 rounded-full border border-gray-200 mt-1 object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=0ea5e9&color=fff&bold=true`;
                                                }}
                                            />
                                        </Link>
                                        <div className="flex-1">
                                            <div className="bg-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm border border-gray-100 flex justify-between items-start">
                                                <div>
                                                    <Link to={`/profile/${comment.user?._id}`} className="text-xs font-bold text-gray-900 hover:text-primary-600 transition-colors">
                                                        {comment.user?.username || 'User'}
                                                    </Link>
                                                    <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                                                </div>
                                                {user && (user._id === comment.user?._id || user._id === post.author._id || user._id === post.author) && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment._id)}
                                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                        title="Delete Comment"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 text-sm py-2">No comments yet. Be the first!</p>
                            )}
                        </div>
                    </div>
                )
            }
        </article >
    );
};

export default PostCard;
