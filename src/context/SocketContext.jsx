import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL); // Use environment variable
        setSocket(newSocket);

        newSocket.on('online-users', (users) => setOnlineUsers(users));
        newSocket.on('available-rooms', (rooms) => setAvailableRooms(rooms));

        return () => newSocket.close();
    }, []);

    const login = (username) => {
        if (socket && username) {
            socket.emit('join-lobby', username);
            setUser({ username });
        }
    };

    const value = {
        socket,
        onlineUsers,
        availableRooms,
        user,
        login
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
