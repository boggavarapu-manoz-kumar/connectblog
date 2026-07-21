import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useToggleLike = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ postId, isCurrentlyLiked }) => {
            const endpoint = isCurrentlyLiked ? `/posts/${postId}/unlike` : `/posts/${postId}/like`;
            return api.put(endpoint);
        },
        onMutate: async ({ postId, isCurrentlyLiked }) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['post', postId] }),
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['profile-posts'] }),
                queryClient.cancelQueries({ queryKey: ['profile-private'] })
            ]);

            const snapshots = {
                singlePost: queryClient.getQueryData(['post', postId]),
                feeds: queryClient.getQueriesData({ queryKey: ['posts-feed'] }),
                profilePosts: queryClient.getQueriesData({ queryKey: ['profile-posts'] }),
                profilePrivate: queryClient.getQueriesData({ queryKey: ['profile-private'] })
            };

            const updatePostLikes = (p) => {
                if (!p || (p._id !== postId && postId !== p.id)) return p;
                
                const currentIsLiked = p.isLiked !== undefined ? p.isLiked : false;
                const currentCount = p.likeCount !== undefined ? p.likeCount : 0;
                
                const newIsLiked = !isCurrentlyLiked;
                const newCount = newIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

                return { ...p, isLiked: newIsLiked, likeCount: newCount };
            };

            queryClient.setQueryData(['post', postId], old => (old ? updatePostLikes(old) : old));

            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, (old) => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(updatePostLikes) || []
                    }))
                };
            });

            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostLikes) };
            });

            queryClient.setQueriesData({ queryKey: ['profile-private'] }, old => {
                if (!old) return old;
                return {
                    ...old,
                    savedPosts: old.savedPosts?.map(updatePostLikes) || [],
                    likedPosts: old.likedPosts?.map(updatePostLikes) || []
                };
            });

            return { snapshots };
        },
        onError: (err, variables, context) => {
            if (context?.snapshots) {
                queryClient.setQueryData(['post', variables.postId], context.snapshots.singlePost);
                context.snapshots.feeds.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
                context.snapshots.profilePosts.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
                context.snapshots.profilePrivate.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            toast.error("Failed to update like status");
        },
        onSettled: (data, error, variables) => {
            queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
        }
    });
};
