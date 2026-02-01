import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const API_URL = "http://localhost:5000/api/v1/auth";

    useEffect(() => {
        // Simple persist check - in a real app, you'd verify the token with an API call
        const savedUser = localStorage.getItem('user');
        if (savedUser && token) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, [token]);

    const register = async (name, email, password, customUsername) => {
        const res = await axios.post(`${API_URL}/signup`, { name, email, password, customUsername });
        setAuth(res.data);
    };

    const login = async (username, password) => {
        const res = await axios.post(`${API_URL}/login`, { username, password });
        setAuth(res.data);
    };

    const loginAsGuest = async (name) => {
        const res = await axios.post(`${API_URL}/guest`, { name });
        setAuth(res.data);
    };

    const setAuth = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, register, login, loginAsGuest, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
