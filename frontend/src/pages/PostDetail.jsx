import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToggleLike } from '../hooks/useToggleLike';
import { useFollowUser } from '../hooks/useFollowUser';
import { useToggleBookmark } from '../hooks/useToggleBookmark';
import { ArrowLeft, Heart, MessageCircle, Share2, Loader2, MoreHorizontal, Edit, Trash2, Archive, EyeOff, Eye, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { formatImageUrl } from '../utils/formatUrl';

const PostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const queryClient = useQueryClient();

    const [showMenu, setShowMenu] = useState(false);
    const [commentText, setCommentText] = useState('');

    // Query: Post Data
    const { data: post, isLoading, error } = useQuery({
        queryKey: ['post', id],
        queryFn: async () => {
            const { data } = await api.get(`/posts/${id}`);
            return data;
        },
        staleTime: 1000 * 60 * 2, // 2 mins cache
    });

    // Query: Comments
    const { data: comments = [], isLoading: commentsLoading } = useQuery({
        queryKey: ['post-comments', id],
        queryFn: async () => {
            const { data } = await api.get(`/posts/${id}/comments`);
            return data;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 1, // 1 min cache
    });

    // Like mutation
    const likeMutation = useToggleLike();

    // Follow mutation
    const followMutation = useFollowUser();

    // Bookmark mutation
    const bookmarkMutation = useToggleBookmark();
    const isBookmarked = post?.isBookmarked || false;

    // Comment Mutation (Fully Optimistic)
    const commentMutation = useMutation({
        mutationFn: async (text) => {
            const { data } = await api.post(`/posts/${id}/comments`, { text });
            return data;
        },
        onMutate: async (text) => {
            const tempCommentId = Date.now().toString();
            const tempComment = {
                _id: tempCommentId,
                text,
                user: {
                    _id: user?._id,
                    username: user?.username,
                    profilePic: user?.profilePic
                },
                createdAt: new Date().toISOString()
            };

            await queryClient.cancelQueries({ queryKey: ['post-comments', id] });
            const previousComments = queryClient.getQueryData(['post-comments', id]);

            queryClient.setQueryData(['post-comments', id], old => {
                const oldComments = Array.isArray(old) ? old : [];
                return [tempComment, ...oldComments];
            });

            const updatePostComments = (p) => {
                if (p._id !== id && p.id !== id) return p;
                return { ...p, comments: [...(p.comments || []), tempComment] };
            };

            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(updatePostComments) || []
                    }))
                };
            });

            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostComments) };
            });

            return { previousComments, tempCommentId };
        },
        onError: (err, newComment, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['post-comments', id], context.previousComments);
            }
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
            toast.error('Failed to add comment');
        },
        onSuccess: (newComment, variables, context) => {
            const tempCommentId = context?.tempCommentId;

            queryClient.setQueryData(['post-comments', id], old => {
                const oldComments = Array.isArray(old) ? old : [];
                return oldComments.map(c => c._id === tempCommentId ? newComment : c);
            });

            const replaceComment = (p) => {
                if (p._id !== id && p.id !== id) return p;
                return {
                    ...p,
                    comments: (p.comments || []).map(c => 
                        c._id === tempCommentId ? newComment : c
                    )
                };
            };

            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(replaceComment) || []
                    }))
                };
            });

            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(replaceComment) };
            });

            queryClient.setQueryData(['post', id], old => {
                if (!old) return old;
                return replaceComment(old);
            });

            queryClient.invalidateQueries({ queryKey: ['post-comments', id] });
            queryClient.invalidateQueries({ queryKey: ['post', id] });
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
            queryClient.invalidateQueries({ queryKey: ['profile-private'] });
        },
    });

    const handleBack = () => {
        if (window.history.length > 2) navigate(-1);
        else navigate('/');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f3f2ef] lg:bg-black">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
        );
    }

    if (error || !post) {
        toast.error('Post not found');
        navigate('/');
        return null;
    }

    const isAuthor = user?._id === (post?.author?._id || post?.author);
    const isLiked = user && post?.likes?.includes(user._id);
    const likesCount = post?.likes?.length || 0;

    return (
        <div className="min-h-screen bg-[#f3f2ef] lg:bg-[#fafafa] py-0 lg:py-6 font-sans flex flex-col justify-center">
            <Helmet>
                <title>{post?.title ? `${post.title} | ConnectBlog` : 'ConnectBlog'}</title>
                <meta property="og:title" content={post?.title || 'Post'} />
                <meta property="og:description" content={post?.content ? post.content.substring(0, 150) : ''} />
                {post?.image && <meta property="og:image" content={formatImageUrl(post.image)} />}
                <meta property="og:type" content="article" />
                <meta name="twitter:card" content="summary_large_image" />
            </Helmet>

            <div className="w-full max-w-[1100px] mx-auto lg:px-4 flex flex-col h-full lg:h-[calc(100vh-120px)] lg:max-h-[850px]">
                {/* Back button wrapper */}
                <div className="p-3 lg:p-0 lg:pb-3 shrink-0 flex">
                    <button onClick={handleBack} className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 font-semibold transition-all">
                        <ArrowLeft size={20} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                </div>

                <div className="flex-1 bg-white lg:rounded-bl-[4px] lg:rounded-br-[4px] lg:shadow-md lg:border lg:border-gray-200 overflow-hidden flex flex-col lg:flex-row h-full">
                    
                    {/* LEFT COLUMN: Media (Only if image exists, otherwise right column takes full width) */}
                    {post.image && (
                        <div className="w-full lg:w-[55%] xl:w-[60%] bg-black flex items-center justify-center min-h-[400px] lg:min-h-0 relative">
                            <img src={formatImageUrl(post.image)} alt={post.title} className="w-full h-full object-contain" />
                        </div>
                    )}

                    {/* RIGHT COLUMN: Interaction Hub */}
                    <div className={`w-full ${post.image ? 'lg:w-[45%] xl:w-[40%]' : 'w-full max-w-[700px] mx-auto'} flex flex-col h-full bg-white lg:border-l border-gray-200`}>
                        
                        {/* 1. Header (Author Info & Menu) */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex items-center space-x-3">
                                <Link to={`/profile/${post.author?._id}`}>
                                    <img src={formatImageUrl(post.author?.profilePic)} alt={post.author?.username} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                                </Link>
                                <div className="flex items-center space-x-2">
                                    <Link to={`/profile/${post.author?._id}`} className="font-semibold text-[14px] text-gray-900 hover:text-gray-500 leading-tight">
                                        {post.author?.username || 'User'}
                                    </Link>
                                    {!isAuthor && user && (
                                        <>
                                            <span className="text-gray-300 text-xs">•</span>
                                            <button 
                                                onClick={() => followMutation.mutate({ userId: post.author?._id, isFollowing: post.author?.isFollowing })}
                                                className={`group text-[13px] font-bold transition-all ${post.author?.isFollowing ? 'text-gray-500 hover:text-red-500' : 'text-blue-500 hover:text-blue-700'}`}
                                                disabled={followMutation.isPending}
                                            >
                                                <span className={post.author?.isFollowing ? 'group-hover:hidden' : ''}>{post.author?.isFollowing ? 'Following' : 'Follow'}</span>
                                                {post.author?.isFollowing && <span className="hidden group-hover:inline">Unfollow</span>}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isAuthor && (
                                <div className="relative">
                                    <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-gray-900 hover:text-gray-500 transition-colors">
                                        <MoreHorizontal size={20} />
                                    </button>
                                    {showMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1 overflow-hidden">
                                                <button onClick={() => navigate(`/edit-post/${id}`)} className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2"><Edit size={16} /> Edit</button>
                                                <button onClick={async () => {
                                                    await api.put(`/posts/${id}`, { isArchived: !post.isArchived });
                                                    queryClient.invalidateQueries({ queryKey: ['post', id] });
                                                    toast.success(post.isArchived ? 'Unarchived' : 'Archived');
                                                    setShowMenu(false);
                                                }} className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2">
                                                    <Archive size={16} /> {post.isArchived ? 'Unarchive' : 'Archive'}
                                                </button>
                                                <button onClick={async () => {
                                                    await api.put(`/posts/${id}`, { hideLikes: !post.hideLikes });
                                                    queryClient.invalidateQueries({ queryKey: ['post', id] });
                                                    toast.success(post.hideLikes ? 'Likes shown' : 'Likes hidden');
                                                    setShowMenu(false);
                                                }} className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2">
                                                    {post.hideLikes ? <Eye size={16} /> : <EyeOff size={16} />}
                                                    {post.hideLikes ? 'Show Likes' : 'Hide Likes'}
                                                </button>
                                                <div className="border-t border-gray-100 my-1"></div>
                                                <button onClick={async () => {
                                                    if (window.confirm('Delete this post?')) {
                                                        await api.delete(`/posts/${id}`);
                                                        toast.success('Deleted');
                                                        navigate('/');
                                                    }
                                                }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Scrollable Body (Caption + Comments) */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {/* Post Caption/Content */}
                            <div className="flex items-start space-x-3 mb-6">
                                <Link to={`/profile/${post.author?._id}`} className="shrink-0 mt-1">
                                    <img src={formatImageUrl(post.author?.profilePic)} alt={post.author?.username} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                                </Link>
                                <div>
                                    <h1 className="text-[14px] font-bold text-gray-900 leading-snug mb-1">{post.title}</h1>
                                    <div className="text-[14px] text-gray-900 leading-[1.5] whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/@([a-zA-Z0-9_]+)/g, '<a href="/profile/$1" style="color: #00376b; font-weight: 600; text-decoration: none;">@$1</a>') }} />
                                    {!post.image && (
                                        <p className="text-[12px] text-gray-500 mt-2">{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }).toUpperCase() : 'RECENTLY'}</p>
                                    )}
                                </div>
                            </div>

                            {/* Comments List */}
                            <div className="space-y-5">
                                {commentsLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
                                ) : comments.length === 0 ? (
                                    <div className="text-center text-gray-500 text-[14px] py-10 font-semibold">No comments yet.<br/><span className="font-normal text-sm">Start the conversation.</span></div>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment._id} className="flex space-x-3 group">
                                            <Link to={`/profile/${comment.user?._id}`} className="shrink-0">
                                                <img src={formatImageUrl(comment.user?.profilePic)} alt={comment.user?.username} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                                            </Link>
                                            <div className="flex-1 pt-0.5">
                                                <p className="text-[14px] leading-[1.3]">
                                                    <Link to={`/profile/${comment.user?._id}`} className="font-semibold text-gray-900 hover:text-gray-500 mr-2">
                                                        {comment.user?.username}
                                                    </Link>
                                                    <span className="text-gray-900" dangerouslySetInnerHTML={{ __html: (comment.text || '').replace(/@([a-zA-Z0-9_]+)/g, '<a href="/profile/$1" style="color: #00376b; font-weight: 600; text-decoration: none;">@$1</a>') }} />
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[12px] text-gray-500">{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false }).replace('about ', '') : 'just now'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 3. Footer (Action Bar + Add Comment) */}
                        <div className="bg-white shrink-0 border-t border-gray-200">
                            {/* Actions */}
                            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => likeMutation.mutate({ postId: id, isCurrentlyLiked: isLiked })} className="hover:opacity-50 transition-opacity">
                                        <Heart size={26} className={isLiked ? "fill-red-500 text-red-500" : "text-gray-900"} />
                                    </button>
                                    <button onClick={() => document.getElementById('comment-input')?.focus()} className="hover:opacity-50 transition-opacity text-gray-900">
                                        <MessageCircle size={26} className="transform -scale-x-100" />
                                    </button>
                                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }} className="hover:opacity-50 transition-opacity text-gray-900">
                                        <Share2 size={26} />
                                    </button>
                                </div>
                                <button onClick={() => bookmarkMutation.mutate({ postId: id, isCurrentlyBookmarked: isBookmarked })} className="hover:opacity-50 transition-opacity text-gray-900">
                                    <Bookmark size={26} className={isBookmarked ? "fill-gray-900 text-gray-900" : "text-gray-900"} />
                                </button>
                            </div>

                            {/* Likes info */}
                            <div className="px-4 pb-3">
                                {((!post.hideLikes || isAuthor) && likesCount > 0) && (
                                    <span className="text-[14px] font-semibold text-gray-900 cursor-pointer">{likesCount} likes</span>
                                )}
                                {post.image && (
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) : 'RECENTLY'} AGO</p>
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="px-4 py-3 border-t border-gray-200">
                                {user ? (
                                    <form onSubmit={(e) => { 
                                        e.preventDefault(); 
                                        if (!commentText.trim()) return;
                                        commentMutation.mutate(commentText); 
                                        setCommentText(''); // Zero-latency synchronous clear
                                    }} className="flex items-center">
                                        <input 
                                            id="comment-input" 
                                            type="text" 
                                            value={commentText} 
                                            onChange={(e) => setCommentText(e.target.value)} 
                                            placeholder="Add a comment..." 
                                            className="w-full bg-transparent outline-none text-[14px] placeholder-gray-500 text-gray-900" 
                                            disabled={commentMutation.isPending} 
                                            autoComplete="off"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={commentMutation.isPending || !commentText.trim()} 
                                            className="text-blue-500 hover:text-blue-900 font-semibold text-[14px] disabled:opacity-50 transition-colors ml-2"
                                        >
                                            Post
                                        </button>
                                    </form>
                                ) : (
                                    <div className="text-[14px] text-gray-500">
                                        <Link to="/login" className="text-blue-500 font-semibold hover:underline">Log in</Link> to like or comment.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Custom scrollbar styles */}
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 0px;
                    background: transparent;
                }
            `}</style>
        </div>
    );
};

export default PostDetail;
