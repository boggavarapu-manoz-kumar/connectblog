import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Image, Send, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CreatePost = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [hashtags, setHashtags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploadingImage(true);
        try {
            const { data } = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImageUrl(data.url);
            toast.success('Image uploaded successfully!');
        } catch (error) {
            toast.error('Failed to upload image. Try again.');
            console.error(error);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content) {
            toast.error('Title and Content are required');
            return;
        }

        setLoading(true);
        try {
            await api.post('/posts', {
                title,
                content,
                hashtags,
                image: imageUrl
            });
            toast.success('Post created successfully!');
            navigate('/');
        } catch (error) {
            toast.error('Failed to create post');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-10 px-4 sm:px-6 lg:px-8 flex justify-center">
            <div className="max-w-4xl w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">Create New Post</h2>
                    <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter a catchy title..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Content Rich Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all h-[300px] flex flex-col">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                placeholder="Write your amazing post here..."
                                className="h-full flex-1 flex flex-col"
                                modules={{
                                    toolbar: [
                                        [{ 'header': [1, 2, 3, false] }],
                                        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                        ['link', 'code-block'],
                                        ['clean']
                                    ],
                                }}
                            />
                        </div>
                    </div>

                    {/* Native Server Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Post Image</label>
                        <div className="flex items-center space-x-4">
                            <label className="cursor-pointer flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-100 hover:border-primary-400 transition-all">
                                <Image size={20} className="text-primary-500" />
                                <span className="font-semibold text-gray-600 text-sm">
                                    {uploadingImage ? 'Uploading to Server...' : 'Select an Image'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                />
                            </label>

                            {/* Explicit URL Fallback Option */}
                            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-all">
                                <span className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">OR URL</span>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 px-4 py-2.5 bg-transparent outline-none text-sm text-gray-700"
                                />
                            </div>
                        </div>

                        {imageUrl && (
                            <div className="mt-4 relative rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm">
                                <img src={imageUrl} alt="Preview" className="w-full h-48 md:h-64 object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImageUrl('')}
                                    className="absolute top-2 right-2 p-1.5 bg-gray-900/50 backdrop-blur-sm text-white rounded-full hover:bg-red-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Hashtags Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {hashtags.map((tag, index) => (
                                <span key={index} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm font-semibold rounded-full flex items-center gap-1 border border-primary-100 shadow-sm">
                                    #{tag}
                                    <button
                                        type="button"
                                        onClick={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                                        className="hover:bg-primary-200 rounded-full p-0.5 transition-colors text-primary-600 hover:text-primary-800"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    const newTag = tagInput.trim().replace(/^#/, '');
                                    if (newTag && !hashtags.includes(newTag)) {
                                        setHashtags([...hashtags, newTag]);
                                        setTagInput('');
                                    }
                                }
                            }}
                            placeholder="Add hashtags (press Enter or Comma)"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {loading ? (
                                'Publishing...'
                            ) : (
                                <>
                                    <Send size={18} />
                                    <span>Publish Post</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePost;
