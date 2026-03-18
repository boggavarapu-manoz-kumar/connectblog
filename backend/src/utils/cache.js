const NodeCache = require('node-cache');

/**
 * ──────────────────────────────────────────────
 *  ConnectBlog — Tiered In-Memory Cache
 *
 *  TTL tiers (seconds):
 *    SHORT   30s  – feed (changes often)
 *    MEDIUM  120s – single post / user profile
 *    LONG    600s – explore / trending (rarely changes)
 *
 *  Key format:
 *    __express__{userId | 'public'}__{originalUrl}
 * ──────────────────────────────────────────────
 */
const cache = new NodeCache({
    stdTTL: 120,      // default 2 min
    checkperiod: 300, // prune expired every 5 min (was 600 – too slow)
    useClones: false  // avoid JSON clone overhead on read
});

// ─── Middleware ────────────────────────────────────────────────────────────────
const cacheMiddleware = (duration) => (req, res, next) => {
    if (req.method !== 'GET') return next();

    const userId = req.user ? req.user.id : 'public';
    const key = `__express__${userId}__${req.originalUrl || req.url}`;

    const hit = cache.get(key);
    if (hit !== undefined) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(typeof hit === 'string' ? hit : JSON.stringify(hit));
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json so we cache the serialised body once
    const _json = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode === 200) {
            // Store as string to avoid re-serialisation cost on cache hits
            cache.set(key, JSON.stringify(body), duration);
        }
        return _json(body);
    };

    next();
};

// ─── Invalidation ─────────────────────────────────────────────────────────────
/**
 * Invalidate all cache entries whose key contains the given pattern.
 * @param {string} pattern  a substring to match (userId, 'api/posts', postId…)
 */
const invalidateCache = (pattern) => {
    if (!pattern) return;
    const keys = cache.keys();
    const toDelete = keys.filter(k => k.includes(pattern));
    if (toDelete.length > 0) {
        cache.del(toDelete);
    }
};

/**
 * Wipe the entire in-memory cache.
 * Use sparingly – only after bulk operations.
 */
const flushCache = () => cache.flushAll();

module.exports = {
    cache,
    cacheMiddleware,
    invalidateCache,
    flushCache
};
