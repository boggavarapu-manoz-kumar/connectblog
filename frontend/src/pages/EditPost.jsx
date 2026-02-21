import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Image, Send, X, Loader2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditPost = () => {
    const { id } = useParams();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const { data } = await api.get(`/posts/${id}`);
                setTitle(data.title);
                setContent(data.content);
                setImageUrl(data.image || '');
            } catch (error) {
                toast.error('Failed to load post data');
                navigate('/');
            } finally {
                setFetching(false);
            }
        };
        fetchPost();
    }, [id, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content) {
            toast.error('Title and Content are required');
            return;
        }

        setLoading(true);
        try {
            await api.put(`/posts/${id}`, {
                title,
                content,
                image: imageUrl
            });
            toast.success('Post updated successfully!');
            navigate(`/posts/${id}`);
        } catch (error) {
            toast.error('Failed to update post');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="py-10 px-4 sm:px-6 lg:px-8 flex justify-center bg-gray-50 min-h-screen">
            <div className="max-w-4xl w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">Edit Post</h2>
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
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
                                placeholder="Edit your post content..."
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

                    {/* Image URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Image size={20} className="text-gray-500" />
                            </div>
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        {imageUrl && (
                            <div className="mt-4 relative rounded-lg overflow-hidden border border-gray-200">
                                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || fetching}
                            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {loading ? (
                                'Saving Changes...'
                            ) : (
                                <>
                                    <Send size={18} />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPost;
