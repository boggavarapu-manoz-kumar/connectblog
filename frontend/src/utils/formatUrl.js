/**
 * Ensures an image URL is correctly formatted.
 * If it's a relative path (starting with /uploads), it prefixes it with the backend URL.
 * @param {string} url - The URL to format
 * @returns {string} - The formatted URL
 */
export const formatImageUrl = (url) => {
    // 1. Handle missing/null URLs with a clean, branded fallback
    if (!url) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
    
    // 2. Already absolute? Return as-is (Cloudinary/External)
    if (url.startsWith('http')) return url;
    
    // 3. Local uploads must be prefixed with backend URL (handled by proxy in dev)
    if (url.startsWith('/uploads')) {
        const backendUrl = import.meta.env.VITE_API_URL || '';
        // Remove trailing slash if present in backendUrl to prevent double //
        const cleanBackend = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
        return `${cleanBackend}${url}`;
    }
    
    // 4. Relative paths that aren't /uploads
    if (url.startsWith('/')) {
        const backendUrl = import.meta.env.VITE_API_URL || '';
        const cleanBackend = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
        return `${cleanBackend}${url}`;
    }

    return url;
};
