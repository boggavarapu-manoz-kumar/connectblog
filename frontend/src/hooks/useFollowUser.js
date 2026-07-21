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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['followers'] });
            queryClient.invalidateQueries({ queryKey: ['following'] });
            queryClient.invalidateQueries({ queryKey: ['users-search'] });
        },
        onError: () => {
            toast.error("Action failed. Please try again.");
        }
    });
};
