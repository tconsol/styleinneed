import { io } from 'socket.io-client';

// Socket server shares the API origin (strip the /api/v1 suffix).
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const ORIGIN = API.replace(/\/api\/v1\/?$/, '');

export const socket = io(ORIGIN, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export const SOCKET_EVENTS = {
  productCreated: 'product:created',
  productUpdated: 'product:updated',
  productDeleted: 'product:deleted',
  stockUpdated: 'stock:updated',
} as const;
