import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LogOut,
    PenSquare,
    MessageSquare,
    User as UserIcon,
    Settings,
    Bookmark,
    ChevronDown
} from 'lucide-react';
import SearchBar from './SearchBar';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userAvatar = user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}&background=0ea5e9&color=fff&bold=true`;

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                            <div className="bg-gradient-to-tr from-primary-400 to-primary-600 p-2 rounded-xl shadow-lg text-white transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                                <MessageSquare size={20} />
                            </div>
                            <span className="text-[24px] sm:text-[26px] font-connect font-bold tracking-tight text-gray-900 group-hover:opacity-90 transition-opacity hidden md:block">
                                Connect<span className="text-primary-600 font-blog italic ml-0.5">Blog</span>
                            </span>
                        </Link>
                    </div>

                    {/* Search Component */}
                    <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
                        <div className="max-w-lg w-full lg:max-w-xs flex items-center">
                            <SearchBar />
                        </div>
                    </div>

                    {/* Navbar Action Icons */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {user ? (
                            <>
                                <Link
                                    to="/create-post"
                                    className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm font-bold text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
                                >
                                    <PenSquare size={18} />
                                    <span>Write</span>
                                </Link>

                                {/* User Dropdown Menu */}
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="flex items-center space-x-2 p-1 rounded-2xl hover:bg-gray-100 transition-all duration-200 group"
                                    >
                                        <div className="relative">
                                            <img
                                                src={userAvatar}
                                                alt={user.username}
                                                className="h-9 w-9 rounded-full object-cover border-2 border-transparent group-hover:border-primary-500 transition-all shadow-sm"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0ea5e9&color=fff&bold=true`;
                                                }}
                                            />
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                                        </div>
                                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Card */}
                                    {isMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-64 bg-white rounded-[1.8rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[60] animate-in fade-in zoom-in duration-200">
                                            <div className="px-5 py-4 border-b border-gray-50 mb-2">
                                                <p className="text-sm font-black text-gray-900 truncate">{user.username}</p>
                                                <p className="text-[10px] font-bold text-gray-400 truncate mt-0.5 uppercase tracking-widest italic">{user.email}</p>
                                            </div>

                                            <Link
                                                to="/profile"
                                                className="flex items-center space-x-3 px-5 py-3 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-all font-bold"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <UserIcon size={18} className="text-primary-400" />
                                                <span>My Profile</span>
                                            </Link>

                                            <Link
                                                to="/profile"
                                                state={{ activeTab: 'saved' }}
                                                className="flex items-center space-x-3 px-5 py-3 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-all font-bold"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <Bookmark size={18} className="text-primary-400" />
                                                <span>Bookmarks</span>
                                            </Link>

                                            <Link
                                                to="/settings"
                                                className="flex items-center space-x-3 px-5 py-3 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-all font-bold"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <Settings size={18} className="text-primary-400" />
                                                <span>Settings</span>
                                            </Link>

                                            <div className="border-t border-gray-50 my-2 mx-5"></div>

                                            <button
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    handleLogout();
                                                }}
                                                className="w-full flex items-center space-x-3 px-5 py-3 text-sm text-red-500 hover:bg-red-50 transition-all font-black uppercase tracking-widest text-[10px]"
                                            >
                                                <LogOut size={18} />
                                                <span>Terminate Session</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link
                                    to="/login"
                                    className="text-gray-600 hover:text-primary-600 text-sm font-bold px-3 py-2 transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-md hover:shadow-lg hover:shadow-primary-100 text-sm font-bold"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
