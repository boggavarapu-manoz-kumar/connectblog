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

    // Like mutation
    const likeMutation = useMutation({
        mutationFn: async ({ liked }) => {
            const endpoint = liked ? `/posts/${post._id}/unlike` : `/posts/${post._id}/like`;
            return api.put(endpoint);
        },
        onMutate: async ({ liked }) => {
            const userId = user?._id || user?.id;
            if (!userId) return;

            // 1. Cancel all potentially conflicting queries
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['post', post._id] }),
                queryClient.cancelQueries({ queryKey: ['profile-posts'] }),
                queryClient.cancelQueries({ queryKey: ['profile-private'] })
            ]);

            // 2. Comprehensive Snapshots for rollback
            const snapshots = {
                feeds: queryClient.getQueriesData({ queryKey: ['posts-feed'] }),
                singlePost: queryClient.getQueryData(['post', post._id]),
                profilePosts: queryClient.getQueriesData({ queryKey: ['profile-posts'] }),
                profilePrivate: queryClient.getQueriesData({ queryKey: ['profile-private'] })
            };

            const updatePostLikes = (p) => {
                if (p._id !== post._id && p.id !== post._id) return p;
                const newLikes = liked
                    ? (p.likes || []).filter(id => id.toString() !== userId.toString())
                    : [...(p.likes || []), userId];
                return { ...p, likes: newLikes };
            };

            // 3. Optimistic Update: FEED(S) - Universal Partial Match
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

            // 4. Optimistic Update: SINGLE POST
            queryClient.setQueryData(['post', post._id], old => {
                if (!old) return old;
                return updatePostLikes(old);
            });

            // 5. Optimistic Update: PROFILE POSTS (Global)
            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostLikes) };
            });

            // 6. Optimistic Update: PRIVATE DATA
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
            if (context?.snapshots?.singlePost) {
                queryClient.setQueryData(['post', post._id], context.snapshots.singlePost);
            }
            toast.error("Sync failed");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['post', post._id] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
            queryClient.invalidateQueries({ queryKey: ['profile-private'] });
        }
    });

    // Bookmark mutation
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

    // Comment mutation
    const commentMutation = useMutation({
        mutationFn: async (text) => {
            const { data } = await api.post(`/posts/${post._id}/comments`, { text });
            return data;
        },
        onMutate: async (text) => {
            const userId = user?._id || user?.id;
            if (!userId) return;

            // 1. Cancel queries
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['profile-posts'] })
            ]);

            // 2. Snapshot
            const snapshots = {
                feeds: queryClient.getQueriesData({ queryKey: ['posts-feed'] }),
                profilePosts: queryClient.getQueriesData({ queryKey: ['profile-posts'] })
            };

            // Fake user object for immediate UI render
            const tempComment = {
                _id: Date.now().toString(),
                text: text,
                user: {
                    _id: user._id,
                    username: user.username,
                    profilePic: user.profilePic
                },
                createdAt: new Date().toISOString()
            };

            const updatePostComments = (p) => {
                if (p._id !== post._id && p.id !== post._id) return p;
                return { ...p, comments: [...(p.comments || []), tempComment] };
            };

            // 3. Optimistic Update: FEED
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

            // 4. Optimistic Update: PROFILE
            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostComments) };
            });

            return { snapshots };
        },
        onError: (err, variables, context) => {
            // Precise Rollback
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
            toast.error('Failed to add comment');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
        }
    });

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !user) return;

        commentMutation.mutate(commentText);
        setCommentText(''); // Clear instantly for zero-latency UX
    };

    // Delete comment mutation
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId) => {
            await api.delete(`/posts/${post._id}/comments/${commentId}`);
            return commentId;
        },
        onMutate: async (commentId) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['profile-posts'] })
            ]);

            const snapshots = {
                feeds: queryClient.getQueriesData({ queryKey: ['posts-feed'] }),
                profilePosts: queryClient.getQueriesData({ queryKey: ['profile-posts'] })
            };

            const removeComment = (p) => {
                if (p._id !== post._id && p.id !== post._id) return p;
                return { ...p, comments: (p.comments || []).filter(c => (c._id || c) !== commentId) };
            };

            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(removeComment) || []
                    }))
                };
            });

            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(removeComment) };
            });

            return { snapshots };
        },
        onError: (err, variables, context) => {
            if (context?.snapshots?.feeds) context.snapshots.feeds.forEach(([key, data]) => queryClient.setQueryData(key, data));
            if (context?.snapshots?.profilePosts) context.snapshots.profilePosts.forEach(([key, data]) => queryClient.setQueryData(key, data));
            toast.error('Failed to delete comment');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
        }
    });

    // Delete mutation
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

    // Archive mutation
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

    const prefetchPost = () => {
        queryClient.prefetchQuery({
            queryKey: ['post', post._id],
            queryFn: async () => {
                const { data } = await api.get(`/posts/${post._id}`);
                return data;
            },
            staleTime: 1000 * 60 * 5, // 5 minutes
        });
    };

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

            <Link
                to={`/posts/${post._id}`}
                onMouseEnter={prefetchPost}
                className="block group"
            >
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

            {
                showComments && (
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

                        <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {post.comments?.length > 0 ? (
                                post.comments.map((comment) => (
                                    <div key={comment._id} className="flex space-x-3">
                                        <Link to={`/profile/${comment.user?._id || comment.user}`}>
                                            <img
                                                src={comment.user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=efefef&color=333&bold=true`}
                                                alt={comment.user?.username}
                                                className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                            />
                                        </Link>
                                        <div className="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <Link to={`/profile/${comment.user?._id || comment.user}`} className="text-sm font-bold text-gray-900 hover:text-primary-600">
                                                    {comment.user?.username}
                                                </Link>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 font-medium lowercase">
                                                        {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'just now'}
                                                    </span>
                                                    {(user?._id === (comment.user?._id || comment.user) || isAuthor) && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm("Delete this comment?")) {
                                                                    deleteCommentMutation.mutate(comment._id);
                                                                }
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                            title="Delete comment"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed font-sans">
                                                {comment.text}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-gray-400 text-sm font-medium italic">No comments yet. Be the first to start the conversation!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </article >
    );
};

export default PostCard;
