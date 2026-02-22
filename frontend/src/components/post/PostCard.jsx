import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Edit, Trash2, Archive, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PostCard = ({ post, onPostUpdate }) => {
    const { user, updateUser } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    const isAuthor = user?._id === (post.author?._id || post.author);
    const isLiked = post.likes?.includes(user?._id);
    const likesCount = post.likes?.length || 0;
    const isBookmarked = user?.bookmarks?.includes(post._id);

    // 🚀 High-Performance Mutation: LIKE
    const likeMutation = useMutation({
        mutationFn: async ({ liked }) => {
            const endpoint = liked ? `/posts/${post._id}/unlike` : `/posts/${post._id}/like`;
            return api.put(endpoint);
        },
        onMutate: async ({ liked }) => {
            await queryClient.cancelQueries({ queryKey: ['posts-feed'] });
            await queryClient.cancelQueries({ queryKey: ['post', post._id] });

            const previousFeed = queryClient.getQueryData(['posts-feed']);

            // Optimistically update all instances of this post in the feed cache
            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(p => {
                            if (p._id === post._id) {
                                const newLikes = liked
                                    ? p.likes.filter(id => id !== user?._id)
                                    : [...(p.likes || []), user?._id];
                                return { ...p, likes: newLikes };
                            }
                            return p;
                        }) || []
                    }))
                };
            });

            return { previousFeed };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['posts-feed'], context.previousFeed);
            toast.error("Action failed");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['post', post._id] });
        }
    });

    // 🚀 High-Performance Mutation: BOOKMARK
    const bookmarkMutation = useMutation({
        mutationFn: async () => {
            return api.put(`/users/bookmarks/${post._id}`);
        },
        onMutate: async () => {
            const previousUser = { ...user };
            const newBookmarks = isBookmarked
                ? user.bookmarks.filter(id => id !== post._id)
                : [...(user.bookmarks || []), post._id];

            updateUser({ ...user, bookmarks: newBookmarks });
            return { previousUser };
        },
        onError: (err, variables, context) => {
            updateUser(context.previousUser);
            toast.error("Failed to bookmark");
        },
        onSuccess: (res) => {
            toast.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['profile-private'] });
        }
    });

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !user) return;

        try {
            await api.post(`/posts/${post._id}/comments`, { text: commentText });
            setCommentText('');
            toast.success('Comment added!');
            if (onPostUpdate) onPostUpdate();
            queryClient.invalidateQueries({ queryKey: ['post-comments', post._id] });
        } catch (error) {
            toast.error('Failed to add comment');
        }
    };

    // 🚀 High-Performance Mutation: DELETE (Optimistic & Instant)
    const deleteMutation = useMutation({
        mutationFn: async () => {
            return api.delete(`/posts/${post._id}`);
        },
        onMutate: async () => {
            const authorId = (post.author?._id || post.author || '').toString();
            if (authorId === '[object Object]') {
                console.error('Invalid authorId detected in deletion');
            }

            // Cancel all relevant queries
            await queryClient.cancelQueries({ queryKey: ['posts-feed'] });
            await queryClient.cancelQueries({ queryKey: ['profile-posts', authorId] });
            await queryClient.cancelQueries({ queryKey: ['profile-private', authorId] });

            const previousFeed = queryClient.getQueryData(['posts-feed']);
            const previousProfilePosts = queryClient.getQueryData(['profile-posts', authorId]);
            const previousPrivateData = queryClient.getQueryData(['profile-private', authorId]);

            // 1. Instant Feed Update
            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.filter(p => p._id !== post._id) || []
                    }))
                };
            });

            // 2. Instant Profile Update
            queryClient.setQueryData(['profile-posts', authorId], old => {
                if (!old) return old;
                return {
                    ...old,
                    posts: old.posts?.filter(p => p._id !== post._id) || []
                };
            });

            // 3. Instant Private/Saved Update
            queryClient.setQueryData(['profile-private', authorId], old => {
                if (!old) return old;
                return {
                    ...old,
                    archived: old.archived?.filter(p => p._id !== post._id) || [],
                    saved: old.saved?.filter(p => p._id !== post._id) || []
                };
            });

            toast.success('Post removed permanently');
            return { previousFeed, previousProfilePosts, previousPrivateData, authorId };
        },
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: ['profile', context.authorId] });
            if (onPostUpdate) onPostUpdate();
        },
        onError: (err, variables, context) => {
            if (context.previousFeed) queryClient.setQueryData(['posts-feed'], context.previousFeed);
            if (context.previousProfilePosts) queryClient.setQueryData(['profile-posts', context.authorId], context.previousProfilePosts);
            if (context.previousPrivateData) queryClient.setQueryData(['profile-private', context.authorId], context.previousPrivateData);
            toast.error('Sync failed. Please try again.');
        },
        onSettled: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts', context?.authorId] });
            queryClient.invalidateQueries({ queryKey: ['profile-private', context?.authorId] });
        }
    });

    // 🚀 High-Performance Mutation: ARCHIVE
    const archiveMutation = useMutation({
        mutationFn: async () => {
            return api.put(`/posts/${post._id}`, { isArchived: !post.isArchived });
        },
        onSuccess: () => {
            const authorId = post.author?._id || post.author;
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile', authorId] });
            queryClient.invalidateQueries({ queryKey: ['profile-private', authorId] });
            toast.success(post.isArchived ? 'Post unarchived' : 'Post archived');
            if (onPostUpdate) onPostUpdate();
            setShowMenu(false);
        },
        onError: () => {
            toast.error('Failed to update archive status');
        }
    });

    return (
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 hover:shadow-md transition-shadow duration-200">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Link to={`/profile/${post.author?._id || post.author}`}>
                        <img
                            src={post.author?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.username || 'User')}&background=0ea5e9&color=fff&bold=true`}
                            alt={post.author?.username}
                            className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm"
                        />
                    </Link>
                    <div>
                        <Link to={`/profile/${post.author?._id || post.author}`} className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                            {post.author?.username}
                        </Link>
                        <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            bookmarkMutation.mutate();
                        }}
                        className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Bookmark size={20} className={isBookmarked ? "fill-current" : ""} />
                    </button>

                    {isAuthor && (
                        <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 p-2 rounded-full hover:bg-gray-50 transition-colors">
                                <MoreHorizontal size={20} />
                            </button>
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <button onClick={() => navigate(`/edit-post/${post._id}`)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                            <Edit size={16} /> Edit Post
                                        </button>
                                        <button onClick={() => archiveMutation.mutate()} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                            <Archive size={16} /> {post.isArchived ? 'Unarchive' : 'Archive'}
                                        </button>
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (window.confirm('Delete post permanently?')) {
                                                    deleteMutation.mutate();
                                                }
                                                setShowMenu(false);
                                            }}
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

            <Link to={`/posts/${post._id}`} className="block group">
                <div className="px-4 pb-2">
                    <h2 className="text-[17px] font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors leading-snug">
                        {post.title}
                    </h2>
                    <div className="text-gray-700 text-[14px] leading-relaxed mb-3 font-sans prose prose-sm max-w-none prose-p:my-1">
                        <div
                            dangerouslySetInnerHTML={{
                                __html: (post.content?.length > 300
                                    ? post.content.substring(0, 300) + '...'
                                    : post.content || '').replace(/@([a-zA-Z0-9_]+)/g, '<a href="/profile/$1" style="color: #0ea5e9; font-weight: 700; text-decoration: none;">@$1</a>')
                            }}
                        />
                    </div>
                </div>

                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {post.hashtags.map((tag, index) => (
                            <span key={index} className="text-sm font-semibold text-primary-600 hover:underline">#{tag}</span>
                        ))}
                    </div>
                )}

                {post.image && (
                    <div className="w-full bg-[#f8f9fa] border-y border-gray-100 overflow-hidden relative">
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full max-h-[500px] object-cover sm:object-contain"
                            loading="lazy"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/1200x800.png?text=Content+Is+Available+But+Image+Failed+To+Load';
                                e.target.className = "w-full h-32 object-cover opacity-50 grayscale";
                            }}
                        />
                    </div>
                )}
            </Link>

            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => likeMutation.mutate({ liked: isLiked })}
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
                        <span className="font-medium text-sm">{post.comments?.length || 0}</span>
                    </button>
                </div>
            </div>

            {showComments && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-full hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                            Post
                        </button>
                    </form>
                </div>
            )}
        </article>
    );
};

export default PostCard;
