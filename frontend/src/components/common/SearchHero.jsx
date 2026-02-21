import { Search, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchHero = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/?search=${encodeURIComponent(query)}`);
        }
    };

    const trendingTags = ['Technology', 'Design', 'Coding', 'Life', 'Future'];

    return (
        <div className="relative overflow-hidden bg-white border-b border-gray-100 mb-8 pt-10 pb-16 px-4">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="relative max-w-3xl mx-auto text-center">
                <h1 className="text-4xl sm:text-5xl font-connect font-black text-gray-900 mb-6 tracking-tight">
                    Discovery begins <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">here.</span>
                </h1>
                <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto font-medium">
                    The best place to share your thoughts, connect with others, and discover amazing stories from the community.
                </p>

                <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
                        <Search size={24} strokeWidth={2.5} />
                    </div>
                    <input
                        type="text"
                        placeholder="What are you looking for today?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="block w-full pl-14 pr-32 py-5 bg-white border-2 border-gray-100 rounded-[2rem] text-lg shadow-xl shadow-gray-200/50 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all placeholder-gray-400 font-medium"
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-2.5 bottom-2.5 px-8 bg-primary-600 text-white font-bold rounded-[1.5rem] hover:bg-primary-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                        Search
                    </button>
                </form>

                <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
                    <div className="flex items-center text-gray-400 text-sm font-bold uppercase tracking-wider mr-2">
                        <TrendingUp size={14} className="mr-1.5" />
                        Trending:
                    </div>
                    {trendingTags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => navigate(`/?search=${encodeURIComponent(tag)}`)}
                            className="px-4 py-1.5 bg-gray-50 text-gray-600 text-sm font-semibold rounded-full border border-gray-100 hover:bg-white hover:border-primary-500 hover:text-primary-600 hover:shadow-sm transition-all"
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchHero;
