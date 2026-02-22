import { useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import PostCard from '../components/post/PostCard';
import { Loader2, SearchX, ArrowLeft, User as UserIcon } from 'lucide-react';
import SearchHero from '../components/common/SearchHero';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('search');

    // Fetch Search Users (separate query)
    const { data: searchUsers = [] } = useQuery({
        queryKey: ['users-search', searchQuery],
        queryFn: async () => {
            if (!searchQuery) return [];
            const { data } = await api.get(`/users?search=${encodeURIComponent(searchQuery)}&limit=10`);
            return data;
        },
        enabled: !!searchQuery,
        staleTime: 1000 * 60 * 10, // Users search result stays fresh for 10 mins
    });

    // Main Posts Feed with TanStack Query Cache
    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
        refetch
    } = useInfiniteQuery({
        queryKey: ['posts-feed', searchQuery],
        queryFn: async ({ pageParam = 1 }) => {
            const endpoint = searchQuery
                ? `/posts?page=${pageParam}&limit=5&search=${encodeURIComponent(searchQuery)}`
                : `/posts?page=${pageParam}&limit=5`;
            const { data } = await api.get(endpoint);
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            // If last page has 5 items (our limit), there's likely more
            return lastPage.length === 5 ? allPages.length + 1 : undefined;
        },
        staleTime: 1000 * 60 * 2, // 2 mins stale time for main feed
    });

    const observer = useRef();
    const lastPostElementRef = useCallback(node => {
        if (status === 'pending' || isFetchingNextPage) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });
        if (node) observer.current.observe(node);
    }, [status, isFetchingNextPage, hasNextPage, fetchNextPage]);

    // Scroll to top on search query change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [searchQuery]);

    const allPosts = data?.pages.flatMap(page => page) || [];

    return (
        <div className="pb-12">
            {!searchQuery && <SearchHero />}

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {status === 'pending' ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-6" />
                        <p className="text-gray-500 font-bold text-lg animate-pulse">Fetching the best stories...</p>
                    </div>
                ) : status === 'error' ? (
                    <div className="py-20 flex flex-col items-center justify-center bg-gray-50 px-4 rounded-3xl border border-gray-100 italic">
                        <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center shadow-sm">
                            <p className="text-red-600 font-bold text-lg mb-2">Oops! Something went wrong</p>
                            <p className="text-red-400 mb-6">{error.message || 'Failed to load posts.'}</p>
                            <button onClick={() => refetch()} className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200">
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {searchQuery ? (
                            <div className="mb-10 text-center sm:text-left">
                                <button
                                    onClick={() => navigate('/')}
                                    className="group flex items-center space-x-2 text-gray-500 hover:text-primary-600 transition-all duration-200 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-x-1 mb-6"
                                >
                                    <ArrowLeft size={18} className="group-hover:animate-pulse" />
                                    <span>All Stories</span>
                                </button>

                                <div className="inline-flex items-center px-4 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-bold mb-4">
                                    Search Results
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-connect font-black text-gray-900 leading-tight">
                                    Results for <span className="text-primary-600">"{searchQuery}"</span>
                                </h1>
                                <p className="text-gray-500 mt-3 font-medium text-lg mb-6">
                                    We found {allPosts.length} {allPosts.length === 1 ? 'post' : 'posts'} matching your search.
                                </p>

                                {searchUsers.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8 text-left">
                                        <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
                                            <UserIcon size={18} className="text-primary-500" />
                                            <h3>People</h3>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
                                            {searchUsers.map(user => (
                                                <Link
                                                    to={`/profile/${user._id}`}
                                                    key={user._id}
                                                    className="flex flex-col items-center flex-shrink-0 w-24 group"
                                                >
                                                    <img
                                                        src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=efefef&color=333&bold=true`}
                                                        alt={user.username}
                                                        className="w-16 h-16 rounded-full object-cover border-2 border-transparent group-hover:border-primary-500 transition-all shadow-sm mb-2"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=efefef&color=333&bold=true`;
                                                        }}
                                                    />
                                                    <span className="text-sm font-semibold text-gray-900 truncate w-full text-center group-hover:text-primary-600 transition-colors">
                                                        {user.username}
                                                    </span>
                                                    <span className="text-xs text-gray-500 truncate w-full text-center">
                                                        {user.followersCount || 0} followers
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="h-1 w-20 bg-primary-600 rounded-full mx-auto sm:mx-0"></div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                                <h2 className="text-2xl font-connect font-black text-gray-900">Latest Stories</h2>
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-primary-300 rounded-full delay-75 animate-pulse"></div>
                                    <div className="w-2 h-2 bg-primary-100 rounded-full delay-150 animate-pulse"></div>
                                </div>
                            </div>
                        )}

                        {allPosts.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                                {searchQuery ? (
                                    <>
                                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                            <SearchX className="text-gray-400" size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">No matching stories</h3>
                                        <p className="text-gray-500 mt-2 max-w-xs mx-auto">Try double checking your spelling or using different keywords.</p>
                                    </>
                                ) : (
                                    <div className="py-10">
                                        <p className="text-gray-500 text-lg font-medium">No posts yet. Be the first to share a story!</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {allPosts.map((post, index) => {
                                    const prefetchProfile = () => {
                                        const authorId = post.author?._id || post.author;
                                        queryClient.prefetchQuery({
                                            queryKey: ['profile', authorId],
                                            queryFn: async () => {
                                                const { data } = await api.get(`/users/${authorId}`);
                                                return data;
                                            },
                                        });
                                    };

                                    if (allPosts.length === index + 1) {
                                        return (
                                            <div ref={lastPostElementRef} key={post._id} onMouseEnter={prefetchProfile}>
                                                <PostCard post={post} onPostUpdate={() => refetch()} />
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={post._id} onMouseEnter={prefetchProfile}>
                                                <PostCard post={post} onPostUpdate={() => refetch()} />
                                            </div>
                                        );
                                    }
                                })}

                                {isFetchingNextPage && (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
                                    </div>
                                )}

                                {!hasNextPage && allPosts.length > 0 && (
                                    <div className="text-center py-12">
                                        <div className="inline-block px-6 py-2 bg-gray-100 text-gray-400 rounded-full text-sm font-bold">
                                            Fin. You've seen it all!
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Home;
