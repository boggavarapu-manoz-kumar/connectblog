import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ArrowLeft, Heart, MessageCircle, Share2, Loader2, MoreHorizontal, Edit, Trash2, Archive, EyeOff, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [showMenu, setShowMenu] = useState(false);
    const [commentText, setCommentText] = useState('');

    // Scroll States
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const progress = (window.scrollY / totalHeight) * 100;
                setScrollProgress(progress);
            }
            setShowBackToTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
    const likeMutation = useMutation({
        mutationFn: async (isCurrentlyLiked) => {
            const endpoint = isCurrentlyLiked ? `/posts/${id}/unlike` : `/posts/${id}/like`;
            return api.put(endpoint);
        },
        onMutate: async (isCurrentlyLiked) => {
            const userId = user?._id || user?.id;
            if (!userId) return;

            // 1. Cancel all potentially conflicting queries
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['post', id] }),
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['profile-posts'] }),
                queryClient.cancelQueries({ queryKey: ['profile-private'] })
            ]);

            // 2. Comprehensive Snapshots for rollback
            const snapshots = {
                singlePost: queryClient.getQueryData(['post', id]),
                feeds: queryClient.getQueriesData({ queryKey: ['posts-feed'] }),
                profilePosts: queryClient.getQueriesData({ queryKey: ['profile-posts'] }),
                profilePrivate: queryClient.getQueriesData({ queryKey: ['profile-private'] })
            };

            const updatePostLikes = (p) => {
                if (!p || (p._id !== id && id !== p.id)) return p;
                const newLikes = isCurrentlyLiked
                    ? (p.likes || []).filter(uid => uid.toString() !== userId.toString())
                    : [...(p.likes || []), userId];
                return { ...p, likes: newLikes };
            };

            // Optimistic Update: SINGLE POST
            queryClient.setQueryData(['post', id], old => {
                if (!old) return old;
                return updatePostLikes(old);
            });

            // Optimistic Update: FEED
            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(updatePostLikes) || []
                    }))
                };
            });

            // Optimistic Update: PROFILE POSTS
            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostLikes) };
            });

            // Optimistic Update: PRIVATE DATA
            queryClient.setQueriesData({ queryKey: ['profile-private'] }, old => {
                if (!old) return old;
                return {
                    ...old,
                    archived: old.archived?.map(updatePostLikes) || [],
                    saved: old.saved?.map(updatePostLikes) || []
                };
            });

            return { snapshots };
        },
        onError: (err, variables, context) => {
            // Precise Rollback using snapshots
            if (context?.snapshots?.singlePost) {
                queryClient.setQueryData(['post', id], context.snapshots.singlePost);
            }
            if (context?.snapshots?.feeds) {
                context.snapshots.feeds.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.snapshots?.profilePosts) {
                context.snapshots.profilePosts.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            toast.error("Sync failed");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['post', id] });
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
            queryClient.invalidateQueries({ queryKey: ['profile-private'] });
        }
    });

    // Comment Mutation
    const commentMutation = useMutation({
        mutationFn: async (text) => {
            const { data } = await api.post(`/posts/${id}/comments`, { text });
            return data;
        },
        onSuccess: (newComment) => {
            queryClient.setQueryData(['post-comments', id], old => {
                const oldComments = Array.isArray(old) ? old : [];
                return [newComment, ...oldComments];
            });
            setCommentText(''); // Instant UI feedback
            toast.success('Comment added!');

            // Sync the comment count universally
            queryClient.invalidateQueries({ queryKey: ['post', id] });
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
            queryClient.invalidateQueries({ queryKey: ['profile-private'] });
        },
        onError: () => toast.error('Failed to add comment'),
    });

    const handleBack = () => {
        if (window.history.length > 2) navigate(-1);
        else navigate('/');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f3f2ef]">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
        );
    }

    if (error || !post) {
        toast.error('Post not found');
        navigate('/');
        return null;
    }

    const isAuthor = user?._id === (post.author?._id || post.author);
    const isLiked = user && post.likes.includes(user._id);
    const likesCount = post.likes.length;

    return (
        <div className="min-h-screen bg-[#f3f2ef] py-6 sm:py-8 font-sans">
            <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-gray-100">
                <div className="h-full bg-primary-600 transition-all duration-150 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]" style={{ width: `${scrollProgress}%` }} />
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-4">
                    <button onClick={handleBack} className="group flex items-center space-x-2 text-gray-500 hover:text-primary-600 transition-all duration-200 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-x-1">
                        <ArrowLeft size={18} className="group-hover:animate-pulse" />
                        <span>Back</span>
                    </button>
                </div>

                <article className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden break-words">
                    <div className="p-4 sm:p-5 flex items-start justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <Link to={`/profile/${post.author._id}`} className="flex-shrink-0 relative">
                                <img src={post.author.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`} alt={post.author.username} className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover border border-gray-100 shadow-sm" />
                            </Link>
                            <div className="flex flex-col">
                                <Link to={`/profile/${post.author._id}`} className="font-semibold text-[15px] sm:text-base text-gray-900 hover:text-primary-600 transition-colors leading-tight flex items-center gap-1.5">
                                    {post.author.username}
                                    {post.author.pronouns && <span className="text-xs font-normal text-gray-500 hidden sm:inline-block">({post.author.pronouns})</span>}
                                </Link>
                                <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5 max-w-[200px] sm:max-w-none truncate">{post.author.bio || 'ConnectBlog Member'}</p>
                                <div className="flex items-center text-xs text-gray-500 mt-0.5 space-x-1">
                                    <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        </div>
                        {isAuthor && (
                            <div className="relative">
                                <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-2 overflow-hidden">
                                            <button onClick={() => navigate(`/edit-post/${id}`)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                <Edit size={16} /> Edit Post
                                            </button>
                                            <button onClick={async () => {
                                                await api.put(`/posts/${id}`, { isArchived: !post.isArchived });
                                                queryClient.invalidateQueries({ queryKey: ['post', id] });
                                                toast.success(post.isArchived ? 'Post unarchived' : 'Post archived');
                                                setShowMenu(false);
                                            }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                <Archive size={16} /> {post.isArchived ? 'Unarchive' : 'Archive'}
                                            </button>
                                            <button onClick={async () => {
                                                await api.put(`/posts/${id}`, { hideLikes: !post.hideLikes });
                                                queryClient.invalidateQueries({ queryKey: ['post', id] });
                                                toast.success(post.hideLikes ? 'Likes shown' : 'Likes hidden');
                                                setShowMenu(false);
                                            }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
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
                                            }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={16} /> Delete Post
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="px-4 sm:px-5 pb-3">
                        <h1 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-4 leading-snug">{post.title}</h1>
                        <div className="text-[14px] sm:text-[15px] text-gray-800 leading-[1.6] font-sans prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/@([a-zA-Z0-9_]+)/g, '<a href="/profile/$1" style="color: #0ea5e9; font-weight: 700; text-decoration: none;">@$1</a>') }} />
                    </div>

                    {post.image && (
                        <div className="w-full bg-[#f8f9fa] border-y border-gray-100 mt-2">
                            <img src={post.image} alt={post.title} className="w-full max-h-[600px] object-contain" loading="lazy" />
                        </div>
                    )}

                    <div className="px-4 py-3 flex items-center justify-between text-[13px] text-gray-500 border-b border-gray-100">
                        <div className="flex items-center gap-1.5">
                            {((!post.hideLikes || isAuthor) && likesCount > 0) && (
                                <span className="hover:text-blue-600 hover:underline cursor-pointer">{likesCount} likes</span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <span className="hover:text-blue-600 hover:underline cursor-pointer">{comments.length} comments</span>
                        </div>
                    </div>

                    <div className="px-2 py-1 flex items-center justify-between border-b border-gray-100 sm:px-4">
                        <button onClick={() => likeMutation.mutate(isLiked)} className={`flex flex-1 items-center justify-center space-x-2 py-3 px-2 rounded-lg font-medium text-[14px] transition-colors ${isLiked ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <Heart size={20} className={isLiked ? "fill-blue-600" : ""} />
                            <span className="hidden sm:block">Like</span>
                        </button>
                        <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex flex-1 items-center justify-center space-x-2 py-3 px-2 rounded-lg font-medium text-[14px] text-gray-500 hover:bg-gray-100 transition-colors">
                            <MessageCircle size={20} />
                            <span className="hidden sm:block">Comment</span>
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }} className="flex flex-1 items-center justify-center space-x-2 py-3 px-2 rounded-lg font-medium text-[14px] text-gray-500 hover:bg-gray-100 transition-colors">
                            <Share2 size={20} />
                            <span className="hidden sm:block">Share</span>
                        </button>
                    </div>

                    <div className="p-4 sm:p-5 bg-white space-y-5">
                        {user ? (
                            <form onSubmit={(e) => { e.preventDefault(); commentMutation.mutate(commentText); }} className="flex gap-3 items-start">
                                <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0ea5e9&color=fff&bold=true`} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
                                <div className="flex-1 border border-gray-300 rounded-full flex items-center pl-4 pr-1.5 focus-within:border-gray-500 focus-within:shadow-sm overflow-hidden transition-all h-auto min-h-[46px]">
                                    <input id="comment-input" type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="w-full bg-transparent outline-none text-[14px] py-1.5" disabled={commentMutation.isPending} />
                                    <button type="submit" disabled={commentMutation.isPending || !commentText.trim()} className="text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 px-4 py-1.5 font-semibold text-sm rounded-full transition-colors ml-2">Post</button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200"><p className="text-gray-600 text-sm">Please log in to join the conversation.</p></div>
                        )}

                        <div className="space-y-4 pt-4">
                            {commentsLoading ? <div className="flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div> : comments.map((comment) => (
                                <div key={comment._id} className="flex space-x-3 group">
                                    <Link to={`/profile/${comment.user?._id}`}>
                                        <img src={comment.user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=0ea5e9&color=fff&bold=true`} alt={comment.user?.username || 'User'} className="h-10 w-10 rounded-full object-cover border border-gray-200 mt-1 shadow-sm" />
                                    </Link>
                                    <div className="flex-1 bg-gray-100 rounded-tr-xl rounded-b-xl rounded-bl-sm p-3 group-hover:bg-gray-200 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <Link to={`/profile/${comment.user?._id}`} className="font-semibold text-gray-900 text-[13px] hover:text-blue-600 transition-colors leading-tight">{comment.user?.username || 'User'}</Link>
                                                <p className="text-gray-500 text-[11px] truncate max-w-[200px] mb-1">{comment.user?.bio}</p>
                                            </div>
                                            <span className="text-[11px] text-gray-500 font-medium">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })}</span>
                                        </div>
                                        <p className="text-gray-800 text-[13.5px] whitespace-pre-wrap mt-0.5 leading-snug" dangerouslySetInnerHTML={{ __html: (comment.text || '').replace(/@([a-zA-Z0-9_]+)/g, '<a href="/profile/$1" style="color: #0ea5e9; font-weight: 700; text-decoration: none;">@$1</a>') }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </div>

            {showBackToTop && (
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-8 right-8 p-3 bg-white text-primary-600 rounded-2xl shadow-2xl border border-gray-100 hover:bg-primary-50 transition-all duration-300 transform hover:-translate-y-1 z-40 animate-in fade-in zoom-in duration-300">
                    <ArrowLeft className="w-6 h-6 transform rotate-90" />
                </button>
            )}
        </div>
    );
};

export default PostDetail;
