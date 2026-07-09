import winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [new winston.transports.Console()];

// File transports only off the platform (local dev). On Cloud Run the
// filesystem is read-only and stdout/stderr is captured by Cloud Logging,
// so writing to a `logs/` dir is unnecessary. The try/catch guarantees a
// read-only/permission-denied filesystem (EACCES) can never crash boot,
// even if NODE_ENV is misconfigured.
if (!isProd) {
  try {
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    );
  } catch {
    // filesystem not writable — Console transport is enough
  }
}

const logger = winston.createLogger({
  level: isProd ? 'warn' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack }) =>
      stack ? `${timestamp} ${level}: ${message}\n${stack}` : `${timestamp} ${level}: ${message}`
    )
  ),
  transports,
});

export default logger;
