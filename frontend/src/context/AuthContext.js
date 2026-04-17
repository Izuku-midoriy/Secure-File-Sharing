import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            
            if (token && userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    setUser(parsedUser);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };
        
        checkAuth();
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            // Attempt to free the backend session lock to allow immediate login elsewhere
            await apiFetch('/users/logout', { method: 'POST' });
        } catch (err) {
            console.error('Error during backend logout:', err);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    // Global unified fetch wrapper to attach tokens and use the environment URL
    const apiFetch = async (endpoint, options = {}) => {
        const token = localStorage.getItem('token');
        const isFormData = options.body instanceof FormData;
        const headers = {
            ...(!isFormData && options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const url = `${baseUrl}${endpoint}`;
        
        return fetch(url, { ...options, headers });
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, apiFetch, authLoading: loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
