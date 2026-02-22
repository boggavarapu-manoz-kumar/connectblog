import { X, User as UserIcon, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UserListItem = ({ user, onClose }) => {
    const { user: currentUser, updateUser } = useAuth();
    const queryClient = useQueryClient();

    // Check if current user is following this user
    const isFollowing = currentUser?.following?.includes(user._id);
    const isMe = currentUser?._id === user._id;

    const followMutation = useMutation({
        mutationFn: async () => {
            const endpoint = isFollowing ? `/users/${user._id}/unfollow` : `/users/${user._id}/follow`;
            return api.put(endpoint);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });

            // Update AuthContext following list
            if (currentUser) {
                const newFollowing = isFollowing
                    ? currentUser.following.filter(id => id !== user._id)
                    : [...(currentUser.following || []), user._id];

                const updatedUser = { ...currentUser, following: newFollowing };
                updateUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        },
        onError: () => {
            toast.error("Action failed");
        }
    });

    return (
        <div
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group"
        >
            <Link
                to={`/profile/${user._id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
                onClick={onClose}
            >
                <img
                    src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=f3f2ef&color=666&bold=true`}
                    alt={user.username}
                    className="w-11 h-11 rounded-full object-cover border border-gray-100 shadow-sm"
                />
                <div className="truncate">
                    <p className="font-bold text-gray-900 text-sm truncate">{user.username}</p>
                    <p className="text-xs text-gray-500 truncate">{user.bio || 'No bio yet'}</p>
                </div>
            </Link>

            {!isMe && currentUser && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        followMutation.mutate();
                    }}
                    className={`ml-3 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${isFollowing
                        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                >
                    {isFollowing ? 'Following' : 'Follow'}
                </button>
            )}
        </div>
    );
};

const UserListModal = ({ isOpen, onClose, title, users = [], isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {isLoading ? (
                        <div className="py-20 flex justify-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <UserIcon size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">No {title.toLowerCase()} found</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {users.map(user => (
                                <UserListItem key={user._id} user={user} onClose={onClose} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
