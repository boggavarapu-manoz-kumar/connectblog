require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startKeepAlive } = require('./src/utils/keepAlive');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

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
    // When a user logs in, they emit their ID
    socket.on('register', (userId) => {
        if (userId) {
            userSockets.set(userId, socket.id);
        }
    });

    socket.on('disconnect', () => {
        // Find and remove disconnected user
        for (const [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                break;
            }
        }
    });
});



server.listen(PORT, () => {
    console.log(`Server and Socket.io running on port ${PORT}`);

    // ── Keep-Alive: prevents Render free-tier from sleeping ──────────────────
    // Set BACKEND_URL to your deployed Render URL, e.g.:
    //   https://connectblog-backend.onrender.com
    // Leave unset (or keep empty) in local development — it will be skipped.
    const backendUrl = process.env.BACKEND_URL || '';
    startKeepAlive(backendUrl.trim());
});
