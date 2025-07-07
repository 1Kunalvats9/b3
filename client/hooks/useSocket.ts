import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-expo';

const SOCKET_URL = 'https://b3-iota.vercel.app';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { userId } = useAuth();

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
      
      // Join user-specific room
      if (userId) {
        socket.emit('join-user', userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const joinAdminRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('join-admin');
    }
  };

  const onOrderStatusUpdate = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('order-status-updated', callback);
    }
  };

  const onNewOrder = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('new-order', callback);
    }
  };

  const offOrderStatusUpdate = () => {
    if (socketRef.current) {
      socketRef.current.off('order-status-updated');
    }
  };

  const offNewOrder = () => {
    if (socketRef.current) {
      socketRef.current.off('new-order');
    }
  };

  return {
    socket: socketRef.current,
    joinAdminRoom,
    onOrderStatusUpdate,
    onNewOrder,
    offOrderStatusUpdate,
    offNewOrder,
  };
};