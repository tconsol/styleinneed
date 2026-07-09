import { io, Socket } from 'socket.io-client';

const SERVER_URL = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api/v1')
  .replace('/api/v1', '');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export const ADMIN_SOCKET_EVENTS = {
  orderNew:     'order:new',
  orderUpdated: 'order:updated',
  stockUpdated: 'stock:updated',
  ticketNew:    'ticket:new',
} as const;
