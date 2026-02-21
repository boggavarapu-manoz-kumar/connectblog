import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
    const [archivedPosts, setArchivedPosts] = useState([]);
    const [error, setError] = useState(null);

    const targetUserId = useMemo(() => {
        return urlUserId || currentUser?._id || currentUser?.id;
    }, [urlUserId, currentUser]);

    const fetchProfileData = useCallback(async () => {
        if (!targetUserId || targetUserId === 'undefined') {
            if (!authLoading) {
                setError("Profile identity could not be resolved. Please login again.");
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const userRes = await api.get(`/users/${targetUserId}`);
            const userData = userRes.data;
            setProfileUser(userData);

            const postsRes = await api.get(`/posts/user/${targetUserId}`);
            setPosts(postsRes.data);

            const isOwnProfile = currentUser?._id === userData._id || currentUser?.id === userData._id;

            if (isOwnProfile) {
                try {
                    const [archivedRes, savedRes] = await Promise.all([
                        api.get(`/posts?archived=true&author=${targetUserId}`),
                        api.get('/posts/bookmarks')
                    ]);
                    setArchivedPosts(archivedRes.data);
                    setBookmarkedPosts(savedRes.data);
                } catch (err) {
                    console.error('[Profile] Failed to load private data layers:', err);
                }
            }

            setStats({
                followers: userData.followers?.length || 0,
                following: userData.following?.length || 0,
                posts: postsRes.data.length
            });

            if (currentUser && userData.followers?.includes(currentUser._id || currentUser?.id)) {
                setIsFollowing(true);
            } else {
                setIsFollowing(false);
            }

        } catch (error) {
            console.error('[Profile] Sync Error:', error);
            const status = error.response?.status;
            const message = error.response?.data?.message;

            if (status === 404) {
                setError("The profile you are looking for has been moved or deleted.");
            } else if (status === 400) {
                setError("The user ID format is invalid. Please check the URL.");
            } else {
                setError(message || "An error occurred while loading this profile.");
            }
        } finally {
            setLoading(false);
        }
    }, [targetUserId, authLoading, currentUser]);

    useEffect(() => {
        if (authLoading) return;
        if (!urlUserId && !currentUser) {
            navigate('/login');
            return;
        }
        fetchProfileData();
    }, [urlUserId, currentUser, authLoading, fetchProfileData, navigate]);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    const handleFollowToggle = async () => {
        if (!currentUser) return navigate('/login');
        try {
            const endpoint = isFollowing ? `/users/${targetUserId}/unfollow` : `/users/${targetUserId}/follow`;
            await api.put(endpoint);
            setIsFollowing(!isFollowing);
            setStats(prev => ({
                ...prev,
                followers: isFollowing ? prev.followers - 1 : prev.followers + 1
            }));
            toast.success(isFollowing ? "Unfollowed" : "Following");
        } catch (err) {
            toast.error("Action failed. Please try again.");
        }
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Profile Unavailable</h2>
                <p className="text-gray-500 mb-6 max-w-md">{error || "This profile couldn't be loaded right now."}</p>
                <div className="flex gap-4">
                    <button onClick={() => fetchProfileData()} className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                        <RefreshCw size={18} /> Retry
                    </button>
                    <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                        Go to Feed
                    </button>
                </div>
            </div>
        );
    }

    const isOwnProfile = currentUser?._id === profileUser._id || currentUser?.id === profileUser._id;

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
                            {/* Inner shadow overlay for premium depth */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/30 pointer-events-none"></div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#152c42] via-[#1a466b] to-[#0a66c2] pointer-events-none flex items-center justify-center">
                            {/* Premium professional minimal mesh pattern */}
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
                    {/* Avatar & Action Buttons Row */}
                    <div className="flex justify-between items-start -mt-[15%] sm:-mt-[12%] md:-mt-[11%]">
                        {/* Avatar */}
                        <div className="flex-shrink-0 relative">
                            <img
                                src={profileUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.username)}&background=efefef&color=333&bold=true`}
                                alt={profileUser.username}
                                className="w-[110px] h-[110px] sm:w-[152px] sm:h-[152px] rounded-full object-cover border-4 border-white shadow-sm bg-white"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.username)}&background=efefef&color=333&bold=true`;
                                }}
                            />
                        </div>

                        {/* Actions */}
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
                                    onClick={handleFollowToggle}
                                    className={`px-5 py-1.5 text-[15px] font-medium rounded-full transition-colors flex items-center justify-center h-[34px] sm:h-[40px] border ${isFollowing ? 'bg-white hover:bg-gray-100 text-gray-600 border-gray-500' : 'bg-[#0a66c2] hover:bg-[#004182] text-white border-[#0a66c2]'}`}
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info */}
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

                        {/* Links inline (Positioned ABOVE followers) */}
                        {profileUser.socialLinks && Object.values(profileUser.socialLinks).some(link => link) && (
                            <div className="flex items-center flex-wrap gap-4 mb-3">
                                {Object.entries(profileUser.socialLinks).map(([platform, link]) => {
                                    if (!link) return null;

                                    // Map platforms to specific icons and colors
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

                        { /* Stats block */}
                        <div className="flex flex-col sm:flex-row sm:items-center mt-3 gap-y-3 gap-x-4">
                            {/* Stats - LinkedIn style */}
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
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`flex items-center whitespace-nowrap gap-2 h-14 px-2 sm:px-4 text-[15px] font-semibold transition-colors border-b-[3px] -mb-[1px] ${activeTab === 'posts' ? 'border-[#01754f] text-[#01754f]' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400'}`}
                        >
                            <Grid size={16} className={activeTab !== 'posts' ? 'text-gray-400' : ''} /> Posts
                        </button>
                        {isOwnProfile && (
                            <button
                                onClick={() => setActiveTab('saved')}
                                className={`flex items-center whitespace-nowrap gap-2 h-14 px-2 sm:px-4 text-[15px] font-semibold transition-colors border-b-[3px] -mb-[1px] ${activeTab === 'saved' ? 'border-[#01754f] text-[#01754f]' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400'}`}
                            >
                                <Bookmark size={16} className={activeTab !== 'saved' ? 'text-gray-400' : ''} /> Saved Activity
                            </button>
                        )}
                        {isOwnProfile && (
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`flex items-center whitespace-nowrap gap-2 h-14 px-2 sm:px-4 text-[15px] font-semibold transition-colors border-b-[3px] -mb-[1px] ${activeTab === 'archived' ? 'border-[#01754f] text-[#01754f]' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400'}`}
                            >
                                <Archive size={16} className={activeTab !== 'archived' ? 'text-gray-400' : ''} /> Archived
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-gray-50 p-1 sm:p-6 min-h-[400px]">
                    {activeTab === 'posts' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            {posts.length > 0 ? (
                                posts.map(post => <PostCard key={post._id} post={post} onPostUpdate={fetchProfileData} />)
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
                                bookmarkedPosts.map(post => <PostCard key={post._id} post={post} onPostUpdate={fetchProfileData} />)
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
                                archivedPosts.map(post => <PostCard key={post._id} post={post} onPostUpdate={fetchProfileData} />)
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
                </div>

                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    userProfile={profileUser}
                    onProfileUpdate={(updatedUser) => {
                        setProfileUser(updatedUser);
                        fetchProfileData();
                    }}
                />
            </div>
        </div>
    );
};

export default Profile;
