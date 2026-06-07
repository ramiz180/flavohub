'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Order } from '@/types/order';

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function useRestaurantSocket(token: string | null, onOrderUpdated: (order: Order) => void) {
  // Keep latest callback without restarting the socket on every render
  const callbackRef = useRef(onOrderUpdated);
  callbackRef.current = onOrderUpdated;

  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('order:updated', (order: Order) => {
      callbackRef.current(order);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);
}
