import { useState, useRef, useEffect } from 'react';
import { Search, X, Command, User as UserIcon, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const SearchBar = ({ className = "" }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);

    // Filter out search query from URL if it exists
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('search');
        if (q) setSearchQuery(q);
    }, []);

    // Handle Keyboard Shortcut (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch suggested users Debounced
    useEffect(() => {
        if (!searchQuery.trim() || !isFocused) {
            setSuggestedUsers([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const { data } = await api.get(`/users?search=${encodeURIComponent(searchQuery)}&limit=5`);
                setSuggestedUsers(data);
            } catch (err) {
                console.error('Failed to search users');
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, isFocused]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?search=${encodeURIComponent(searchQuery)}`);
        } else {
            navigate('/');
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        inputRef.current?.focus();
    };

    return (
        <div ref={wrapperRef} className={`relative group flex items-center transition-all duration-300 ${isFocused ? 'w-full md:w-[400px]' : 'w-full md:w-[320px]'} ${className}`}>
            <form
                onSubmit={handleSearch}
                className="w-full relative"
            >
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-200 ${isFocused ? 'text-primary-500' : 'text-gray-400'}`}>
                    <Search size={18} strokeWidth={2.5} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search posts, topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    className={`block w-full pl-11 pr-12 py-2.5 bg-gray-50/50 border-2 rounded-2xl leading-5 transition-all duration-300 placeholder-gray-400
                    ${isFocused
                            ? 'bg-white border-primary-500 shadow-[0_0_15px_rgba(14,165,233,0.15)] ring-4 ring-primary-50/50 outline-none'
                            : 'border-transparent hover:bg-gray-100 hover:border-gray-200 focus:outline-none'
                        } sm:text-sm`}
                />

                {/* Icons on the right */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1.5 pointer-events-none">
                    {isSearching ? (
                        <Loader2 size={16} className="text-primary-500 animate-spin" />
                    ) : searchQuery ? (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-all pointer-events-auto"
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <div className={`hidden md:flex items-center space-x-0.5 px-1.5 py-0.5 bg-gray-200/50 border border-gray-300/50 rounded-md text-[10px] font-bold text-gray-400 transition-opacity duration-300 ${isFocused ? 'opacity-0' : 'opacity-100'}`}>
                            <Command size={10} />
                            <span>K</span>
                        </div>
                    )}
                </div>
            </form>

            {/* User Suggestions Dropdown */}
            {isFocused && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-gray-50 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <UserIcon size={12} />
                        People
                    </div>
                    {isSearching ? (
                        <div className="p-4 text-center text-sm text-gray-500 flex justify-center py-6">
                            <Loader2 size={20} className="animate-spin text-primary-500" />
                        </div>
                    ) : suggestedUsers.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {suggestedUsers.map(u => (
                                <Link
                                    to={`/profile/${u._id}`}
                                    key={u._id}
                                    onClick={() => setIsFocused(false)}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50/50 last:border-0"
                                >
                                    <img
                                        src={u.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=efefef&color=333&bold=true`}
                                        alt={u.username}
                                        className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=efefef&color=333&bold=true`;
                                        }}
                                    />
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-bold text-sm text-gray-900 truncate tracking-tight">{u.username}</div>
                                        <div className="text-xs font-semibold text-gray-400 truncate">
                                            {u.followersCount || (u.followers ? u.followers.length : 0)} followers
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-sm text-gray-500 font-medium">
                            No users found for "{searchQuery}"
                        </div>
                    )}
                    <button
                        onClick={handleSearch}
                        className="w-full p-3 bg-gray-50 hover:bg-primary-50 text-primary-600 text-sm font-bold text-center transition-colors border-t border-gray-100 flex items-center justify-center gap-2"
                    >
                        <Search size={14} />
                        Search all posts for "{searchQuery}"
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
