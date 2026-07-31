import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import logger from '../utils/logger';
import { allowedOrigins } from '../middleware/security';

let io: IOServer | null = null;

export const initSocket = (httpServer: HttpServer): void => {
  io = new IOServer(httpServer, {
    cors: {
      origin: allowedOrigins(),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
  });
};

/** Broadcast an event to all connected clients. No-op if sockets aren't ready. */
export const emitEvent = (event: string, payload: unknown): void => {
  io?.emit(event, payload);
};

export const SOCKET_EVENTS = {
  productCreated: 'product:created',
  productUpdated: 'product:updated',
  productDeleted: 'product:deleted',
  stockUpdated:   'stock:updated',
  orderUpdated:   'order:updated',
  orderNew:       'order:new',
  ticketNew:      'ticket:new',
  themeChanged:   'theme:changed',   // active theme tokens changed
  cmsUpdated:     'cms:updated',      // a CMS page (homepage, about, …) was saved
  contentUpdated: 'content:updated',  // catalog/content changed — clients refetch
} as const;
