require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startKeepAlive } = require('./src/utils/keepAlive');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB().then(() => {
    const seedData = require('./src/utils/seed');
    seedData();
});


// HTTP server mapping for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // or the specific frontend URL
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// App-level socket map
app.set('io', io);

// Track connected users
const userSockets = new Map();
app.set('userSockets', userSockets);

io.on('connection', (socket) => {
    socket.on('register', (userId) => {
        if (userId) {
            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
            }
            userSockets.get(userId).add(socket.id);
        }
    });

    socket.on('disconnect', () => {
        // Find and remove disconnected socket
        for (const [userId, sockets] of userSockets.entries()) {
            if (sockets.has(socket.id)) {
                sockets.delete(socket.id);
                // Clean up the user entirely if they have no active sockets
                if (sockets.size === 0) {
                    userSockets.delete(userId);
                }
                break;
            }
        }
    });
});



server.listen(PORT, () => {
    logger.info(`Server and Socket.io running on port ${PORT}`);

    // ── Keep-Alive: prevents Render free-tier from sleeping ──────────────────
    // Set BACKEND_URL to your deployed Render URL, e.g.:
    //   https://connectblog-backend.onrender.com
    // Leave unset (or keep empty) in local development — it will be skipped.
    const backendUrl = process.env.BACKEND_URL || '';
    startKeepAlive(backendUrl.trim());
});
