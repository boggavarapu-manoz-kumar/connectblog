import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import Settings from './pages/Settings';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/layout/ScrollToTop';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (!user) return <Navigate to="/login" />;

    return children;
};

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <ScrollToTop />
                    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
                        <Navbar />
                        <main className="flex-1">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/explore" element={<Explore />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route
                                    path="/create-post"
                                    element={
                                        <ProtectedRoute>
                                            <CreatePost />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/edit-post/:id"
                                    element={
                                        <ProtectedRoute>
                                            <EditPost />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/profile"
                                    element={
                                        <ProtectedRoute>
                                            <Profile />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/settings"
                                    element={
                                        <ProtectedRoute>
                                            <Settings />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/notifications"
                                    element={
                                        <ProtectedRoute>
                                            <Notifications />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="/profile/:id" element={<Profile />} />
                                <Route path="/posts/:id" element={<PostDetail />} />
                            </Routes>
                        </main>
                        <Toaster position="top-center" />
                    </div>
                </BrowserRouter>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
