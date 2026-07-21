import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/layout/Navbar';
import { lazy, Suspense, useEffect } from 'react';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const EditPost = lazy(() => import('./pages/EditPost'));
const Profile = lazy(() => import('./pages/Profile'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const Explore = lazy(() => import('./pages/Explore'));
const Notifications = lazy(() => import('./pages/Notifications'));
import ScrollToTop from './components/layout/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient } from '@tanstack/react-query';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 2 min default staleTime — individual queries override as needed
            staleTime: 1000 * 60 * 2,
            // Keep unused data in memory for 24h (fast back-navigation without re-fetch)
            gcTime: 1000 * 60 * 60 * 24,
            // Don't re-fetch just because the user switched tabs — reduces cold hits on Render
            refetchOnWindowFocus: false,
            // Refetch when component mounts so navigating back gives fresh data
            refetchOnMount: true,
            retry: 1, // was 2 — one retry is enough; 2 retries adds 2x latency on cold start
        },
    },
});

const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'CONNECT_BLOG_OFFLINE_CACHE',
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="min-h-screen bg-[#f3f2ef] flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-[#0ea5e9]/20 border-t-[#0ea5e9] rounded-full animate-spin"></div>
            <div className="text-[#0a66c2] font-semibold text-lg font-connect tracking-tight animate-pulse underline decoration-[#0ea5e9] decoration-2 underline-offset-4">ConnectBlog</div>
            <p className="text-gray-500 text-sm font-medium">Securing your connection...</p>
        </div>
    );

    if (!user) return <Navigate to="/login" />;

    return children;
};

// Listens for 401 Unauthorized events from Axios and redirects smoothly
const AuthRedirectHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleUnauthorized = () => {
            if (location.pathname !== '/login') {
                navigate('/login');
            }
        };
        window.addEventListener('unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, [navigate, location]);

    return null;
};

function App() {
    return (
        <HelmetProvider>
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
        >
            <AuthProvider>
                <ErrorBoundary>
                    <SocketProvider>
                        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                            <AuthRedirectHandler />
                            <ScrollToTop />
                            <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
                                <Navbar />
                                <main className="flex-1">
                                    <Suspense fallback={
                                        <div className="min-h-screen bg-[#f3f2ef] flex flex-col items-center justify-center space-y-4">
                                            <div className="w-16 h-16 border-4 border-[#0ea5e9]/20 border-t-[#0ea5e9] rounded-full animate-spin"></div>
                                        </div>
                                    }>
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
                                    </Suspense>
                                </main>
                            </div>
                        </BrowserRouter>
                    </SocketProvider>
                </ErrorBoundary>
            </AuthProvider>

        </PersistQueryClientProvider>
        </HelmetProvider>
    );
}

export default App;
