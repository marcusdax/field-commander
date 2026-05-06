import crypto from 'crypto';
import type { Server as SocketIO } from 'socket.io';
import type { DeviceRegistry } from './DeviceRegistry';
import { NVINAdapter } from './NVINAdapter';
import { db } from '../db/client';

export interface Job {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  status: string;
  assigned_device_id?: string;
  priority: number;
  result?: Record<string, unknown>;
  created_at: string;
}

export class JobScheduler {
  private io: SocketIO;
  private registry: DeviceRegistry;
  private nvin = new NVINAdapter();
  private stats = { submitted: 0, completed: 0, failed: 0, payoutsTriggered: 0 };

  constructor(registry: DeviceRegistry, io: SocketIO) {
    this.registry = registry;
    this.io = io;
  }

  async submitJob(
    jobType: string,
    payload: Record<string, unknown>,
    priority = 5,
    createdBy = 'system',
  ): Promise<Job> {
    const [job] = await db('jobs').insert({
      job_type:   jobType,
      payload:    JSON.stringify(payload),
      priority,
      created_by: createdBy,
      timeout_at: new Date(Date.now() + 30_000),
    }).returning('*');
    this.stats.submitted++;
    this.io.emit('job:new', { jobId: job.id, jobType });
    return job as Job;
  }

  async completeJob(
    jobId: string,
    result: Record<string, unknown>,
    deviceId: string,
  ): Promise<void> {
    const resultHash = '0x' + crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');

    await db('jobs').where({ id: jobId }).update({
      status: 'completed',
      result: JSON.stringify(result),
      completed_at: db.fn.now(),
    });
    await db('task_executions').insert({
      job_id: jobId, device_id: deviceId,
      result_hash: resultHash, proof_type: 'hash',
      success: true, completed_at: db.fn.now(),
    });
    await db('devices').where({ id: deviceId }).increment('total_jobs_completed', 1);
    this.registry.markAvailable(deviceId);
    this.stats.completed++;
    this.io.emit('job:completed', { jobId, result });

    // Post-completion NVIN hook
    const job = await db('jobs').where({ id: jobId }).first() as Job | undefined;
    if (job?.job_type === 'nvin_fusion') {
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      const payout = await this.nvin.handleResult(payload, result);
      if (payout) {
        this.stats.payoutsTriggered++;
        this.io.emit('dta:payout', { jobId, ...payout });
      }
    }
  }

  async failJob(jobId: string, error: string, deviceId: string): Promise<void> {
    await db('jobs').where({ id: jobId }).update({ status: 'failed', error });
    await db('task_executions').insert({
      job_id: jobId, device_id: deviceId, success: false, completed_at: db.fn.now(),
    });
    this.registry.markAvailable(deviceId);
    this.stats.failed++;
    this.io.emit('job:failed', { jobId, error });
  }

  async tick(): Promise<void> {
    // Return timed-out assignments to pending queue
    await db('jobs')
      .where({ status: 'assigned' })
      .where('timeout_at', '<', new Date())
      .update({ status: 'pending', assigned_device_id: null, assigned_at: null });

    // Assign pending jobs to available devices via WebSocket
    const pending = await db('jobs')
      .where({ status: 'pending' })
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .limit(10) as Job[];

    for (const job of pending) {
      const device = this.registry.getAvailableDevice();
      if (!device) break;

      await db('jobs').where({ id: job.id }).update({
        status: 'assigned',
        assigned_device_id: device.id,
        assigned_at: db.fn.now(),
      });
      this.registry.markBusy(device.id);

      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      this.io.to(`device:${device.id}`).emit('job:assigned', {
        jobId: job.id, jobType: job.job_type, payload,
      });
    }

    this.registry.pruneStale();
  }

  async getQueueDepth(): Promise<number> {
    const [{ count }] = await db('jobs').where({ status: 'pending' }).count('id as count');
    return parseInt(String(count), 10);
  }

  async getDashboardStats(): Promise<Record<string, unknown>> {
    const rows = await db('devices').select('status') as { status: string }[];
    const queueDepth = await this.getQueueDepth();
    return {
      devices: {
        total:   rows.length,
        online:  rows.filter(r => r.status === 'online').length,
        busy:    rows.filter(r => r.status === 'busy').length,
        offline: rows.filter(r => r.status === 'offline').length,
      },
      queueDepth,
      ...this.stats,
      timestamp: new Date().toISOString(),
    };
  }
}
