import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Heart, MessageCircle, UserPlus, AtSign, Loader2, Check } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const Notifications = () => {
    const [notifications, setLocalNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setUnreadCount } = useSocket();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                setLocalNotifications(data);

                // Mark all fetched notifications as read
                if (data.some(notif => !notif.isRead)) {
                    await api.put('/notifications/read');
                    setUnreadCount(0);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [setUnreadCount]);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'like':
                return <Heart size={20} className="text-red-500 fill-red-500" />;
            case 'comment':
                return <MessageCircle size={20} className="text-primary-500 fill-primary-500" />;
            case 'follow':
                return <UserPlus size={20} className="text-green-500" />;
            case 'mention':
                return <AtSign size={20} className="text-purple-500" />;
            default:
                return <Heart size={20} className="text-gray-500" />;
        }
    };

    const getNotificationText = (notification) => {
        const senderName = notification.sender.username;
        const postTitle = notification.post ? `"${notification.post.title}"` : '';

        switch (notification.type) {
            case 'like':
                return <span><b className="font-bold text-gray-900">{senderName}</b> liked your post {postTitle}</span>;
            case 'comment':
                return <span><b className="font-bold text-gray-900">{senderName}</b> commented on your post {postTitle}</span>;
            case 'follow':
                return <span><b className="font-bold text-gray-900">{senderName}</b> started following you</span>;
            case 'mention':
                return <span><b className="font-bold text-gray-900">{senderName}</b> mentioned you in {postTitle}</span>;
            default:
                return <span><b className="font-bold text-gray-900">{senderName}</b> interacted with you</span>;
        }
    };

    const formatTimestamp = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            <h1 className="text-3xl font-black font-connect text-gray-900 mb-6">Notifications</h1>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="text-center py-16 px-6 relative overflow-hidden bg-white/50">
                        {/* Soft ambient background element */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-100/50 rounded-full blur-3xl rounded-full"></div>

                        <div className="relative z-10 p-4 bg-primary-50/80 ring-1 ring-primary-100 rounded-full inline-flex items-center justify-center mb-5 text-primary-500">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 relative z-10 tracking-tight">You're all caught up!</h3>
                        <p className="text-gray-500 text-lg relative z-10">No new notifications right now. Check back later or start interacting.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <Link
                                key={notification._id}
                                to={notification.post ? `/posts/${notification.post._id}` : `/profile/${notification.sender.username}`}
                                className={`flex items-start gap-4 p-5 sm:p-6 transition-all duration-200 hover:bg-gray-50 ${!notification.isRead ? 'bg-primary-50/30' : ''}`}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {getNotificationIcon(notification.type)}
                                </div>

                                <img
                                    src={notification.sender.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.sender.username)}&background=0ea5e9&color=fff&bold=true`}
                                    alt={notification.sender.username}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-transparent hover:border-primary-500 transition-all shadow-sm flex-shrink-0"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.sender.username)}&background=0ea5e9&color=fff&bold=true`;
                                    }}
                                />

                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-800 text-sm sm:text-base leading-snug">
                                        {getNotificationText(notification)}
                                    </p>
                                    <p className="text-xs font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                                        {formatTimestamp(notification.createdAt)}
                                    </p>
                                </div>

                                {!notification.isRead && (
                                    <div className="w-3 h-3 bg-primary-500 rounded-full flex-shrink-0 mt-3 shadow-sm"></div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
