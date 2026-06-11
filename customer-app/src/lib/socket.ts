import * as SecureStore from 'expo-secure-store';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://flavohub-api.onrender.com';

let socket: Socket | null = null;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync('fh_access_token');

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.log('[Socket] Connection error:', err.message);
  });

  socket.on('error', (err: { message: string }) => {
    console.log('[Socket] Server error:', err.message);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

export const subscribeToOrderUpdates = (
  callback: (data: OrderStatusUpdate) => void,
): (() => void) => {
  let cancelled = false;

  connectSocket().then((s) => {
    if (!cancelled) {
      s.on('order:status_updated', callback);
    }
  });

  return () => {
    cancelled = true;
    if (socket) {
      socket.off('order:status_updated', callback);
    }
  };
};

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  restaurantName: string;
  updatedAt: string;
}
