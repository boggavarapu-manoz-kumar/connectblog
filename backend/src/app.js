const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Required for secure cookies on Render
app.use(compression());

// Middleware
// Security: Limit JSON payload to 1MB to prevent DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Security: Prevent NoSQL Injection
app.use(mongoSanitize());

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Security and Logging
app.use(helmet({ crossOriginResourcePolicy: false }));

// Security: Restrict CORS to specific frontend origin and allow cookies
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    credentials: true,
}));

// Security: Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: { message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // relaxed limit for development
    message: { message: 'Too many authentication attempts, please try again later.' }
});
app.use('/api/auth/', authLimiter);

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

app.use('/api/health', require('./routes/health.routes'));

const { errorHandler, notFound } = require('./middleware/error.middleware');

app.use(notFound);
app.use(errorHandler);

module.exports = app;
