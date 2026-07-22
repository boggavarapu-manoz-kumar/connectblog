import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Loader2, Flame, Hash } from 'lucide-react';
import { useEffect } from 'react';
import ExploreCard from '../components/post/ExploreCard';

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

            {/* Instagram Style Square Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
                {posts.map((post) => (
                    <ExploreCard key={post._id} post={post} />
                ))}
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
