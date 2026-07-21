import axios from 'axios';
import toast from 'react-hot-toast';

// In production (AWS Amplify), VITE_API_URL = your App Runner backend URL
// In local dev, it falls back to '/api' (handled by Vite proxy)
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If we get a 401 Unauthorized from any endpoint OTHER than /auth/me or /auth/login
        if (error.response?.status === 401) {
            const isAuthEndpoint = error.config?.url?.includes('/auth/me') || error.config?.url?.includes('/auth/login');
            
            if (!isAuthEndpoint) {
                // Clear any stale local user state just in case
                localStorage.removeItem('user');
                
                toast.error("Please login to perform this action.");
                
                // Trigger smooth React Router redirect instead of hard reload
                window.dispatchEvent(new CustomEvent('unauthorized'));
            }
        }
        return Promise.reject(error);
    }
);

export default api;
