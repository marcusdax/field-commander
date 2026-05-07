import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';
import { DeviceRegistry } from './services/DeviceRegistry';
import { JobScheduler } from './services/JobScheduler';
import { setupDeviceAgent } from './websocket/DeviceAgent';
import { createDevicesRouter } from './routes/devices';
import { createJobsRouter } from './routes/jobs';
import { createNVINRouter } from './routes/nvin';
import { createDashboardRouter } from './routes/dashboard';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const deviceRegistry = new DeviceRegistry();
const jobScheduler = new JobScheduler(deviceRegistry, io);

app.use('/v1/devices', createDevicesRouter(deviceRegistry));
app.use('/v1/jobs', createJobsRouter(jobScheduler));
app.use('/v1/nvin', createNVINRouter(jobScheduler));
app.use('/v1/dashboard', createDashboardRouter(jobScheduler));

setupDeviceAgent(io, jobScheduler, deviceRegistry);

setInterval(() => { jobScheduler.tick().catch(console.error); }, 5_000);

const PORT = process.env['PORT'] || 3002;
httpServer.listen(PORT, () => { console.log('Edge Substrate listening on :' + PORT); });
