import React, { createContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { getToken } from '../utils/auth';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Initialize socket connection
    const socketInstance = io(process.env.REACT_APP_API_URL || '', {
      auth: {
        token
      }
    });

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Function to emit events
  const emit = (event, data, callback) => {
    if (socket && connected) {
      socket.emit(event, data, callback);
    } else {
      console.error('Socket not connected');
    }
  };

  // Function to subscribe to events
  const subscribe = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        emit,
        subscribe
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;