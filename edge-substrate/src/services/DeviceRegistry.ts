import { v4 as uuidv4 } from 'uuid';

export interface DeviceRecord {
  device_id: string;
  platform: string;
  wallet_address: string;
  status: 'online' | 'busy' | 'offline';
  socket_id: string | null;
  jobs_completed: number;
  last_heartbeat: Date;
  registered_at: Date;
}

export class DeviceRegistry {
  private devices = new Map<string, DeviceRecord>();

  register(params: { device_id?: string; platform: string; wallet_address: string }): DeviceRecord {
    const id = params.device_id ?? uuidv4();
    const existing = this.devices.get(id);
    if (existing) {
      existing.status = 'online';
      existing.last_heartbeat = new Date();
      return existing;
    }
    const record: DeviceRecord = {
      device_id: id,
      platform: params.platform,
      wallet_address: params.wallet_address,
      status: 'online',
      socket_id: null,
      jobs_completed: 0,
      last_heartbeat: new Date(),
      registered_at: new Date(),
    };
    this.devices.set(id, record);
    return record;
  }

  heartbeat(deviceId: string, socketId?: string): void {
    const d = this.devices.get(deviceId);
    if (!d) return;
    d.last_heartbeat = new Date();
    if (socketId) d.socket_id = socketId;
  }

  setSocketId(deviceId: string, socketId: string): void {
    const d = this.devices.get(deviceId);
    if (d) d.socket_id = socketId;
  }

  setOffline(socketId: string): void {
    for (const d of this.devices.values()) {
      if (d.socket_id === socketId) {
        d.status = 'offline';
        d.socket_id = null;
      }
    }
  }

  markBusy(deviceId: string): void {
    const d = this.devices.get(deviceId);
    if (d) d.status = 'busy';
  }

  markAvailable(deviceId: string): void {
    const d = this.devices.get(deviceId);
    if (d) d.status = 'online';
  }

  incrementJobs(deviceId: string): void {
    const d = this.devices.get(deviceId);
    if (d) d.jobs_completed++;
  }

  getAvailableDevice(): DeviceRecord | null {
    for (const d of this.devices.values()) {
      if (d.status === 'online' && d.socket_id) return d;
    }
    return null;
  }

  getAll(): DeviceRecord[] {
    return Array.from(this.devices.values());
  }

  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      online: all.filter((d) => d.status === 'online').length,
      busy: all.filter((d) => d.status === 'busy').length,
      offline: all.filter((d) => d.status === 'offline').length,
    };
  }

  pruneStale(): void {
    const cutoff = new Date(Date.now() - 60_000);
    for (const d of this.devices.values()) {
      if (d.last_heartbeat < cutoff && d.status !== 'offline') {
        d.status = 'offline';
        d.socket_id = null;
      }
    }
  }
}
