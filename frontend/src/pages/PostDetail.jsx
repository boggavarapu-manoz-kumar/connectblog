import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, Heart, MessageCircle, Share2, Loader2, MoreHorizontal, Edit, Trash2, Archive, EyeOff, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [showMenu, setShowMenu] = useState(false);

    // Comments state
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [loadingComment, setLoadingComment] = useState(false);

    // Scroll States
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);

    // Handle Scroll Tracking
    useEffect(() => {
        const handleScroll = () => {
            // Reading progress
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const progress = (window.scrollY / totalHeight) * 100;
                setScrollProgress(progress);
            }

            // Back to top visibility
            setShowBackToTop(window.scrollY > 400);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    useEffect(() => {
        fetchPost();
    }, [id]);

    const fetchPost = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/posts/${id}`);
            setPost(data);
            setLikesCount(data.likes.length);

            if (user && data.likes.includes(user._id)) {
                setIsLiked(true);
            }

            // Fetch comments
            const commentsRes = await api.get(`/posts/${id}/comments`);
            setComments(commentsRes.data);
        } catch (error) {
            console.error('Failed to fetch post', error);
            toast.error('Post not found');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const isAuthor = user?._id === (post?.author?._id || post?.author);

    const handleLike = async () => {
        if (!user) {
            toast.error('Please login to like posts');
            return;
        }
        try {
            if (isLiked) {
                await api.put(`/posts/${id}/unlike`);
                setLikesCount(prev => prev - 1);
                setIsLiked(false);
            } else {
                await api.put(`/posts/${id}/like`);
                setLikesCount(prev => prev + 1);
                setIsLiked(true);
            }
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
        try {
            await api.delete(`/posts/${id}`);
            toast.success('Post deleted');
            navigate('/');
        } catch (error) {
            toast.error('Failed to delete post');
        }
        setShowMenu(false);
    };

    const handleToggleArchive = async () => {
        try {
            const { data } = await api.put(`/posts/${id}`, { isArchived: !post.isArchived });
            setPost(data);
            toast.success(post.isArchived ? 'Post unarchived' : 'Post archived securely');
        } catch (error) {
            toast.error('Failed to update archive status');
        }
        setShowMenu(false);
    };

    const handleToggleHideLikes = async () => {
        try {
            const { data } = await api.put(`/posts/${id}`, { hideLikes: !post.hideLikes });
            setPost(data);
            toast.success(post.hideLikes ? 'Likes count is now visible' : 'Likes count hidden');
        } catch (error) {
            toast.error('Failed to update like visibility');
        }
        setShowMenu(false);
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !user) return;

        setLoadingComment(true);
        try {
            const { data } = await api.post(`/posts/${id}/comments`, { text: commentText });
            setComments([data, ...comments]);
            setCommentText('');
            toast.success('Comment added!');
        } catch (error) {
            toast.error('Failed to add comment');
        } finally {
            setLoadingComment(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f3f2ef]">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
        );
    }

    if (!post) return null;

    return (
        <div className="min-h-screen bg-[#f3f2ef] py-6 sm:py-8 font-sans">
            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-gray-100">
                <div
                    className="h-full bg-primary-600 transition-all duration-150 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Premium Back Button */}
                <div className="py-4">
                    <button
                        onClick={handleBack}
                        className="group flex items-center space-x-2 text-gray-500 hover:text-primary-600 transition-all duration-200 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-x-1"
                    >
                        <ArrowLeft size={18} className="group-hover:animate-pulse" />
                        <span>Back</span>
                    </button>
                </div>

                {/* LinkedIn Style Post Container */}
                <article className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden break-words">

                    {/* Header */}
                    <div className="p-4 sm:p-5 flex items-start justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <Link to={`/profile/${post.author._id}`} className="flex-shrink-0 relative">
                                <img
                                    src={post.author.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`}
                                    alt={post.author.username}
                                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover border border-gray-100 shadow-sm"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`;
                                    }}
                                />
                                {post.author.role === 'admin' && (
                                    <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-blue-500 ring-2 ring-white"></span>
                                )}
                            </Link>
                            <div className="flex flex-col">
                                <Link to={`/profile/${post.author._id}`} className="font-semibold text-[15px] sm:text-base text-gray-900 hover:text-primary-600 transition-colors leading-tight flex items-center gap-1.5">
                                    {post.author.username}
                                    {post.author.pronouns && (
                                        <span className="text-xs font-normal text-gray-500 hidden sm:inline-block">({post.author.pronouns})</span>
                                    )}
                                </Link>
                                <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5 max-w-[200px] sm:max-w-none truncate">
                                    {post.author.bio || 'ConnectBlog Member'}
                                </p>
                                <div className="flex items-center text-xs text-gray-500 mt-0.5 space-x-1">
                                    <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                                    <span className="text-[10px]">•</span>
                                    <span className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" data-supported-dps="16x16" fill="currentColor" className="w-3.5 h-3.5" width="16" height="16" focusable="false">
                                            <path d="M8 1a7 7 0 107 7 7 7 0 00-7-7zM3 8a5 5 0 011-3l.55.55A1.5 1.5 0 015 6.62v1.07a.75.75 0 00.22.53l.56.56a.75.75 0 00.53.22H7v.69a.75.75 0 00.22.53l.56.56a.75.75 0 01.22.53V13a5 5 0 01-5-5zm6.24 4.83l2-2.46a.75.75 0 00.09-.8l-.58-1.16A.76.76 0 0010 8H7v-.19a.51.51 0 01.28-.45l.38-.19a.74.74 0 00.12-.09L8.5 7h.25a.75.75 0 00.75-.75v-.43a.47.47 0 01.28-.45l.38-.19a.74.74 0 00.12-.09L11.5 5h.28a5 5 0 01-2.54 7.83z"></path>
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                        {isAuthor && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <MoreHorizontal size={20} />
                                </button>
                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-2 overflow-hidden">
                                            <button onClick={() => navigate(`/edit-post/${id}`)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                <Edit size={16} /> Edit Post
                                            </button>
                                            <button onClick={handleToggleArchive} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                <Archive size={16} /> {post.isArchived ? 'Unarchive' : 'Archive'}
                                            </button>
                                            <button onClick={handleToggleHideLikes} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                {post.hideLikes ? <Eye size={16} /> : <EyeOff size={16} />}
                                                {post.hideLikes ? 'Show Likes Count' : 'Hide Likes Count'}
                                            </button>
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <button onClick={handleDeletePost} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={16} /> Delete Post
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="px-4 sm:px-5 pb-3">
                        <h1 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-4 leading-snug">
                            {post.title}
                        </h1>
                        <div
                            className="text-[14px] sm:text-[15px] text-gray-800 leading-[1.6] font-sans prose prose-blue max-w-none"
                            dangerouslySetInnerHTML={{ __html: post.content || '' }}
                        />
                    </div>

                    {/* Full Width Image */}
                    {post.image && (
                        <div className="w-full bg-[#f8f9fa] border-y border-gray-100 mt-2">
                            <img
                                src={post.image}
                                alt={post.title}
                                className="w-full max-h-[600px] object-contain"
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Engagement Stats */}
                    <div className="px-4 py-3 flex items-center justify-between text-[13px] text-gray-500 border-b border-gray-100">
                        <div className="flex items-center gap-1.5">
                            {((!post.hideLikes || isAuthor) && likesCount > 0) && (
                                <>
                                    <div className="flex -space-x-1">
                                        <div className="bg-blue-500 rounded-full p-1 border border-white z-10">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" data-supported-dps="16x16" fill="white" className="w-2.5 h-2.5" width="16" height="16" focusable="false">
                                                <path d="M12.43 3A3.59 3.59 0 009.6 1.81a3.78 3.78 0 00-2 1h-.2a3.78 3.78 0 00-2-1A3.59 3.59 0 002.57 3a4.23 4.23 0 00-.57 2.1c0 3.33 3.4 5.92 5.56 7.64l.44.36.44-.36c2.16-1.72 5.56-4.31 5.56-7.64A4.23 4.23 0 0012.43 3z"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="hover:text-blue-600 hover:underline cursor-pointer">
                                        {likesCount}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <span className="hover:text-blue-600 hover:underline cursor-pointer">{comments.length} comments</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-2 py-1 flex items-center justify-between border-b border-gray-100 sm:px-4">
                        <button
                            onClick={handleLike}
                            className={`flex flex-1 items-center justify-center space-x-2 py-3 px-2 rounded-lg font-medium text-[14px] transition-colors ${isLiked ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            <Heart size={20} className={isLiked ? "fill-blue-600" : ""} />
                            <span className="hidden sm:block">Like</span>
                        </button>

                        <button
                            className="flex flex-1 items-center justify-center space-x-2 py-3 px-2 rounded-lg font-medium text-[14px] text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <MessageCircle size={20} />
                            <span className="hidden sm:block">Comment</span>
                        </button>

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success('Link copied to clipboard!');
                            }}
                            className="flex flex-1 items-center justify-center space-x-2 py-3 px-2 rounded-lg font-medium text-[14px] text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <Share2 size={20} />
                            <span className="hidden sm:block">Share</span>
                        </button>
                    </div>

                    {/* Comments Section */}
                    <div className="p-4 sm:p-5 bg-white space-y-5">
                        {/* Add Comment Input */}
                        {user ? (
                            <form onSubmit={handleCommentSubmit} className="flex gap-3 items-start">
                                <img
                                    src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0ea5e9&color=fff&bold=true`}
                                    alt={user.username}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0ea5e9&color=fff&bold=true`;
                                    }}
                                />
                                <div className="flex-1 right-0 border border-gray-300 rounded-full flex items-center pl-4 pr-1.5 focus-within:border-gray-500 focus-within:shadow-sm overflow-hidden transition-all h-auto min-h-[46px]">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="w-full bg-transparent outline-none text-[14px] py-1.5"
                                        disabled={loadingComment}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loadingComment || !commentText.trim()}
                                        className="text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 px-4 py-1.5 font-semibold text-sm rounded-full transition-colors ml-2"
                                    >
                                        Post
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                                <p className="text-gray-600 text-sm">Please log in to join the conversation.</p>
                            </div>
                        )}

                        <div className="space-y-4 pt-4">
                            {comments.map((comment) => (
                                <div key={comment._id} className="flex space-x-3 group">
                                    <Link to={`/profile/${comment.user?._id}`}>
                                        <img
                                            src={comment.user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=0ea5e9&color=fff&bold=true`}
                                            alt={comment.user?.username || 'User'}
                                            className="h-10 w-10 rounded-full object-cover border border-gray-200 mt-1 shadow-sm"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=0ea5e9&color=fff&bold=true`;
                                            }}
                                        />
                                    </Link>
                                    <div className="flex-1 bg-gray-100 rounded-tr-xl rounded-b-xl rounded-bl-sm p-3 group-hover:bg-gray-200 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <Link to={`/profile/${comment.user?._id}`} className="font-semibold text-gray-900 text-[13px] hover:text-blue-600 transition-colors leading-tight">
                                                    {comment.user?.username || 'User'}
                                                </Link>
                                                {comment.user?.bio && (
                                                    <p className="text-gray-500 text-[11px] truncate max-w-[200px] mb-1">
                                                        {comment.user.bio}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-gray-500 font-medium">
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })}
                                            </span>
                                        </div>
                                        <p className="text-gray-800 text-[13.5px] whitespace-pre-wrap mt-0.5 leading-snug">
                                            {comment.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </div>

            {/* Floating Back to Top Button */}
            {showBackToTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-8 right-8 p-3 bg-white text-primary-600 rounded-2xl shadow-2xl border border-gray-100 hover:bg-primary-50 transition-all duration-300 transform hover:-translate-y-1 z-40 animate-in fade-in zoom-in duration-300"
                    title="Scroll to top"
                >
                    <svg
                        className="w-6 h-6 transform rotate-90"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default PostDetail;
