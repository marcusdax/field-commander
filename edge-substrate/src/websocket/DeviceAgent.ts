import { Server, Socket } from 'socket.io';
import { JobScheduler } from '../services/JobScheduler';
import { DeviceRegistry } from '../services/DeviceRegistry';
import { NVINAdapter } from '../services/NVINAdapter';

export function setupDeviceAgent(io: Server, scheduler: JobScheduler, registry: DeviceRegistry): void {
  const nvin = new NVINAdapter();

  io.on('connection', (socket: Socket) => {
    let deviceId: string | null = null;

    socket.on('device:identify', (data: any) => {
      const record = registry.register({
        device_id: data.device_id,
        platform: data.platform ?? 'unknown',
        wallet_address: data.wallet_address ?? '0x0',
      });
      deviceId = record.device_id;
      registry.setSocketId(deviceId, socket.id);
      socket.join('device:' + deviceId);
      socket.emit('device:registered', { device_id: deviceId });
    });

    socket.on('device:heartbeat', () => {
      if (deviceId) registry.heartbeat(deviceId, socket.id);
    });

    socket.on('job:poll', () => {
      const pending = scheduler.getPendingJobs();
      if (pending.length > 0) {
        socket.emit('job:assigned', { jobId: pending[0].id, payload: pending[0].payload });
      }
    });

    socket.on('job:execute', async (data: any) => {
      try {
        const result = await nvin.executeJob(data.payload);
        socket.emit('job:result', { jobId: data.jobId, result });
      } catch (err: any) {
        socket.emit('job:error', { jobId: data.jobId, error: err.message });
      }
    });

    socket.on('job:result', async (data: any) => {
      await scheduler.completeJob(data.jobId, data.result);
    });

    socket.on('disconnect', () => {
      registry.setOffline(socket.id);
    });
  });
}
