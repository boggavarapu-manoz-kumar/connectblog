import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // Clear persistent cache in case corrupted data caused the crash
        try {
            localStorage.removeItem('CONNECT_BLOG_OFFLINE_CACHE');
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#f3f2ef] p-4 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full">
                        <div className="text-6xl mb-4">🛸</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                        <p className="text-gray-600 mb-6">Our server had a minor glitch. Please try refreshing the page.</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                        >
                            Refresh Page
                        </button>
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="w-full mt-3 text-gray-500 font-medium hover:text-gray-900 transition-colors"
                        >
                            Go back home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
