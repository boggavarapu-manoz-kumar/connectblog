import { useState, useRef } from 'react';
import { Camera, X, Loader2, Check } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const EditProfileModal = ({ isOpen, onClose, userProfile, onProfileUpdate }) => {
    const { user, updateUser } = useAuth(); // Needed to update context user immediately

    const [formData, setFormData] = useState({
        username: userProfile?.username || '',
        bio: userProfile?.bio || '',
        pronouns: userProfile?.pronouns || '',
        profilePic: userProfile?.profilePic || '',
        coverImage: userProfile?.coverImage || '',
        socialLinks: userProfile?.socialLinks || {
            instagram: '',
            facebook: '',
            linkedin: '',
            leetcode: '',
            portfolio: ''
        }
    });

    const [loading, setLoading] = useState(false);

    // Crop States
    const [cropSource, setCropSource] = useState(null);
    const [cropType, setCropType] = useState(null); // 'profilePic' or 'coverImage'
    const [crop, setCrop] = useState();
    const imgRef = useRef(null);

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
            setCropSource(reader.result);
            setCropType(field);
        };
        reader.readAsDataURL(file);
    };

    const handleImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        const aspect = cropType === 'profilePic' ? 1 : 3 / 1; // Square vs Banner aspect

        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height),
            width,
            height
        );
        setCrop(initialCrop);
        imgRef.current = e.currentTarget;
    };

    const applyCrop = () => {
        if (!imgRef.current || !crop.width || !crop.height) return;

        const canvas = document.createElement('canvas');

        // Calculate crop bounds robustly for precise natural rendering
        let pixelCrop;
        if (crop.unit === '%') {
            pixelCrop = {
                x: (crop.x / 100) * imgRef.current.naturalWidth,
                y: (crop.y / 100) * imgRef.current.naturalHeight,
                width: (crop.width / 100) * imgRef.current.naturalWidth,
                height: (crop.height / 100) * imgRef.current.naturalHeight
            };
        } else {
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
            pixelCrop = {
                x: crop.x * scaleX,
                y: crop.y * scaleY,
                width: crop.width * scaleX,
                height: crop.height * scaleY
            };
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            imgRef.current,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        const base64Image = canvas.toDataURL('image/jpeg');
        setFormData(prev => ({ ...prev, [cropType]: base64Image }));

        // Reset crop
        setCropSource(null);
        setCropType(null);
    };

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
            const { data } = await api.put('/users/profile', formData);

            // Update auth context immediately so Navbar matches
            if (user) {
                const updatedUser = { ...user, ...data };
                updateUser(updatedUser);
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
                {cropSource ? (
                    // CROP MODAL OVERLAY
                    <div className="absolute inset-0 z-20 bg-gray-900 flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 text-white">
                            <button
                                onClick={() => setCropSource(null)}
                                className="p-1 rounded-full hover:bg-gray-800 transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <h2 className="text-lg font-bold">Adjust {cropType === 'profilePic' ? 'Profile Picture' : 'Banner'}</h2>
                            <button
                                onClick={applyCrop}
                                className="p-1.5 bg-primary-600 rounded-full hover:bg-primary-500 transition-colors text-white"
                            >
                                <Check size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black">
                            <ReactCrop
                                crop={crop}
                                onChange={c => setCrop(c)}
                                aspect={cropType === 'profilePic' ? 1 : 3 / 1}
                                circularCrop={cropType === 'profilePic'}
                                className="max-h-full"
                            >
                                <img
                                    src={cropSource}
                                    onLoad={handleImageLoad}
                                    alt="Crop me"
                                    className="max-w-full max-h-[60vh] object-contain"
                                />
                            </ReactCrop>
                        </div>
                    </div>
                ) : null}

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
                                    src={formData.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username || 'User')}&background=0ea5e9&color=fff&bold=true`}
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

                        {/* Social Links Section */}
                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Social Links</h3>
                            <div className="space-y-4">
                                <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                                    <label className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-500">Instagram URL</label>
                                    <input type="text" name="instagram" value={formData.socialLinks.instagram || ''} onChange={handleSocialChange} className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm" placeholder="https://instagram.com/..." />
                                </div>
                                <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                                    <label className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-500">Facebook URL</label>
                                    <input type="text" name="facebook" value={formData.socialLinks.facebook || ''} onChange={handleSocialChange} className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm" placeholder="https://facebook.com/..." />
                                </div>
                                <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                                    <label className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-500">LinkedIn URL</label>
                                    <input type="text" name="linkedin" value={formData.socialLinks.linkedin || ''} onChange={handleSocialChange} className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm" placeholder="https://linkedin.com/in/..." />
                                </div>
                                <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                                    <label className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-500">LeetCode URL</label>
                                    <input type="text" name="leetcode" value={formData.socialLinks.leetcode || ''} onChange={handleSocialChange} className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm" placeholder="https://leetcode.com/u/..." />
                                </div>
                                <div className="relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all bg-white">
                                    <label className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-500">Portfolio URL</label>
                                    <input type="text" name="portfolio" value={formData.socialLinks.portfolio || ''} onChange={handleSocialChange} className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm" placeholder="https://yourwebsite.com" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
