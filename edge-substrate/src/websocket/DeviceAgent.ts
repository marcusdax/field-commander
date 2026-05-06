import type { Server as SocketIO, Socket } from 'socket.io';
import type { DeviceRegistry } from '../services/DeviceRegistry';
import type { JobScheduler } from '../services/JobScheduler';
import { NVINAdapter } from '../services/NVINAdapter';
import { db } from '../db/client';

const nvin = new NVINAdapter();

export function setupDeviceAgent(
  io: SocketIO,
  scheduler: JobScheduler,
  registry: DeviceRegistry,
): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[WS] device connected: ${socket.id}`);

    // Device sends its ID immediately after connecting
    socket.on('device:identify', async (data: { deviceId: string }) => {
      const device = registry.findByDeviceId(data.deviceId);
      if (!device) {
        socket.emit('device:error', { message: 'Not registered. Call POST /v1/devices/register first.' });
        return;
      }
      registry.heartbeat(data.deviceId, socket.id);
      socket.join(`device:${device.id}`);
      socket.emit('device:identified', { deviceDbId: device.id, status: 'online' });
      console.log(`[WS] identified: ${data.deviceId} (${device.platform})`);
    });

    socket.on('device:heartbeat', (data: { deviceId: string }) => {
      registry.heartbeat(data.deviceId, socket.id);
    });

    // Polling fallback: device asks for next job
    socket.on('job:poll', async (data: { deviceId: string }) => {
      const device = registry.findByDeviceId(data.deviceId);
      if (!device || device.status === 'busy') return;

      const [job] = await db('jobs')
        .where({ status: 'pending' })
        .orderBy('priority', 'desc')
        .orderBy('created_at', 'asc')
        .limit(1);

      if (!job) return;

      await db('jobs').where({ id: job.id }).update({
        status: 'assigned', assigned_device_id: device.id, assigned_at: new Date(),
      });
      registry.markBusy(device.id);
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      socket.emit('job:assigned', { jobId: job.id, jobType: job.job_type, payload });
    });

    // Device requests server-side inline execution (beta convenience)
    socket.on('job:execute', async (data: { jobId: string; deviceId: string }) => {
      const device = registry.findByDeviceId(data.deviceId);
      if (!device) return;

      try {
        const job = await db('jobs').where({ id: data.jobId }).first();
        if (!job) return;
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
        const result = await nvin.executeJob(payload);
        await scheduler.completeJob(data.jobId, result, device.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await scheduler.failJob(data.jobId, msg, device.id);
      }
    });

    // External compute agent submits result
    socket.on('job:result', async (data: {
      jobId: string;
      deviceId: string;
      result: Record<string, unknown>;
    }) => {
      const device = registry.findByDeviceId(data.deviceId);
      if (device) await scheduler.completeJob(data.jobId, data.result, device.id);
    });

    socket.on('disconnect', () => {
      registry.setOffline(socket.id);
      console.log(`[WS] device disconnected: ${socket.id}`);
    });
  });
}
