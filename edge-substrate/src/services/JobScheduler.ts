import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { DeviceRegistry } from './DeviceRegistry';
import { NVINAdapter, NVINFusionPayload, FusionResult } from './NVINAdapter';

export interface Job {
  id: string;
  type: string;
  payload: NVINFusionPayload;
  status: 'pending' | 'assigned' | 'completed' | 'failed';
  device_id: string | null;
  created_at: Date;
  assigned_at: Date | null;
  completed_at: Date | null;
}

export class JobScheduler {
  private jobs = new Map<string, Job>();
  private counter = { submitted: 0, completed: 0, failed: 0, payouts: 0 };
  private nvin = new NVINAdapter();

  constructor(private registry: DeviceRegistry, private io: Server) {}

  async submitJob(payload: NVINFusionPayload): Promise<Job> {
    const job: Job = {
      id: uuidv4(),
      type: 'nvin_fusion',
      payload,
      status: 'pending',
      device_id: null,
      created_at: new Date(),
      assigned_at: null,
      completed_at: null,
    };
    this.jobs.set(job.id, job);
    this.counter.submitted++;
    this.io.emit('job:new', { jobId: job.id, type: job.type });
    return job;
  }

  async completeJob(jobId: string, result: FusionResult): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'completed';
    job.completed_at = new Date();
    this.counter.completed++;
    if (job.device_id) {
      this.registry.markAvailable(job.device_id);
      this.registry.incrementJobs(job.device_id);
    }
    this.io.emit('job:completed', { jobId, payload: job.payload, result });
    const payout = await this.nvin.handleResult(job.payload, result);
    if (payout) {
      this.counter.payouts++;
      this.io.emit('dta:payout', { ...payout, agentAddress: job.payload.agentAddress, confidence: job.payload.confidence });
    }
  }

  async failJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'failed';
    this.counter.failed++;
    if (job.device_id) this.registry.markAvailable(job.device_id);
    this.io.emit('job:failed', { jobId });
  }

  async tick(): Promise<void> {
    this.registry.pruneStale();
    const pending = Array.from(this.jobs.values()).filter((j) => j.status === 'pending');
    for (const job of pending) {
      const device = this.registry.getAvailableDevice();
      if (!device) break;
      job.status = 'assigned';
      job.device_id = device.device_id;
      job.assigned_at = new Date();
      this.registry.markBusy(device.device_id);
      this.io.to('device:' + device.device_id).emit('job:assigned', { jobId: job.id, payload: job.payload });
    }
    const cutoff = new Date(Date.now() - 30_000);
    for (const job of this.jobs.values()) {
      if (job.status === 'assigned' && job.assigned_at && job.assigned_at < cutoff) {
        job.status = 'pending';
        job.device_id = null;
        job.assigned_at = null;
      }
    }
  }

  getPendingJobs(): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'pending');
  }

  getStats() {
    return {
      devices: this.registry.getStats(),
      queueDepth: this.getPendingJobs().length,
      submitted: this.counter.submitted,
      completed: this.counter.completed,
      failed: this.counter.failed,
      payoutsTriggered: this.counter.payouts,
    };
  }
}
