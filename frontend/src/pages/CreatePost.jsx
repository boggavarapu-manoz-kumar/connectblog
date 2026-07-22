import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Image, Send, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { formatImageUrl } from '../utils/formatUrl';


const CreatePost = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [hashtags, setHashtags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    const createPostMutation = useMutation({
        mutationFn: async (postData) => {
            const { data } = await api.post('/posts', postData);
            return data; // returns full post with populated author
        },
        onSuccess: (newPost) => {
            const authorId = user?._id || user?.id;

            // 1. Inject new post at top of feed cache (instant appear)
            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: [
                        {
                            ...old.pages[0],
                            posts: [newPost, ...(old.pages[0]?.posts || [])]
                        },
                        ...old.pages.slice(1)
                    ]
                };
            });

            // 2. Inject into profile posts cache
            queryClient.setQueriesData({ queryKey: ['profile-posts', authorId] }, old => {
                if (!old) return { posts: [newPost] };
                return { ...old, posts: [newPost, ...(old.posts || [])] };
            });

            // 3. Invalidate in background for accuracy
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile', authorId] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts', authorId] });

            toast.success('Post published!');
            navigate('/');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create post');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error('Title and Content are required');
            return;
        }

        createPostMutation.mutate({
            title,
            content,
            hashtags,
            image: imageUrl
        });
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter a catchy title..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden h-[300px] flex flex-col">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                placeholder="Write your amazing post here..."
                                className="h-full flex-1 flex flex-col"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Post Image</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="Paste Image URL..."
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm transition-colors focus:border-primary-500 focus:bg-white"
                            />
                        </div>

                        {imageUrl && (
                            <div className="mt-4 relative rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm">
                                <img src={formatImageUrl(imageUrl)} alt="Preview" className="w-full h-64 object-cover" />


                                <button
                                    type="button"
                                    onClick={() => setImageUrl('')}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {hashtags.map((tag, index) => (
                                <span key={index} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm font-semibold rounded-full flex items-center gap-1">
                                    #{tag}
                                    <button
                                        type="button"
                                        onClick={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                                        className="text-primary-600 hover:text-primary-800"
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
                            placeholder="Add tags..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none"
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={createPostMutation.isPending}
                            className="flex items-center space-x-2 px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 shadow-md"
                        >
                            {createPostMutation.isPending ? 'Publishing...' : <><Send size={18} /><span>Publish Story</span></>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePost;
