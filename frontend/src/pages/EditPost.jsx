import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Image, Send, X, Loader2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditPost = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [fetching, setFetching] = useState(true);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        const fetchPost = async () => {
            try {
                // Read from cache first for instant load, fallback to API
                const cached = queryClient.getQueryData(['post', id]);
                if (cached) {
                    setTitle(cached.title);
                    setContent(cached.content);
                    setImageUrl(cached.image || '');
                    setFetching(false);
                    return;
                }
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
    }, [id, navigate, queryClient]);

    const updateMutation = useMutation({
        mutationFn: async (postData) => {
            const { data } = await api.put(`/posts/${id}`, postData);
            return data;
        },
        onSuccess: (updatedPost) => {
            const authorId = user?._id || user?.id;

            // 1. Update the single post cache instantly (zero latency)
            queryClient.setQueryData(['post', id], updatedPost);

            // 2. Patch feed cache in-place — no full refetch
            queryClient.setQueriesData({ queryKey: ['posts-feed'] }, old => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        posts: page.posts?.map(p => p._id === id ? { ...p, ...updatedPost } : p) || []
                    }))
                };
            });

            // 3. Patch profile posts cache in-place
            queryClient.setQueriesData({ queryKey: ['profile-posts'] }, old => {
                if (!old?.posts) return old;
                return {
                    ...old,
                    posts: old.posts.map(p => p._id === id ? { ...p, ...updatedPost } : p)
                };
            });

            // 4. Background invalidation so next visit gets fresh data
            queryClient.invalidateQueries({ queryKey: ['posts-feed'] });
            queryClient.invalidateQueries({ queryKey: ['profile-posts', authorId] });
            queryClient.invalidateQueries({ queryKey: ['post', id] });

            toast.success('Post updated!');
            navigate(`/posts/${id}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update post');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !content) {
            toast.error('Title and Content are required');
            return;
        }
        updateMutation.mutate({ title, content, image: imageUrl });
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

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
                        >
                            {updateMutation.isPending ? (
                                <><Loader2 size={18} className="animate-spin" /><span>Saving...</span></>
                            ) : (
                                <><Send size={18} /><span>Save Changes</span></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPost;
