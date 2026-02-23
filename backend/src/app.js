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

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Security and Logging
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

// Basic Status Route
app.get('/', (req, res) => {
    res.send('ConnectBlog API is running...');
});

// ─── Health Check Endpoint (used by keep-alive pinger) ────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'ConnectBlog API',
        uptime: `${Math.floor(process.uptime())}s`,
        timestamp: new Date().toISOString(),
        message: '🟢 Server is awake and healthy'
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
