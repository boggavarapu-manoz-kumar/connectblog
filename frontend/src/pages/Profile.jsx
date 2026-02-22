import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import PostCard from '../components/post/PostCard';
import { Settings, Loader2, Link as LinkIcon, Bookmark, Grid, Archive, AlertCircle, RefreshCw, Instagram, Facebook, Linkedin, Globe, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import EditProfileModal from '../components/profile/EditProfileModal';
import UserListModal from '../components/profile/UserListModal';

const Profile = () => {
    const { id: urlUserId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');

    // List Modal State (Followers/Following)
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalUsers, setModalUsers] = useState([]);
    const [isListLoading, setIsListLoading] = useState(false);

    const targetUserId = useMemo(() => {
        return urlUserId || currentUser?._id || currentUser?.id;
    }, [urlUserId, currentUser]);

    // Query 1: Main User Profile Data
    const { data: profileUser, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery({
        queryKey: ['profile', targetUserId],
        queryFn: async () => {
            if (!targetUserId || targetUserId === 'undefined') return null;
            const { data } = await api.get(`/users/${targetUserId}`);
            return data;
        },
        enabled: !authLoading && !!targetUserId,
        staleTime: 1000 * 60 * 10, // 10 minutes cache
    });

    // Query 2: User's Public Posts
    const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
        queryKey: ['profile-posts', targetUserId],
        queryFn: async () => {
            const { data } = await api.get(`/posts/user/${targetUserId}`);
            return data;
        },
        enabled: !!profileUser?._id,
        staleTime: 1000 * 60 * 10, // 10 minutes cache
    });

    const posts = postsData?.posts || [];

    const isOwnProfile = profileUser?._id === (currentUser?._id || currentUser?.id);

    // Query 3: Private Data (Archived & Saved) - Only for Owner
    const { data: privateDataRaw, isLoading: privateLoading } = useQuery({
        queryKey: ['profile-private', profileUser?._id],
        queryFn: async () => {
            const [archivedRes, savedRes] = await Promise.all([
                api.get(`/posts?archived=true&author=${profileUser._id}`),
                api.get('/posts/bookmarks')
            ]);
            return {
                archived: archivedRes.data.posts,
                saved: savedRes.data.posts
            };
        },
        enabled: !!profileUser?._id && isOwnProfile,
        staleTime: 1000 * 60 * 5,
    });

    const privateData = privateDataRaw || { archived: [], saved: [] };

    // Follow mutation
    const followMutation = useMutation({
        mutationFn: async ({ isFollowing }) => {
            const endpoint = isFollowing ? `/users/${targetUserId}/unfollow` : `/users/${targetUserId}/follow`;
            return api.put(endpoint);
        },
        onMutate: async ({ isFollowing }) => {
            const myId = currentUser?._id || currentUser?.id;
            if (!myId) return;

            // 1. Cancel outgoing refetches
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ['profile', targetUserId] }),
                queryClient.cancelQueries({ queryKey: ['profile', myId] }),
                queryClient.cancelQueries({ queryKey: ['posts-feed'] })
            ]);

            // 2. Snapshots
            const snapshots = {
                targetProfile: queryClient.getQueryData(['profile', targetUserId]),
                myProfile: queryClient.getQueryData(['profile', myId])
            };

            // 3. Update Target User's Followers
            queryClient.setQueryData(['profile', targetUserId], old => {
                if (!old) return old;
                const newFollowers = isFollowing
                    ? (old.followers || []).filter(f => f.toString() !== myId.toString())
                    : [...(old.followers || []), myId];
                return { ...old, followers: newFollowers };
            });

            // 4. Update My Following
            if (myId) {
                queryClient.setQueryData(['profile', myId], old => {
                    if (!old) return old;
                    const newFollowing = isFollowing
                        ? (old.following || []).filter(f => f.toString() !== targetUserId.toString())
                        : [...(old.following || []), targetUserId];
                    return { ...old, following: newFollowing };
                });
            }

            return { snapshots };
        },
        onError: (err, variables, context) => {
            const myId = currentUser?._id || currentUser?.id;
            if (context?.snapshots?.targetProfile) {
                queryClient.setQueryData(['profile', targetUserId], context.snapshots.targetProfile);
            }
            if (myId && context?.snapshots?.myProfile) {
                queryClient.setQueryData(['profile', myId], context.snapshots.myProfile);
            }
            toast.error("Sync failed");
        },
        onSuccess: (data, { isFollowing }) => {
            toast.success(isFollowing ? "Unfollowed" : "Following");
        },
        onSettled: () => {
            const myId = currentUser?._id || currentUser?.id;
            queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
            if (myId) queryClient.invalidateQueries({ queryKey: ['profile', myId] });
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
        },
    });

    const handleOpenList = async (type) => {
        setModalTitle(type === 'followers' ? 'Followers' : 'Following');
        setIsListModalOpen(true);
        setIsListLoading(true);
        try {
            const { data } = await api.get(`/users/${targetUserId}/${type}`);
            setModalUsers(data);
        } catch (error) {
            toast.error(`Failed to load ${type}`);
            setIsListModalOpen(false);
        } finally {
            setIsListLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !urlUserId && !currentUser) {
            navigate('/login');
        }
    }, [urlUserId, currentUser, authLoading, navigate]);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    if (profileLoading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (profileError || !profileUser) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Profile Unavailable</h2>
                <p className="text-gray-500 mb-6 max-w-md">{profileError?.message || "The profile identity could not be resolved."}</p>
                <div className="flex gap-4">
                    <button onClick={() => refetchProfile()} className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                        <RefreshCw size={18} /> Retry
                    </button>
                    <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                        Go to Feed
                    </button>
                </div>
            </div>
        );
    }

    const isFollowing = profileUser.followers?.includes(currentUser?._id || currentUser?.id);
    const stats = {
        followers: profileUser.followers?.length || 0,
        following: profileUser.following?.length || 0,
        posts: posts.length
    };

    const archivedPosts = privateData?.archived || [];
    const bookmarkedPosts = privateData?.saved || [];

    return (
        <div className="min-h-screen bg-gray-50 pt-8 pb-12">
            <div className="max-w-4xl mx-auto bg-white border border-gray-200 sm:rounded-lg overflow-hidden">
                {/* Cover Image/Banner */}
                <div className="w-full aspect-[3/1] bg-[#0a66c2] relative overflow-hidden group">
                    {profileUser.coverImage ? (
                        <>
                            <img
                                src={profileUser.coverImage}
                                alt={`${profileUser.username}'s banner`}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/30 pointer-events-none"></div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#152c42] via-[#1a466b] to-[#0a66c2] pointer-events-none flex items-center justify-center">
                            <svg className="w-full h-full opacity-10 mix-blend-overlay" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M0 100 L100 0 M0 0 L100 100 M50 0 L50 100 M0 50 L100 50" stroke="white" strokeWidth="0.5" />
                                <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="0.5" />
                                <circle cx="50" cy="50" r="20" stroke="white" strokeWidth="0.5" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Header Section */}
                <div className="px-4 sm:px-8 pb-6 relative z-10 w-full mb-1">
                    <div className="flex justify-between items-end -mt-[12%] sm:-mt-[10%] mb-4">
                        <div className="flex-shrink-0 relative">
                            <img
                                src={profileUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.username)}&background=efefef&color=333&bold=true`}
                                alt={profileUser.username}
                                className="w-[100px] h-[100px] sm:w-[150px] sm:h-[150px] rounded-full object-cover border-4 border-white shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    <div className="mt-4 px-1 sm:px-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
                            <h2 className="text-2xl sm:text-[28px] font-connect font-black text-gray-900 leading-tight">
                                {profileUser.username}
                            </h2>
                            <div className="flex items-center gap-2">
                                {isOwnProfile ? (
                                    <>
                                        <button onClick={() => setIsEditModalOpen(true)} className="px-5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-bold rounded-lg transition-all border border-gray-200">
                                            Edit profile
                                        </button>
                                        <button onClick={() => navigate('/settings')} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all border border-gray-200">
                                            <Settings size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => followMutation.mutate({ isFollowing })}
                                        disabled={followMutation.isPending}
                                        className={`px-6 py-1.5 text-sm font-bold rounded-lg transition-all ${isFollowing ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 sm:gap-10 mb-6 py-4 border-y border-gray-50 sm:border-none sm:py-0">
                            <div className="flex flex-col sm:flex-row items-center sm:gap-1.5">
                                <span className="font-bold text-gray-900 text-base">{stats.posts}</span>
                                <span className="text-gray-500 text-sm sm:text-base">posts</span>
                            </div>
                            <div
                                onClick={() => handleOpenList('followers')}
                                className="flex flex-col sm:flex-row items-center sm:gap-1.5 cursor-pointer group"
                            >
                                <span className="font-bold text-gray-900 text-base group-hover:text-blue-600">{stats.followers}</span>
                                <span className="text-gray-500 text-sm sm:text-base group-hover:text-blue-600">followers</span>
                            </div>
                            <div
                                onClick={() => handleOpenList('following')}
                                className="flex flex-col sm:flex-row items-center sm:gap-1.5 cursor-pointer group"
                            >
                                <span className="font-bold text-gray-900 text-base group-hover:text-blue-600">{stats.following}</span>
                                <span className="text-gray-500 text-sm sm:text-base group-hover:text-blue-600">following</span>
                            </div>
                        </div>

                        {profileUser.pronouns && (
                            <p className="text-gray-500 font-medium text-sm -mt-2 mb-1">{profileUser.pronouns}</p>
                        )}

                        {profileUser.bio && (
                            <p className="whitespace-pre-wrap text-gray-900 text-[15px] leading-relaxed max-w-[800px] mb-3">
                                {profileUser.bio}
                            </p>
                        )}

                        {profileUser.socialLinks && Object.values(profileUser.socialLinks).some(link => link) && (
                            <div className="flex items-center flex-wrap gap-4 mb-3">
                                {Object.entries(profileUser.socialLinks).map(([platform, link]) => {
                                    if (!link) return null;
                                    let Icon = LinkIcon;
                                    let colorClass = 'text-gray-600 hover:text-gray-900';
                                    switch (platform.toLowerCase()) {
                                        case 'instagram': Icon = Instagram; colorClass = 'text-pink-600 hover:text-pink-700'; break;
                                        case 'facebook': Icon = Facebook; colorClass = 'text-blue-600 hover:text-blue-700'; break;
                                        case 'linkedin': Icon = Linkedin; colorClass = 'text-[#0a66c2] hover:text-[#004182]'; break;
                                        case 'leetcode': Icon = Code; colorClass = 'text-orange-500 hover:text-orange-600'; break;
                                        case 'portfolio': Icon = Globe; colorClass = 'text-teal-600 hover:text-teal-700'; break;
                                    }
                                    return (
                                        <a key={platform} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer"
                                            className={`flex items-center gap-1.5 font-semibold text-[14px] transition-colors ${colorClass}`}>
                                            <Icon size={16} />
                                            <span className="inline-block capitalize">{platform}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        )}

                    </div>
                </div>

                {/* Tabs */}
                <div className="border-t border-gray-200 mt-2">
                    <div className="flex gap-2 sm:gap-8 px-4 sm:px-10 overflow-x-auto custom-scrollbar">
                        <button onClick={() => setActiveTab('posts')} className={`flex items-center whitespace-nowrap gap-2 h-14 px-2 sm:px-4 text-[15px] font-semibold transition-colors border-b-[3px] -mb-[1px] ${activeTab === 'posts' ? 'border-[#01754f] text-[#01754f]' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400'}`}>
                            <Grid size={16} className={activeTab !== 'posts' ? 'text-gray-400' : ''} /> Posts
                        </button>
                        {isOwnProfile && (
                            <button onClick={() => setActiveTab('saved')} className={`flex items-center whitespace-nowrap gap-2 h-14 px-2 sm:px-4 text-[15px] font-semibold transition-colors border-b-[3px] -mb-[1px] ${activeTab === 'saved' ? 'border-[#01754f] text-[#01754f]' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400'}`}>
                                <Bookmark size={16} className={activeTab !== 'saved' ? 'text-gray-400' : ''} /> Saved Activity
                            </button>
                        )}
                        {isOwnProfile && (
                            <button onClick={() => setActiveTab('archived')} className={`flex items-center whitespace-nowrap gap-2 h-14 px-2 sm:px-4 text-[15px] font-semibold transition-colors border-b-[3px] -mb-[1px] ${activeTab === 'archived' ? 'border-[#01754f] text-[#01754f]' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400'}`}>
                                <Archive size={16} className={activeTab !== 'archived' ? 'text-gray-400' : ''} /> Archived
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-gray-50 p-1 sm:p-6 min-h-[400px]">
                    {postsLoading || (isOwnProfile && privateLoading) ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'posts' && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    {posts.length > 0 ? (
                                        posts.map(post => <PostCard key={post._id} post={post} onPostUpdate={() => refetchPosts()} />)
                                    ) : (
                                        <div className="text-center py-20 flex flex-col items-center">
                                            <div className="w-16 h-16 border-2 border-gray-900 rounded-full flex items-center justify-center mb-4">
                                                <Grid size={28} className="text-gray-900" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Posts Yet</h2>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'saved' && isOwnProfile && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    {bookmarkedPosts.length > 0 ? (
                                        bookmarkedPosts.map(post => <PostCard key={post._id} post={post} onPostUpdate={() => queryClient.invalidateQueries({ queryKey: ['profile-private'] })} />)
                                    ) : (
                                        <div className="text-center py-20 flex flex-col items-center">
                                            <div className="w-16 h-16 border-2 border-gray-900 rounded-full flex items-center justify-center mb-4">
                                                <Bookmark size={28} className="text-gray-900" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Save your favorite posts</h2>
                                            <p className="text-gray-600">Only you can see what you've saved.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'archived' && isOwnProfile && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    {archivedPosts.length > 0 ? (
                                        archivedPosts.map(post => <PostCard key={post._id} post={post} onPostUpdate={() => queryClient.invalidateQueries({ queryKey: ['profile-private'] })} />)
                                    ) : (
                                        <div className="text-center py-20 flex flex-col items-center">
                                            <div className="w-16 h-16 border-2 border-gray-900 rounded-full flex items-center justify-center mb-4">
                                                <Archive size={28} className="text-gray-900" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Empty Archive</h2>
                                            <p className="text-gray-600">Archived posts will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    userProfile={profileUser}
                    onProfileUpdate={() => {
                        queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
                        queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
                    }}
                />

                <UserListModal
                    isOpen={isListModalOpen}
                    onClose={() => setIsListModalOpen(false)}
                    title={modalTitle}
                    users={modalUsers}
                    isLoading={isListLoading}
                />
            </div>
        </div>
    );
};

export default Profile;
