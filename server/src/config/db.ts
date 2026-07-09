import mongoose from 'mongoose';
import logger from '../utils/logger';

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI as string;

  if (!uri) {
    logger.error('MONGODB_URI is not set');
    throw new Error('MONGODB_URI is not set');
  }

  const conn = await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
  });
  logger.info(`MongoDB connected: ${conn.connection.host}`);
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

export default connectDB;
