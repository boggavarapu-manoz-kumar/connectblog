import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, PenSquare } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-bold text-primary-600">ConnectBlog</span>
                        </Link>
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <Link
                                    to="/create-post"
                                    className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition-colors"
                                >
                                    <PenSquare size={20} />
                                    <span className="hidden sm:inline">Write</span>
                                </Link>

                                <Link
                                    to="/profile"
                                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                                >
                                    <img
                                        src={user.profilePic}
                                        alt="Profile"
                                        className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                    />
                                    <span className="hidden sm:inline font-medium">{user.username}</span>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-50"
                                    title="Logout"
                                >
                                    <LogOut size={20} />
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link
                                    to="/login"
                                    className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg text-sm font-medium"
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
