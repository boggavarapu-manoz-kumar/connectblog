import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useToggleBookmark } from '../../hooks/useToggleBookmark';
import { useFollowUser } from '../../hooks/useFollowUser';
import api from '../../services/api';
import { Heart, Bookmark, UserPlus, UserCheck, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

const ExploreCard = ({ post }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { mutate: toggleBookmark } = useToggleBookmark();
    const { mutate: followUser } = useFollowUser();

    const isAuthor = user?._id === (post.author?._id || post.author);
    const isLiked = post?.isLiked || false;
    const likesCount = post?.likeCount || 0;
    const isFollowing = post.isFollowing;

    // Like mutation (identical optimistic logic as PostCard)
    const likeMutation = useMutation({
        mutationFn: async ({ liked }) => {
            const endpoint = liked ? `/posts/${post._id}/unlike` : `/posts/${post._id}/like`;
            return api.put(endpoint);
        },
        onMutate: async ({ liked }) => {
            const userId = user?._id || user?.id;
            if (!userId) return;

            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['explore-trending'] }),
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['profile-posts'] })
            ]);

            const snapshots = {
                explore: queryClient.getQueriesData({ queryKey: ['explore-trending'] })
            };

            const updatePostLikes = (p) => {
                if (p._id !== post._id && p.id !== post._id) return p;
                const currentIsLiked = p.isLiked !== undefined ? p.isLiked : false;
                const currentCount = p.likeCount !== undefined ? p.likeCount : 0;
                const newIsLiked = !liked;
                const newCount = newIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
                return { ...p, isLiked: newIsLiked, likeCount: newCount };
            };

            queryClient.setQueriesData({ queryKey: ['explore-trending'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostLikes) };
            });
            // Update feed too so it's perfectly in sync
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

            return { snapshots };
        },
        onError: (err, variables, context) => {
            if (context?.snapshots?.explore) {
                context.snapshots.explore.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['explore-trending'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['posts-feed'], exact: false });
        }
    });

    const handleLike = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error("Please login to like posts");
            return;
        }
        likeMutation.mutate({ liked: isLiked });
    };

    const handleBookmark = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error("Please login to save posts");
            return;
        }
        toggleBookmark({ postId: post._id, isCurrentlyBookmarked: post.isBookmarked });
    };

    const handleFollow = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error("Please login to follow users");
            return;
        }
        followUser({ userId: post.author._id || post.author, isFollowing });
    };

    const hasImage = !!post.image;

    return (
        <div
            onClick={() => navigate(`/posts/${post._id}`)}
            className="group relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl bg-gray-100 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 block"
        >
            {/* Background Content */}
            {hasImage ? (
                <img
                    src={post.image}
                    alt={post.title}
                    width="600"
                    height="600"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 justify-center items-center text-center transition-transform duration-700 group-hover:scale-105">
                    {post.hashtags && post.hashtags[0] && (
                        <div className="text-[10px] font-black text-white/80 flex items-center gap-1 mb-2 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md">
                            <Hash size={10} /> {post.hashtags[0]}
                        </div>
                    )}
                    <h3 className="text-white font-black text-xl sm:text-2xl leading-snug line-clamp-4 drop-shadow-md">
                        {post.title}
                    </h3>
                </div>
            )}

            {/* Hover Overlay (Instagram Style) */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex flex-col justify-between p-4 sm:p-5 opacity-0 group-hover:opacity-100 sm:opacity-0 touch:opacity-100">
                
                {/* Top Section: Follow Button */}
                <div className="flex justify-end">
                    {!isAuthor && (
                        <button
                            aria-label={isFollowing ? "Unfollow user" : "Follow user"}
                            onClick={handleFollow}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all transform active:scale-95 shadow-md ${
                                isFollowing 
                                ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md' 
                                : 'bg-primary-700 hover:bg-primary-800 text-white'
                            }`}
                        >
                            {isFollowing ? (
                                <>
                                    <UserCheck size={14} />
                                    <span>Following</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={14} />
                                    <span>Follow</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Bottom Section: Author & Actions */}
                <div className="flex items-end justify-between translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    
                    {/* Author Info */}
                    <div 
                        className="flex items-center gap-2 max-w-[60%] cursor-pointer"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/profile/${post.author.username}`);
                        }}
                    >
                        <img
                            src={post.author.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`}
                            width="40"
                            height="40"
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/80 shadow-md object-cover"
                            alt={post.author.username}
                        />
                        <span className="text-white font-bold text-sm truncate drop-shadow-md hidden sm:block">
                            @{post.author.username}
                        </span>
                    </div>

                    {/* Like & Bookmark Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            aria-label={isLiked ? "Unlike post" : "Like post"}
                            onClick={handleLike}
                            className="flex items-center gap-1.5 text-white hover:text-red-400 transition-colors"
                        >
                            <Heart
                                size={22}
                                className={isLiked ? 'fill-red-500 text-red-500 drop-shadow-md scale-110 transition-transform' : 'drop-shadow-md'}
                                strokeWidth={isLiked ? 2 : 2.5}
                            />
                            <span className="font-bold text-sm drop-shadow-md">{likesCount > 0 ? likesCount : ''}</span>
                        </button>

                        <button
                            aria-label={post.isBookmarked ? "Remove bookmark" : "Bookmark post"}
                            onClick={handleBookmark}
                            className="text-white hover:text-indigo-300 transition-colors"
                        >
                            <Bookmark
                                size={22}
                                className={post.isBookmarked ? 'fill-indigo-400 text-indigo-400 drop-shadow-md' : 'drop-shadow-md'}
                                strokeWidth={post.isBookmarked ? 2 : 2.5}
                            />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ExploreCard;
