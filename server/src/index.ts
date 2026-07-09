import 'dotenv/config';
import http from 'http';
import app from './app';
import connectDB from './config/db';
import { initSocket } from './config/socket';
import { verifyEmailConnection } from './services/email.service';
import logger from './utils/logger';

const PORT = Number(process.env.PORT) || 5000;

// Wrap Express in an HTTP server so Socket.IO can share the same port.
const server = http.createServer(app);
initSocket(server);

// Open the port FIRST so the platform (Cloud Run) sees a listening
// container immediately. Connect to external services afterwards.
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// DB connect runs after listen. If it fails the process exits so the
// platform restarts the revision (loud failure beats silent broken DB).
connectDB().catch((err) => {
  logger.error('MongoDB connection failed:', err);
  process.exit(1);
});

// Email verification is non-fatal — never block or kill the server.
verifyEmailConnection().catch((err) => {
  logger.warn('Email connection verify failed:', err);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
});
