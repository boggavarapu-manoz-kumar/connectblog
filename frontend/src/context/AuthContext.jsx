import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    // Check if user is logged in
    const checkUserLoggedIn = async () => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
            setLoading(false);
        }

        try {
            // Backend now uses HttpOnly cookies, so we just make the request.
            // If the cookie is present and valid, this succeeds.
            const { data } = await api.get('/auth/me');
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
        } catch (error) {
            console.log('User check failed (Not logged in)');
            localStorage.removeItem('user');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Login function
    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            // Token is now set securely via HttpOnly cookie by the backend
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            toast.success('Login Successful! Welcome back.');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login Failed');
            return false;
        }
    };

    // Register function
    const register = async (username, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { username, email, password });
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            toast.success('Registration Successful! Welcome.');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration Failed');
            return false;
        }
    };

    // Logout function
    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error', err);
        }
        localStorage.removeItem('user');
        setUser(null);
        toast.success('Logged out successfully');
    };

    // Update User Context State function
    const updateUser = (userData) => {
        setUser(userData);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
