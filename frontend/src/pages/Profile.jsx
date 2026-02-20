import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PostCard from '../components/post/PostCard';
import { User, Users, FileText, Settings, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import EditProfileModal from '../components/profile/EditProfileModal';

const Profile = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Determine which ID to fetch (url param or logged-in user)
    const userId = id || currentUser?._id;

    useEffect(() => {
        if (!userId) return;
        fetchProfileData();
    }, [userId]);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            // 1. Fetch User Data
            const userRes = await api.get(`/users/${userId}`);
            setProfileUser(userRes.data);

            // 2. Fetch User's Posts (We might need a specific endpoint or filter existing)
            // For now, assuming we filter from all posts or backend supports ?author=id
            // Let's assume we filter client side for MVP or fetch all if backend supports
            // Ideally: GET /api/posts?author=userId. 
            // Since our current backend getPosts returns all, we might need to filter.
            // Or better, let's just fetch all and filter client side for this demo to be safe, 
            // unless we update backend.
            const postsRes = await api.get('/posts');
            const userPosts = postsRes.data.filter(post => post.author._id === userId);
            setPosts(userPosts);

            // Set Stats
            setStats({
                followers: userRes.data.followers.length,
                following: userRes.data.following.length,
                posts: userPosts.length
            });

            // Check if current user is following this profile
            if (currentUser && userRes.data.followers.includes(currentUser._id)) {
                setIsFollowing(true);
            } else {
                setIsFollowing(false);
            }

        } catch (error) {
            console.error(error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!currentUser) {
            toast.error('Please login to follow users');
            return;
        }

        try {
            if (isFollowing) {
                await api.put(`/users/${userId}/unfollow`);
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
                setIsFollowing(false);
                toast.success('Unfollowed');
            } else {
                await api.put(`/users/${userId}/follow`);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
                setIsFollowing(true);
                toast.success('Followed!');
            }
        } catch (error) {
            toast.error('Action failed');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
        );
    }

    if (!profileUser) {
        return <div className="text-center py-20">User not found.</div>;
    }

    const isOwnProfile = currentUser?._id === profileUser._id;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Profile Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8 relative">
                    <div className="h-32 sm:h-56 bg-gradient-to-r from-primary-500 to-primary-600 w-full relative">
                        {profileUser.coverImage && (
                            <img
                                src={profileUser.coverImage}
                                alt="Cover Banner"
                                className="w-full h-full object-cover absolute inset-0"
                            />
                        )}
                    </div>
                    <div className="px-6 sm:px-10 pb-8 relative">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 mb-6 relative z-10">
                            <img
                                src={profileUser.profilePic}
                                alt={profileUser.username}
                                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-md object-cover bg-white"
                            />
                            <div className="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left flex-1 pb-2">
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                                    {profileUser.username}
                                    {profileUser.pronouns && (
                                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {profileUser.pronouns}
                                        </span>
                                    )}
                                </h1>
                                <p className="text-gray-500 text-sm mt-1">{profileUser.email}</p>
                            </div>
                            <div className="mt-4 sm:mt-0 pb-2">
                                {isOwnProfile ? (
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="flex items-center space-x-2 px-5 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm"
                                    >
                                        <Settings size={18} />
                                        <span>Edit Profile</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleFollowToggle}
                                        className={`px-6 py-2 rounded-lg font-medium shadow-sm transition-all ${isFollowing
                                            ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md'
                                            }`}
                                    >
                                        {isFollowing ? 'Unfollow' : 'Follow'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        {profileUser.bio && (
                            <div className="mb-6 text-center sm:text-left max-w-2xl">
                                <p className="text-gray-700">{profileUser.bio}</p>
                            </div>
                        )}

                        {/* Stats Row */}
                        <div className="flex justify-center sm:justify-start space-x-8 border-t border-gray-100 pt-6">
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="text-xl font-bold text-gray-900">{stats.posts}</span>
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <FileText size={14} /> Posts
                                </span>
                            </div>
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="text-xl font-bold text-gray-900">{stats.followers}</span>
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <Users size={14} /> Followers
                                </span>
                            </div>
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="text-xl font-bold text-gray-900">{stats.following}</span>
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <User size={14} /> Following
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User's Posts Feed */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <FileText className="text-primary-600" />
                        {isOwnProfile ? 'My Posts' : `${profileUser.username}'s Posts`}
                    </h2>

                    {posts.length > 0 ? (
                        <div className="space-y-6">
                            {posts.map(post => (
                                <PostCard key={post._id} post={post} onPostUpdate={fetchProfileData} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <FileText className="text-gray-400" size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No posts yet</h3>
                            <p className="text-gray-500">When {isOwnProfile ? 'you' : profileUser.username} creates a post, it will show up here.</p>
                        </div>
                    )}
                </div>

                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    userProfile={profileUser}
                    onProfileUpdate={(updatedUser) => {
                        setProfileUser(updatedUser);
                    }}
                />

            </div>
        </div>
    );
};

export default Profile;
