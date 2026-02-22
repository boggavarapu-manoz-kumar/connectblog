const NodeCache = require('node-cache');

// Create a new cache instance
const cache = new NodeCache({
    stdTTL: 300,
    checkperiod: 600,
    useClones: false
});

/**
 * Middleware for caching GET requests
 * Handles personalization by adding userId to the cache key if present
 */
const cacheMiddleware = (duration) => (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    // Create a unique key based on URL and User ID (for personalization)
    const userId = req.user ? req.user.id : 'public';
    const key = `__express__${userId}__${req.originalUrl || req.url}`;

    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        // Set a header to indicate cache hit
        res.set('X-Cache', 'HIT');
        try {
            // If it's an object, stringify it
            const body = typeof cachedResponse === 'string' ? cachedResponse : JSON.stringify(cachedResponse);
            return res.send(body);
        } catch (e) {
            return res.send(cachedResponse);
        }
    } else {
        res.set('X-Cache', 'MISS');
        // Store the original send function
        const originalSend = res.send.bind(res);

        res.send = (body) => {
            // Only cache successful JSON responses
            if (res.statusCode === 200) {
                cache.set(key, body, duration);
            }
            return originalSend(body);
        };
        next();
    }
};

/**
 * Invalidate specific cache patterns
 * example: invalidateCache('profile') or invalidateCache(req.user.id)
 */
const invalidateCache = (pattern) => {
    const keys = cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    if (keysToDelete.length > 0) {
        cache.del(keysToDelete);
    }
};

module.exports = {
    cache,
    cacheMiddleware,
    invalidateCache
};
