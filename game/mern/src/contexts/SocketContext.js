import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 5;

  useEffect(() => {
    console.log('🔌 SocketContext useEffect triggered');
    console.log('🔑 User:', user ? user.username : 'No user');
    console.log('🔑 Access token:', accessToken ? 'Present' : 'Missing');
    console.log('🔌 Current socket ref:', socketRef.current);
    
    // Only create socket if we have a token and user
    if (!accessToken || !user) {
      console.log('🔌 No access token or user, skipping socket connection');
      return;
    }
    
    // Recreate socket when accessToken changes to support authenticated backends
    if (socketRef.current) {
      try {
        console.log('🔌 Closing existing socket to refresh auth');
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    }

    if (!socketRef.current) {
      console.log('🔌 Creating new socket connection with token...');

      const newSocket = io('http://localhost:5000', {
        transports: ['polling', 'websocket'],
        timeout: 15000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        maxReconnectionAttempts: 10,
        withCredentials: true,
        auth: { token: accessToken },
        extraHeaders: { Authorization: `Bearer ${accessToken}` },
        query: { userId: user._id, username: user.username }
      });

      socketRef.current = newSocket;
      console.log('🔌 Socket created, setting up event listeners...');

      newSocket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server');
        console.log('🔌 Socket ID:', newSocket.id);
        console.log('🔌 User:', user.username);
        setConnected(true);
        setSocket(newSocket);
        connectionAttempts.current = 0;
        toast.success(`Connected to game server as ${user.username}!`);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from Socket.IO server, reason:', reason);
        setConnected(false);
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          newSocket.connect();
        }
        toast.error('Disconnected from game server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        console.error('Error details:', {
          message: error.message,
          description: error.description,
          context: error.context,
          user: user.username
        });
        setConnected(false);
        
        connectionAttempts.current++;
        if (connectionAttempts.current >= maxConnectionAttempts) {
          toast.error(`Failed to connect to game server as ${user.username}. Please refresh the page.`);
        } else {
          console.log(`🔄 Connection attempt ${connectionAttempts.current}/${maxConnectionAttempts} for ${user.username}`);
        }
      });

      newSocket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        setConnected(false);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected to Socket.IO server after ${attemptNumber} attempts for ${user.username}`);
        setConnected(true);
        toast.success(`Reconnected to game server as ${user.username}!`);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed after all attempts for', user.username);
        setConnected(false);
        toast.error(`Failed to reconnect to game server as ${user.username}. Please refresh the page.`);
      });

      // Add authentication error handler
      newSocket.on('authentication_error', (error) => {
        console.error('❌ Socket authentication error:', error);
        toast.error(`Authentication failed for ${user.username}. Please log in again.`);
        setConnected(false);
      });

    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection on unmount for', user?.username);
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        connectionAttempts.current = 0;
      }
    };
  }, [accessToken, user]);

  const createRoom = (data) => {
    console.log('🔌 createRoom called with data:', data);
    console.log('🔌 Socket connected status:', connected);
    console.log('🔌 Socket object:', socket);
    console.log('🔌 Socket ref:', socketRef.current);
    
    if (socket && connected) {
      console.log('✅ Emitting createRoom event');
      socket.emit('createRoom', data);
    } else if (socketRef.current && socketRef.current.connected) {
      console.log('✅ Using socket ref to emit createRoom event');
      socketRef.current.emit('createRoom', data);
    } else {
      console.error('❌ Cannot emit createRoom - socket not connected');
      toast.error('Game server connection issue. Please refresh the page and try again.');
    }
  };

  const joinRoom = (data) => {
    console.log('🔌 joinRoom called with data:', data);
    console.log('🔌 Socket connected status:', connected);
    console.log('🔌 Socket object:', socket);
    console.log('🔌 Socket ref:', socketRef.current);
    
    if (socket && connected) {
      console.log('✅ Emitting joinRoom event');
      socket.emit('joinRoom', data);
    } else if (socketRef.current && socketRef.current.connected) {
      console.log('✅ Using socket ref to emit joinRoom event');
      socketRef.current.emit('joinRoom', data);
    } else {
      console.error('❌ Cannot emit joinRoom - socket not connected');
      toast.error('Game server connection issue. Please refresh the page and try again.');
    }
  };

  const leaveRoom = (data) => {
    console.log('🔌 leaveRoom called with data:', data);
    if (socket && connected) {
      socket.emit('leaveRoom', data);
    } else if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leaveRoom', data);
    } else {
      toast.error('Game server connection issue. Please refresh the page and try again.');
    }
  };

  const value = {
    socket,
    connected,
    createRoom,
    joinRoom,
    leaveRoom,
    // Add connection test function for debugging
    testConnection: () => {
      console.log('🔌 Testing connection...');
      console.log('🔌 Socket ref:', socketRef.current);
      console.log('🔌 Socket state:', socket);
      console.log('🔌 Connected state:', connected);
      console.log('🔌 User:', user);
      console.log('🔌 Access token:', accessToken ? 'Present' : 'Missing');
      
      if (socketRef.current) {
        console.log('🔌 Socket ref connected:', socketRef.current.connected);
        console.log('🔌 Socket ref id:', socketRef.current.id);
      }
      
      // Test server health
      fetch('http://localhost:5000/health')
        .then(res => res.json())
        .then(data => {
          console.log('🔍 Server health:', data);
        })
        .catch(err => {
          console.error('❌ Server health check failed:', err.message);
        });
      
      // Test socket endpoint
      fetch('http://localhost:5000/socket-test')
        .then(res => res.json())
        .then(data => {
          console.log('🔍 Socket status:', data);
        })
        .catch(err => {
          console.error('❌ Socket status check failed:', err.message);
        });
    }
  };

  console.log('🔌 SocketContext value:', { socket: !!socket, connected, socketRef: !!socketRef.current });

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
