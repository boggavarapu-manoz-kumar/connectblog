import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import PostCard from '../components/post/PostCard';
import { Settings, Loader2, Link as LinkIcon, Bookmark, Grid, Archive, AlertCircle, RefreshCw, Instagram, Facebook, Linkedin, Globe, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import EditProfileModal from '../components/profile/EditProfileModal';

const Profile = () => {
    const { id: urlUserId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');

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
        staleTime: 1000 * 60 * 10, // 10 minutes cache (Best Ever)
    });

    // Query 2: User's Public Posts
    const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
        queryKey: ['profile-posts', targetUserId],
        queryFn: async () => {
            const { data } = await api.get(`/posts/user/${targetUserId}`);
            return data;
        },
        enabled: !!profileUser?._id,
        staleTime: 1000 * 60 * 10, // 10 minutes cache (Best Ever)
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

    // Follow Mutation for Instant UI Updates (Optimistic)
    const followMutation = useMutation({
        mutationFn: async ({ isFollowing }) => {
            const endpoint = isFollowing ? `/users/${targetUserId}/unfollow` : `/users/${targetUserId}/follow`;
            return api.put(endpoint);
        },
        onMutate: async ({ isFollowing }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['profile', targetUserId] });

            // Snapshot the previous value
            const previousProfile = queryClient.getQueryData(['profile', targetUserId]);

            // Optimistically update to the new value
            queryClient.setQueryData(['profile', targetUserId], old => {
                const newFollowers = isFollowing
                    ? old.followers.filter(f => f !== (currentUser._id || currentUser.id))
                    : [...(old.followers || []), (currentUser._id || currentUser.id)];
                return { ...old, followers: newFollowers };
            });

            return { previousProfile };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['profile', targetUserId], context.previousProfile);
            toast.error("Action failed");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
            toast.success(profileUser?.followers?.includes(currentUser?._id || currentUser?.id) ? "Unfollowed" : "Following");
        },
    });

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
                    <div className="flex justify-between items-start -mt-[15%] sm:-mt-[12%] md:-mt-[11%]">
                        <div className="flex-shrink-0 relative">
                            <img
                                src={profileUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.username)}&background=efefef&color=333&bold=true`}
                                alt={profileUser.username}
                                className="w-[110px] h-[110px] sm:w-[152px] sm:h-[152px] rounded-full object-cover border-4 border-white shadow-sm bg-white"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-[16%] sm:pt-[13%] md:pt-[12%]">
                            {isOwnProfile ? (
                                <>
                                    <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-1.5 border border-gray-500 hover:bg-gray-100/80 hover:border-gray-700 text-gray-700 text-[15px] font-medium rounded-full transition-colors flex items-center justify-center h-[34px] sm:h-[40px]">
                                        Edit profile
                                    </button>
                                    <button onClick={() => navigate('/settings')} className="w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] border border-gray-500 focus:outline-none text-gray-600 hover:bg-gray-100/80 hover:border-gray-700 rounded-full flex items-center justify-center transition-colors">
                                        <Settings size={18} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => followMutation.mutate({ isFollowing })}
                                    disabled={followMutation.isPending}
                                    className={`px-5 py-1.5 text-[15px] font-medium rounded-full transition-colors flex items-center justify-center h-[34px] sm:h-[40px] border ${isFollowing ? 'bg-white hover:bg-gray-100 text-gray-600 border-gray-500' : 'bg-[#0a66c2] hover:bg-[#004182] text-white border-[#0a66c2]'}`}
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 px-1 sm:px-2">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 mb-1.5">
                            <h2 className="text-2xl sm:text-[26px] font-bold text-gray-900 leading-tight">
                                {profileUser.username}
                            </h2>
                            {profileUser.pronouns && (
                                <span className="text-gray-500 font-normal text-sm sm:mt-1">({profileUser.pronouns})</span>
                            )}
                        </div>

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

                        <div className="flex flex-col sm:flex-row sm:items-center mt-3 gap-y-3 gap-x-4">
                            <div className="flex items-center gap-3 text-[14px] text-gray-600 font-medium">
                                <span className="hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors"><span className="font-bold text-gray-900">{stats.followers}</span> followers</span>
                                <span className="hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors"><span className="font-bold text-gray-900">{stats.following}</span> following</span>
                                <span><span className="font-bold text-gray-900">{stats.posts}</span> posts</span>
                            </div>
                        </div>
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
            </div>
        </div>
    );
};

export default Profile;
