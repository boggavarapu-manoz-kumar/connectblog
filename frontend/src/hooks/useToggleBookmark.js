import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useToggleBookmark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ postId }) => {
            return api.put(`/users/bookmarks/${postId}`);
        },
        onMutate: async ({ postId, isCurrentlyBookmarked }) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['post', postId] }),
                queryClient.cancelQueries({ queryKey: ['posts-feed'] }),
                queryClient.cancelQueries({ queryKey: ['explore-trending'] }),
                queryClient.cancelQueries({ queryKey: ['profile-private'] })
            ]);

            const snapshots = {
                singlePost: queryClient.getQueryData(['post', postId]),
                feeds: queryClient.getQueriesData({ queryKey: ['posts-feed'] }),
                explore: queryClient.getQueriesData({ queryKey: ['explore-trending'] }),
                profilePrivate: queryClient.getQueryData(['profile-private'])
            };

            const updatePostBookmark = (p) => {
                if (!p || (p._id !== postId && postId !== p.id)) return p;
                return { ...p, isBookmarked: !isCurrentlyBookmarked };
            };

            queryClient.setQueryData(['post', postId], old => (old ? updatePostBookmark(old) : old));

            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, (old) => {
                if (!old || !old.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(updatePostBookmark) || []
                    }))
                };
            });

            queryClient.setQueriesData({ queryKey: ['explore-trending'] }, (old) => {
                if (!old || !old.posts) return old;
                return { ...old, posts: old.posts.map(updatePostBookmark) };
            });

            return { snapshots };
        },
        onError: (err, variables, context) => {
            if (context?.snapshots) {
                queryClient.setQueryData(['post', variables.postId], context.snapshots.singlePost);
                context.snapshots.feeds.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
                context.snapshots.explore.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            toast.error("Failed to update bookmark status");
        },
        onSuccess: (res, variables) => {
            const isSaved = res.data?.bookmarked;
            toast.success(isSaved ? "Saved to bookmarks" : "Removed from bookmarks", {
                icon: isSaved ? '📑' : '🗑️',
            });
            // Re-fetch profile-private to ensure saved posts list is accurate
            queryClient.invalidateQueries({ queryKey: ['profile-private'] });
        }
    });
};
