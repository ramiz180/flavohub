import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import Constants from 'expo-constants';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const { socket, isConnected } = get();
    const token = useAuthStore.getState().accessToken;

    if (isConnected || socket || !token) return;

    const hostUri = Constants.expoConfig?.hostUri;
    let baseURL = 'http://localhost:3000';
    if (hostUri) {
      const parts = hostUri.split(':');
      baseURL = `http://${parts[0]}:3000`;
    }
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || baseURL;

    const newSocket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Customer socket connected');
      set({ isConnected: true });
    });

    newSocket.on('disconnect', () => {
      console.log('Customer socket disconnected');
      set({ isConnected: false });
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
