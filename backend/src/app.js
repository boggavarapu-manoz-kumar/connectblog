const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

const app = express();
app.use(compression());

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
// 🚀 Professional Algorithm 3: Smart Cache Headers
// Instructs the browser to cache GET requests locally for 30 seconds
// This drastically reduces server load and handles high traffic on free tiers.
app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    } else {
        res.set('Cache-Control', 'no-store');
    }
    next();
});
// Allow fetching of local uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Helmet configuration modified to allow local images to load without strict Cross-Origin-Resource-Policy blocking
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));

// Basic Route
app.get('/', (req, res) => {
    res.send('ConnectBlog API is running...');
});

// Error Handling Middleware (Placeholder)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
