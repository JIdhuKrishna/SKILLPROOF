import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('skillproof_user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); }
            catch { localStorage.removeItem('skillproof_user'); }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/auth/login', { email, password });
            if (response.data) {
                localStorage.setItem('skillproof_user', JSON.stringify(response.data));
                setUser(response.data);
            }
            return { success: true, role: response.data?.role };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const response = await api.post('/api/auth/register', { name, email, password, role });
            if (response.data) {
                localStorage.setItem('skillproof_user', JSON.stringify(response.data));
                setUser(response.data);
            }
            return { success: true, role: response.data?.role || role };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('skillproof_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
