import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useFollowUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, isFollowing }) => {
            const endpoint = isFollowing ? `/users/${userId}/unfollow` : `/users/${userId}/follow`;
            return api.put(endpoint);
        },
        onMutate: async ({ userId, isFollowing }) => {
            // Cancel any outgoing refetches so they don't overwrite our optimistic update
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['profile'] }),
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['profile-posts'] }),
                queryClient.cancelQueries({ queryKey: ['explore-trending'] }),
                queryClient.cancelQueries({ queryKey: ['post'] })
            ]);

            // Snapshot the previous values
            const snapshots = {
                profiles: queryClient.getQueriesData({ queryKey: ['profile'] }),
                feeds: queryClient.getQueriesData({ queryKey: ['posts-feed'] }),
                profilePosts: queryClient.getQueriesData({ queryKey: ['profile-posts'] }),
                explore: queryClient.getQueriesData({ queryKey: ['explore-trending'] }),
                singlePosts: queryClient.getQueriesData({ queryKey: ['post'] })
            };

            // Helper to update a post's author following status
            const updatePostAuthorFollow = (p) => {
                if (!p || !p.author) return p;
                const authorId = p.author._id || p.author;
                if (authorId.toString() !== userId.toString()) return p;
                return { ...p, isFollowing: !isFollowing };
            };

            // 1. Optimistic Update: PROFILES
            queryClient.setQueriesData({ queryKey: ['profile'] }, (old) => {
                if (!old) return old;
                if (old._id?.toString() === userId.toString()) {
                    // Updating the target user's profile
                    return {
                        ...old,
                        isFollowing: !isFollowing,
                        followerCount: isFollowing 
                            ? Math.max(0, (old.followerCount || 0) - 1)
                            : (old.followerCount || 0) + 1
                    };
                }
                return old;
            });

            // 2. Optimistic Update: FEEDS
            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, (old) => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(updatePostAuthorFollow) || []
                    }))
                };
            });

            // 3. Optimistic Update: EXPLORE TRENDING
            queryClient.setQueriesData({ queryKey: ['explore-trending'] }, (old) => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostAuthorFollow) };
            });

            // 4. Optimistic Update: PROFILE POSTS
            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, (old) => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostAuthorFollow) };
            });

            // 5. Optimistic Update: SINGLE POSTS
            queryClient.setQueriesData({ queryKey: ['post'] }, (old) => {
                if (!old) return old;
                return updatePostAuthorFollow(old);
            });

            return { snapshots };
        },
        onError: (err, variables, context) => {
            // Rollback to snapshots on error
            if (context?.snapshots) {
                context.snapshots.profiles.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
                context.snapshots.feeds.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
                context.snapshots.profilePosts.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
                context.snapshots.explore.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
                context.snapshots.singlePosts.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
            }
            toast.error("Action failed. Please try again.");
        },
        onSettled: () => {
            // Refetch all to ensure perfect sync in background
            queryClient.invalidateQueries({ queryKey: ['profile'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['followers'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['following'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['users-search'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['post'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['posts-feed'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['explore-trending'], exact: false });
        }
    });
};
