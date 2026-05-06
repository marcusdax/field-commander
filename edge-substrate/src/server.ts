import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';
import { DeviceRegistry } from './services/DeviceRegistry';
import { JobScheduler } from './services/JobScheduler';
import { createDevicesRouter } from './routes/devices';
import { createJobsRouter } from './routes/jobs';
import { createNVINRouter } from './routes/nvin';
import { setupDeviceAgent } from './websocket/DeviceAgent';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: process.env['CORS_ORIGIN'] ?? '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? '*' }));
app.use(express.json({ limit: '5mb' }));

// ─── Service singletons ──────────────────────────────────────────────────
const deviceRegistry = new DeviceRegistry();
const jobScheduler   = new JobScheduler(deviceRegistry, io);

// ─── Routes ───────────────────────────────────────────────────────────
app.use('/v1/devices', createDevicesRouter(deviceRegistry));
app.use('/v1/jobs',    createJobsRouter(jobScheduler));
app.use('/v1/nvin',    createNVINRouter(jobScheduler));

app.get('/health', async (_req, res) => {
  return res.json({
    status: 'ok',
    version: '1.0.0-beta',
    onlineDevices: deviceRegistry.getOnlineCount(),
    queueDepth: await jobScheduler.getQueueDepth(),
  });
});

app.get('/v1/dashboard', async (_req, res) => {
  return res.json(await jobScheduler.getDashboardStats());
});

// ─── WebSocket ─────────────────────────────────────────────────────────
setupDeviceAgent(io, jobScheduler, deviceRegistry);

// ─── Scheduler tick (every 5s) ──────────────────────────────────────────
setInterval(() => jobScheduler.tick().catch(console.error), 5_000);

const PORT = parseInt(process.env['PORT'] ?? '3002', 10);
httpServer.listen(PORT, () => {
  console.log(`\nNexus Edge Substrate v1.0-beta :${PORT}`);
  console.log(`  Device registration: POST /v1/devices/register`);
  console.log(`  OCR submit:          POST /v1/nvin/ocr/submit`);
  console.log(`  Job poll:            WS   job:poll`);
  console.log(`  Dashboard:           GET  /v1/dashboard`);
});

export { io, deviceRegistry, jobScheduler };
