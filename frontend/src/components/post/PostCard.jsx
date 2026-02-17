import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PostCard = ({ post, onPostUpdate }) => {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(post.likes.includes(user?._id));
    const [likesCount, setLikesCount] = useState(post.likes.length);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState(post.comments || []);
    const [loadingComment, setLoadingComment] = useState(false);

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
            setComments([...comments, data]);
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

    return (
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Link to={`/profile/${post.author._id}`}>
                        <img
                            src={post.author.profilePic || 'https://via.placeholder.com/40'}
                            alt={post.author.username}
                            className="h-10 w-10 rounded-full object-cover border border-gray-100"
                        />
                    </Link>
                    <div>
                        <Link to={`/profile/${post.author._id}`} className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                            {post.author.username}
                        </Link>
                        <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-2">
                <Link to={`/posts/${post._id}`}>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                        {post.title}
                    </h2>
                </Link>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                    {post.content.length > 200 ? `${post.content.substring(0, 200)}...` : post.content}
                </p>
            </div>

            {/* Image */}
            {post.image && (
                <div className="w-full h-64 sm:h-80 bg-gray-100 overflow-hidden">
                    <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={handleLike}
                        className={`flex items-center space-x-2 group ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                    >
                        <Heart size={20} className={`transform group-hover:scale-110 transition-transform ${isLiked ? 'fill-current' : ''}`} />
                        <span className="font-medium text-sm">{likesCount}</span>
                    </button>

                    <button
                        onClick={() => setShowComments(!showComments)}
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
            {showComments && (
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
                                <div key={comment._id || index} className="flex space-x-3">
                                    <img
                                        src={comment.user?.profilePic || 'https://via.placeholder.com/32'}
                                        alt="User"
                                        className="w-8 h-8 rounded-full border border-gray-200"
                                    />
                                    <div className="bg-white p-3 rounded-tr-lg rounded-br-lg rounded-bl-lg shadow-sm w-full">
                                        <p className="text-xs font-semibold text-gray-900">{comment.user?.username || 'User'}</p>
                                        <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 text-sm py-2">No comments yet. Be the first!</p>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
};

export default PostCard;
