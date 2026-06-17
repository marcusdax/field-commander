import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';
import logger from './logger';
import knex from 'knex';
import knexConfig from './db/knexfile';
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

setInterval(() => { jobScheduler.tick().catch((e) => logger.error('JobScheduler error: %o', e)); }, 5_000);

async function maybeRunMigrations() {
	if (process.env['MIGRATE_ON_START'] !== 'true') return;
	try {
		logger.info('Running edge-substrate migrations');
		const db = knex(knexConfig as any);
		await (db.migrate as any).latest({ directory: './src/db/migrations' });
		logger.info('Edge-substrate migrations complete');
		await db.destroy();
	} catch (err) {
		logger.error('Edge migrations failed: %o', err);
		process.exit(1);
	}
}

const PORT = process.env['PORT'] || 3002;
(async () => {
	await maybeRunMigrations();
	httpServer.listen(PORT, () => { logger.info('Edge Substrate listening on :%s', PORT); });
})();
