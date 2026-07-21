import { useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatImageUrl } from '../../utils/formatUrl';

const AVATARS = Array.from({ length: 20 }).map((_, i) => `https://api.dicebear.com/9.x/micah/svg?seed=Avatar${i + 1}&backgroundColor=f3f4f6,e5e7eb,d1d5db`);

const EditProfileModal = ({ isOpen, onClose, userProfile, onProfileUpdate }) => {
    const { user, updateUser } = useAuth();

    const [formData, setFormData] = useState({
        username: userProfile?.username || '',
        bio: userProfile?.bio || '',
        pronouns: userProfile?.pronouns || '',
        profilePic: userProfile?.profilePic || '',
        socialLinks: {
            instagram: userProfile?.socialLinks?.instagram || '',
            facebook: userProfile?.socialLinks?.facebook || '',
            linkedin: userProfile?.socialLinks?.linkedin || '',
            leetcode: userProfile?.socialLinks?.leetcode || '',
            portfolio: userProfile?.socialLinks?.portfolio || ''
        }
    });

    const [loading, setLoading] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSocialChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [name]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSubmit = { ...formData };
            const { data } = await api.put('/users/profile', dataToSubmit);

            if (user) {
                const updatedUser = { ...user, ...data };
                updateUser(updatedUser);
            }

            toast.success('Profile updated successfully!');
            if (onProfileUpdate) onProfileUpdate(data);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white sm:rounded-xl shadow-2xl w-full max-w-[500px] h-[100vh] sm:h-auto sm:max-h-[90vh] flex flex-col transform transition-all">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0 bg-white sm:rounded-t-xl">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-900">
                        <X size={24} strokeWidth={1.5} />
                    </button>
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">Edit profile</h2>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="text-blue-500 hover:text-blue-700 font-semibold text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Done'}
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white sm:rounded-b-xl">
                    {showAvatarPicker ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Choose Avatar</h3>
                                <button onClick={() => setShowAvatarPicker(false)} className="text-sm font-semibold text-blue-500 hover:text-blue-700">Cancel</button>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {AVATARS.map((avatar, index) => (
                                    <div 
                                        key={index} 
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, profilePic: avatar }));
                                            setShowAvatarPicker(false);
                                        }}
                                        className={`relative cursor-pointer rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${formData.profilePic === avatar ? 'border-gray-900 shadow-md scale-105' : 'border-transparent hover:border-gray-200'}`}
                                    >
                                        <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-auto aspect-square bg-gray-50" />
                                        {formData.profilePic === avatar && (
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                <Check className="text-white drop-shadow-md" size={24} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-200 space-y-6">
                            
                            {/* Profile Picture Section */}
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shadow-sm cursor-pointer transition-transform hover:scale-105" onClick={() => setShowAvatarPicker(true)}>
                                    <img src={formatImageUrl(formData.profilePic) || AVATARS[0]} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                                <button type="button" onClick={() => setShowAvatarPicker(true)} className="text-sm font-semibold text-blue-500 hover:text-blue-700">
                                    Change profile photo
                                </button>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Name</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors text-base"
                                        placeholder="Name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Pronouns</label>
                                    <input
                                        type="text"
                                        name="pronouns"
                                        value={formData.pronouns}
                                        onChange={handleChange}
                                        className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors text-base"
                                        placeholder="Pronouns"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors text-base resize-none"
                                        placeholder="Bio"
                                    />
                                    <div className="text-right text-xs text-gray-400 mt-1">
                                        {formData.bio.length}/150
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 mb-4">Links</h3>
                                <div className="space-y-4">
                                    <div>
                                        <input type="text" name="instagram" value={formData.socialLinks.instagram} onChange={handleSocialChange} className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-sm" placeholder="Instagram URL" />
                                    </div>
                                    <div>
                                        <input type="text" name="facebook" value={formData.socialLinks.facebook} onChange={handleSocialChange} className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-sm" placeholder="Facebook URL" />
                                    </div>
                                    <div>
                                        <input type="text" name="linkedin" value={formData.socialLinks.linkedin} onChange={handleSocialChange} className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-sm" placeholder="LinkedIn URL" />
                                    </div>
                                    <div>
                                        <input type="text" name="leetcode" value={formData.socialLinks.leetcode} onChange={handleSocialChange} className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-sm" placeholder="LeetCode URL" />
                                    </div>
                                    <div>
                                        <input type="text" name="portfolio" value={formData.socialLinks.portfolio} onChange={handleSocialChange} className="w-full border-b border-gray-300 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-sm" placeholder="Portfolio URL" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
            
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 0px;
                }
            `}</style>
        </div>
    );
};

export default EditProfileModal;
