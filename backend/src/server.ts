import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from './db/knexfile';
import logger from './logger';
import { nvinRouter } from './routes/nvin';
import { dtaRouter } from './routes/dta';

dotenv.config();

// Environment validation
function validateEnvironment() {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env file or set environment variables.`
    );
  }

  logger.info('[ENV] All required environment variables validated ✓');
}

// Validate before starting
try {
  validateEnvironment();
} catch (error) {
  logger.error('[ERROR] %s', (error as Error).message);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: process.env['CORS_ORIGIN'] ?? '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/nvin', nvinRouter);
app.use('/api/dta', dtaRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '4.0.0' }));

io.on('connection', (socket) => {
  logger.info('[WS] agent connected: %s', socket.id);

  socket.on('join:session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
  });

  socket.on('plate:scan', (data: { sessionId: string; plateText: string; confidence: number }) => {
    io.to(`session:${data.sessionId}`).emit('plate:scan', data);
  });

  socket.on('disconnect', () => logger.info('[WS] agent disconnected: %s', socket.id));
});

async function maybeRunMigrations() {
  const migrateOnStart = process.env['MIGRATE_ON_START'] === 'true';
  if (!migrateOnStart) return;

  try {
    logger.info('Running database migrations (MIGRATE_ON_START=true)');
    const db = knex(knexConfig as any);
    await (db.migrate as any).latest({ directory: './src/db/migrations' });
    logger.info('Database migrations complete');
    await db.destroy();
  } catch (err) {
    logger.error('Migration failed: %o', err);
    process.exit(1);
  }
}

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

(async () => {
  await maybeRunMigrations();

  httpServer.listen(PORT, () => {
    logger.info(`Field Commander backend v4.0 :${PORT}`);
    logger.info('  POST /api/nvin/analyze');
    logger.info('  POST /api/dta/payout');
  });
})();

export { io };
