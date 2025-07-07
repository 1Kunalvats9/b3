import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-expo';

// Use environment variable or fallback to production URL
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'https://b3-iota.vercel.app';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { userId } = useAuth();

  useEffect(() => {
    // Initialize socket connection with enhanced configuration
    console.log('Initializing socket connection to:', SOCKET_URL);
    
    socketRef.current = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
      upgrade: true
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
      console.log('Transport:', socket.io.engine.transport.name);
      
      // Join user-specific room
      if (userId) {
        console.log('Joining user room for:', userId);
        socket.emit('join-user', userId);
      }
    });
    
    socket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
    });
    
    socket.on('user-joined', (data) => {
      console.log('User room joined:', data);
    });
    
    socket.on('admin-joined', (data) => {
      console.log('Admin room joined:', data);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Attempting to reconnect...', attemptNumber);
    });
    
    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });
    
    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.error('Error details:', error.message);
      console.error('Error type:', (error as any).type);
      console.error('Error description:', (error as any).description);
    });
    
    // Handle transport upgrade
    //@ts-ignore
    socket.io.on('upgrade', () => {
      console.log('Upgraded to transport:', socket.io.engine.transport.name);
    });
    
    // Handle transport upgrade error
    //@ts-ignore
    socket.io.on('upgradeError', (error:any) => {
      console.error('Transport upgrade error:', error);
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
    };
  }, [userId]);

  const joinAdminRoom = () => {
    if (socketRef.current) {
      console.log('Joining admin room');
      socketRef.current.emit('join-admin');
    } else {
      console.warn('Socket not connected, cannot join admin room');
    }
  };

  const onOrderStatusUpdate = (callback: (data: any) => void) => {
    if (socketRef.current) {
      console.log('Listening for order status updates');
      socketRef.current.on('order-status-updated', callback);
    } else {
      console.warn('Socket not connected, cannot listen for order status updates');
    }
  };

  const onNewOrder = (callback: (data: any) => void) => {
    if (socketRef.current) {
      console.log('Listening for new orders');
      socketRef.current.on('new-order', callback);
    } else {
      console.warn('Socket not connected, cannot listen for new orders');
    }
  };

  const offOrderStatusUpdate = () => {
    if (socketRef.current) {
      console.log('Stopping order status update listener');
      socketRef.current.off('order-status-updated');
    }
  };

  const offNewOrder = () => {
    if (socketRef.current) {
      console.log('Stopping new order listener');
      socketRef.current.off('new-order');
    }
  };
  
  const isConnected = () => {
    return socketRef.current?.connected || false;
  };
  
  const reconnect = () => {
    if (socketRef.current) {
      console.log('Manually reconnecting socket');
      socketRef.current.connect();
    }
  };

  return {
    socket: socketRef.current,
    isConnected: isConnected(),
    joinAdminRoom,
    onOrderStatusUpdate,
    onNewOrder,
    offOrderStatusUpdate,
    offNewOrder,
    reconnect,
  };
};