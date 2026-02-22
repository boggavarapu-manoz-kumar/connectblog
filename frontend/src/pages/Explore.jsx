import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Loader2, Flame, Hash } from 'lucide-react';
import { useEffect } from 'react';

const Explore = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['explore-trending'],
        queryFn: async () => {
            const { data } = await api.get('/posts?sort=trending&limit=10');
            return data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes (Best Ever)
    });

    const posts = data?.posts || [];

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                <p className="text-gray-500 font-bold">Discovering top content...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header Content */}
            <div className="mb-10 text-center sm:text-left">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-red-100 text-red-600 px-4 py-1.5 rounded-full font-bold text-sm mb-4">
                    <Flame size={16} className="text-red-500 animate-pulse" />
                    <span>Trending Now</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-connect font-black text-gray-900 leading-tight tracking-tight">
                    Explore ConnectBlog
                </h1>
                <p className="mt-2 text-gray-500 text-lg font-medium max-w-2xl">
                    Discover the most popular discussions, viral posts, and creative content spanning the entire platform right now.
                </p>
            </div>

            {/* Responsive Masonry Layout */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {posts.map((post) => {
                    const hasImage = post.image;

                    return (
                        <Link
                            key={post._id}
                            to={`/posts/${post._id}`}
                            className="break-inside-avoid group flex flex-col relative rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-1"
                        >
                            {hasImage ? (
                                <div className="relative w-full h-auto overflow-hidden">
                                    <img
                                        src={post.image}
                                        alt={post.title}
                                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 pt-16">
                                        <h3 className="text-white font-bold leading-tight line-clamp-2 text-lg drop-shadow-md">
                                            {post.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-3">
                                            <img
                                                src={post.author.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`}
                                                className="w-7 h-7 rounded-full object-cover border-2 border-white/80 shadow-sm"
                                                alt={post.author.username}
                                            />
                                            <span className="text-gray-100 text-sm font-medium drop-shadow-md">
                                                @{post.author.username}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 md:p-8 flex flex-col h-full bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30">
                                    <div className="flex-1">
                                        {post.hashtags && post.hashtags[0] && (
                                            <div className="text-xs font-black text-indigo-600 flex items-center gap-1 mb-3 uppercase tracking-widest bg-indigo-100/50 w-fit px-2 py-1 rounded-md">
                                                <Hash size={12} /> {post.hashtags[0]}
                                            </div>
                                        )}
                                        <h3 className="font-connect font-black text-2xl text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-3 leading-snug">
                                            {post.title}
                                        </h3>
                                        {post.content && (
                                            <div
                                                className="mt-4 text-sm text-gray-600 leading-relaxed line-clamp-4 prose prose-sm overflow-hidden"
                                                dangerouslySetInnerHTML={{
                                                    __html: post.content.substring(0, 200) + '...'
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={post.author.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=0ea5e9&color=fff&bold=true`}
                                                className="w-8 h-8 rounded-full object-cover shadow-sm"
                                                alt={post.author.username}
                                            />
                                            <span className="text-gray-900 font-bold text-sm">
                                                @{post.author.username}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Link>
                    )
                })}
            </div>

            {posts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-gray-900 mb-2">It's quiet out here</h3>
                    <p className="text-gray-500 text-lg">Be the first to create trending content!</p>
                </div>
            )}
        </div>
    );
};

export default Explore;
