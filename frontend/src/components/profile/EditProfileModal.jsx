import { useState, useRef } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const EditProfileModal = ({ isOpen, onClose, userProfile, onProfileUpdate }) => {
    const { login } = useAuth(); // Needed to update context user if needed

    const [formData, setFormData] = useState({
        username: userProfile?.username || '',
        bio: userProfile?.bio || '',
        pronouns: userProfile?.pronouns || '',
        profilePic: userProfile?.profilePic || '',
        coverImage: userProfile?.coverImage || ''
    });

    const [loading, setLoading] = useState(false);

    const profilePicRef = useRef(null);
    const coverImageRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit (Base64 expands by ~33%)
            toast.error('Image must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await api.put('/users/profile', formData);

            // Update auth context if we have a new token or simply refresh local storage profile
            const currentUser = JSON.parse(localStorage.getItem('user'));
            if (currentUser) {
                const updatedUser = { ...currentUser, ...data };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                login(updatedUser); // Update context
            }

            toast.success('Profile updated successfully!');
            onProfileUpdate(data); // Refresh the parent Profile page
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
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">Edit profile</h2>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-1.5 bg-gray-900 text-white font-medium rounded-full hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Save
                    </button>
                </div>

                {/* Form Content */}
                <div className="overflow-y-auto custom-scrollbar">
                    {/* Banners & Images Container */}
                    <div className="relative mb-16">
                        {/* Cover Image */}
                        <div className="relative h-48 sm:h-56 bg-gradient-to-r from-gray-200 to-gray-300 w-full group overflow-hidden">
                            {formData.coverImage && (
                                <img
                                    src={formData.coverImage}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => coverImageRef.current?.click()}
                                    className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-all"
                                >
                                    <Camera size={24} />
                                </button>
                                {formData.coverImage && (
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                                        className="p-3 ml-4 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={coverImageRef}
                                onChange={(e) => handleFileChange(e, 'coverImage')}
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                            />
                        </div>

                        {/* Profile Picture */}
                        <div className="absolute -bottom-12 left-6">
                            <div className="relative w-28 h-28 rounded-full border-4 border-white bg-white group overflow-hidden shadow-sm">
                                <img
                                    src={formData.profilePic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                                    alt="Profile"
                                    className="w-full h-full object-cover rounded-full"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                                    onClick={() => profilePicRef.current?.click()}
                                >
                                    <Camera size={24} className="text-white" />
                                </div>
                                <input
                                    type="file"
                                    ref={profilePicRef}
                                    onChange={(e) => handleFileChange(e, 'profilePic')}
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="p-6 space-y-6">
                        <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                            <label htmlFor="username" className="absolute -top-2 left-2 -mt-px inline-block bg-white px-1 text-xs font-medium text-gray-500">
                                Name
                            </label>
                            <input
                                type="text"
                                name="username"
                                id="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                                placeholder="Your display name"
                            />
                        </div>

                        <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                            <label htmlFor="pronouns" className="absolute -top-2 left-2 -mt-px inline-block bg-white px-1 text-xs font-medium text-gray-500">
                                Pronouns
                            </label>
                            <input
                                type="text"
                                name="pronouns"
                                id="pronouns"
                                value={formData.pronouns}
                                onChange={handleChange}
                                className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                                placeholder="she/her, he/him, they/them"
                            />
                        </div>

                        <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                            <label htmlFor="bio" className="absolute -top-2 left-2 -mt-px inline-block bg-white px-1 text-xs font-medium text-gray-500">
                                Bio
                            </label>
                            <textarea
                                name="bio"
                                id="bio"
                                rows={4}
                                value={formData.bio}
                                onChange={handleChange}
                                className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm resize-none"
                                placeholder="Tell the world about yourself..."
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                {formData.bio.length}/250
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
