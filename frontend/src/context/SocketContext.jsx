import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            // Fetch initial unread count
            const fetchInitialNotifications = async () => {
                try {
                    const { data } = await api.get('/notifications');
                    setNotifications(data);
                    const unread = data.filter(n => !n.isRead).length;
                    setUnreadCount(unread);
                } catch (err) {
                    console.error('Failed to fetch initial notifications', err);
                }
            };
            fetchInitialNotifications();

            // Initialize Socket but do NOT autoConnect (prevents React 18 StrictMode double-fire crashes)
            const newSocket = io('http://localhost:5000', { autoConnect: false });
            setSocket(newSocket);

            // Start connection safely after mounting completes
            const connectionTimeout = setTimeout(() => {
                newSocket.connect();
            }, 100);

            newSocket.on('connect', () => {
                newSocket.emit('register', user._id);
            });

            newSocket.on('newNotification', (data) => {
                // Show floating actionable toast!
                const actionText = {
                    like: 'liked your post',
                    comment: 'commented on your post',
                    follow: 'started following you',
                    mention: 'mentioned you in a post'
                }[data.type] || 'interacted with you';

                toast(`🔔 ${data.from} ${actionText}`, {
                    style: { background: '#0ea5e9', color: '#fff', fontWeight: 'bold' },
                    iconTheme: { primary: '#fff', secondary: '#0ea5e9' }
                });

                setUnreadCount(prev => prev + 1);
            });

            return () => {
                clearTimeout(connectionTimeout);
                if (newSocket.connected) {
                    newSocket.disconnect();
                }
            };
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, notifications, setNotifications, unreadCount, setUnreadCount }}>
            {children}
        </SocketContext.Provider>
    );
};
