import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    User,
    Lock,
    Bell,
    Shield,
    Trash2,
    Instagram,
    Linkedin,
    Facebook,
    Globe,
    ChevronRight,
    Loader2,
    Award,
    CreditCard,
    CheckCircle2,
    Bookmark,
    Eye,
    EyeOff
} from 'lucide-react';
import api from '../services/api';
import PostCard from '../components/post/PostCard';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('account');
    const [loading, setLoading] = useState(false);
    const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
    const [fetchingBookmarks, setFetchingBookmarks] = useState(false);

    // Form States
    const [accountData, setAccountData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState(false);

    const [socialLinks, setSocialLinks] = useState(user?.socialLinks || {
        instagram: '',
        facebook: '',
        linkedin: '',
        leetcode: '',
        portfolio: ''
    });

    const fetchBookmarks = async () => {
        setFetchingBookmarks(true);
        try {
            const { data } = await api.get('/posts/bookmarks');
            setBookmarkedPosts(data);
        } catch (error) {
            console.error('Failed to fetch bookmarks');
        } finally {
            setFetchingBookmarks(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'saved') {
            fetchBookmarks();
        }
    }, [activeTab]);

    const handleAccountUpdate = async (e) => {
        e.preventDefault();

        // Validation for password change
        if (accountData.newPassword) {
            if (!accountData.currentPassword) {
                return toast.error('Current password is required to change password');
            }
            if (accountData.newPassword.length < 6) {
                return toast.error('New password must be at least 6 characters');
            }
            if (accountData.newPassword !== accountData.confirmPassword) {
                return toast.error('New passwords do not match');
            }
        }

        setLoading(true);
        try {
            const { data } = await api.put('/users/profile', accountData);
            updateUser(data);
            setAccountData({
                ...accountData,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            toast.success('Account updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.put('/users/profile', { socialLinks });
            updateUser(data);
            toast.success('Social links updated!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmResult = window.confirm('Are you ABSOLUTELY sure? This will permanently delete your account and all your posts. This action cannot be undone.');
        if (!confirmResult) return;

        setLoading(true);
        try {
            await api.delete('/users/profile');
            toast.success('Account deleted. We\'re sorry to see you go.');
            logout();
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Deletion failed');
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'saved', label: 'Saved Posts', icon: Bookmark },
        { id: 'social', label: 'Social Networks', icon: Instagram },
        { id: 'rewards', label: 'Rewards & Earnings', icon: Award },
        { id: 'danger', label: 'Danger Zone', icon: Trash2, color: 'text-red-500' },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 pt-8 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-connect font-black text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Manage your account preferences and social presence.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="w-full lg:w-72 flex-shrink-0">
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-3 sticky top-24">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 mb-1 group ${activeTab === tab.id
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-100 translate-x-1'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : (tab.color || 'text-gray-400')} />
                                        <span className="font-bold text-sm">{tab.label}</span>
                                    </div>
                                    <ChevronRight size={16} className={`transition-transform duration-200 ${activeTab === tab.id ? 'opacity-100 translate-x-1' : 'opacity-0'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1">
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden min-h-[600px] transition-all duration-500">

                            {/* Account Section */}
                            {activeTab === 'account' && (
                                <div className="p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                                        <div className="bg-primary-50 p-2.5 rounded-2xl text-primary-600 italic">
                                            <User size={24} />
                                        </div>
                                        Account Security
                                    </h2>

                                    <form onSubmit={handleAccountUpdate} className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 ml-1">Username</label>
                                                <input
                                                    type="text"
                                                    value={accountData.username}
                                                    onChange={(e) => setAccountData({ ...accountData, username: e.target.value })}
                                                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all font-medium text-gray-900"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={accountData.email}
                                                    onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                                                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all font-medium text-gray-900"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 mt-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-2">
                                                    <Lock size={18} className="text-primary-600" />
                                                    <h3 className="font-bold text-gray-900 italic">Change Password</h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(!showPasswords)}
                                                    className="text-xs font-black text-primary-600 uppercase tracking-widest hover:text-primary-700 transition-colors flex items-center gap-1.5"
                                                >
                                                    {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    {showPasswords ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700 ml-1">Current Password</label>
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        value={accountData.currentPassword}
                                                        onChange={(e) => setAccountData({ ...accountData, currentPassword: e.target.value })}
                                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all font-medium text-gray-900"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700 ml-1">New Password</label>
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        placeholder="Min. 6 chars"
                                                        value={accountData.newPassword}
                                                        onChange={(e) => setAccountData({ ...accountData, newPassword: e.target.value })}
                                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all font-medium text-gray-900"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700 ml-1">Confirm New</label>
                                                    <input
                                                        type={showPasswords ? "text" : "password"}
                                                        placeholder="Re-type new"
                                                        value={accountData.confirmPassword}
                                                        onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all font-medium text-gray-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-10">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-primary-700 hover:shadow-2xl hover:shadow-primary-200 transition-all flex items-center gap-2 group"
                                            >
                                                {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                                Save Settings
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Saved Posts Section */}
                            {activeTab === 'saved' && (
                                <div className="p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                            <div className="bg-primary-50 p-2.5 rounded-2xl text-primary-600 italic">
                                                <Bookmark size={24} className="fill-current" />
                                            </div>
                                            Saved Stories
                                        </h2>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{bookmarkedPosts.length} items</p>
                                    </div>

                                    {fetchingBookmarks ? (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <Loader2 size={40} className="animate-spin text-primary-600 mb-4" />
                                            <p className="text-gray-400 font-bold italic">Curating your collection...</p>
                                        </div>
                                    ) : bookmarkedPosts.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                                            {bookmarkedPosts.map(post => (
                                                <PostCard key={post._id} post={post} onPostUpdate={fetchBookmarks} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                                <Bookmark size={40} className="text-gray-200" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-2">Nothing saved yet</h3>
                                            <p className="text-gray-400 text-sm max-w-xs mx-auto italic">Explore the latest blogs and save the ones you love to access them here quickly.</p>
                                            <button
                                                onClick={() => navigate('/')}
                                                className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                                            >
                                                Explore Feed
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Social Section */}
                            {activeTab === 'social' && (
                                <div className="p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                                        <div className="bg-pink-50 p-2.5 rounded-2xl text-pink-600 italic">
                                            <Instagram size={24} />
                                        </div>
                                        Connected Networks
                                    </h2>

                                    <form onSubmit={handleSocialUpdate} className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { id: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-600', bg: 'bg-pink-50' },
                                                { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-700', bg: 'bg-blue-50' },
                                                { id: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-50' },
                                                { id: 'portfolio', icon: Globe, label: 'Personal Website', color: 'text-gray-700', bg: 'bg-gray-100' }
                                            ].map((social) => (
                                                <div key={social.id} className="relative group">
                                                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 ${social.bg} ${social.color} rounded-xl group-focus-within:scale-110 transition-transform`}>
                                                        <social.icon size={20} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder={`${social.label} Profile URL`}
                                                        value={socialLinks[social.id]}
                                                        onChange={(e) => setSocialLinks({ ...socialLinks, [social.id]: e.target.value })}
                                                        className="w-full pl-16 pr-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-pink-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-8">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-black hover:shadow-2xl transition-all flex items-center justify-center gap-3"
                                            >
                                                {loading ? <Loader2 size={24} className="animate-spin" /> : 'Update Social Footprint'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Rewards Section (Coming Soon) */}
                            {activeTab === 'rewards' && (
                                <div className="p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center text-center min-h-[500px]">
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                                        <div className="relative bg-gradient-to-tr from-yellow-400 to-orange-500 p-6 rounded-[2.5rem] shadow-2xl text-white transform hover:scale-110 transition-transform duration-500 cursor-default">
                                            <Award size={64} strokeWidth={1.5} />
                                        </div>
                                    </div>

                                    <h2 className="text-4xl font-connect font-black text-gray-900 mb-4 tracking-tight uppercase italic">
                                        Rewards <span className="text-primary-600">&</span> Earnings
                                    </h2>

                                    <div className="bg-primary-50 px-6 py-2 rounded-full mb-8">
                                        <span className="text-primary-600 font-black text-sm uppercase tracking-widest animate-pulse">Coming Soon</span>
                                    </div>

                                    <p className="text-gray-500 max-w-sm font-medium italic leading-relaxed">
                                        We're building a state-of-the-art monetization system for our top creators. Soon, you'll be able to earn ConnectCoins and convert them into real-world rewards.
                                    </p>

                                    <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                                        {[
                                            { label: 'ConnectCoins', icon: '💎', desc: 'Earnings per read' },
                                            { label: 'Creator Fund', icon: '💰', desc: 'Monthly bonuses' },
                                            { label: 'Gift System', icon: '🎁', desc: 'Reader appreciation' }
                                        ].map((item, i) => (
                                            <div key={i} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 flex flex-col items-center group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                                <span className="text-3xl mb-3 transform group-hover:scale-125 transition-transform">{item.icon}</span>
                                                <span className="font-bold text-gray-900 text-sm mb-1">{item.label}</span>
                                                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-none">{item.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Danger Zone Section */}
                            {activeTab === 'danger' && (
                                <div className="p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                                        <div className="bg-red-50 p-2.5 rounded-2xl text-red-600 italic">
                                            <Trash2 size={24} />
                                        </div>
                                        Account Termination
                                    </h2>

                                    <div className="bg-red-50/50 border border-red-100 rounded-[2.5rem] p-8 sm:p-12 text-center">
                                        <div className="bg-red-600 text-white p-5 rounded-3xl inline-block mb-6 shadow-xl shadow-red-100">
                                            <Trash2 size={40} />
                                        </div>
                                        <h3 className="text-xl font-black text-red-900 uppercase tracking-tight">Deactivate Account</h3>
                                        <p className="text-red-700/70 mt-3 max-w-sm mx-auto font-medium leading-relaxed">
                                            Once you delete your account, there is no going back. All your posts, followers, and engagement data will be wiped from our servers forever.
                                        </p>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={loading}
                                            className="mt-10 bg-red-600 text-white px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-red-700 hover:shadow-2xl hover:shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto"
                                        >
                                            {loading ? <Loader2 size={24} className="animate-spin" /> : 'Confirm Deletion'}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
