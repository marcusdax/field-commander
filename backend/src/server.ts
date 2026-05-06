import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';
import { nvinRouter } from './routes/nvin';
import { dtaRouter } from './routes/dta';

dotenv.config();

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
  console.log(`[WS] agent connected: ${socket.id}`);

  socket.on('join:session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
  });

  socket.on('plate:scan', (data: { sessionId: string; plateText: string; confidence: number }) => {
    io.to(`session:${data.sessionId}`).emit('plate:scan', data);
  });

  socket.on('disconnect', () => console.log(`[WS] agent disconnected: ${socket.id}`));
});

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`Field Commander backend v4.0 :${PORT}`);
  console.log(`  POST /api/nvin/analyze`);
  console.log(`  POST /api/dta/payout`);
});

export { io };
