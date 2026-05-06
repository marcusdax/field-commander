import { db } from '../db/client';

export interface DeviceRecord {
  id: string;
  deviceId: string;
  agentAddress?: string;
  platform: string;
  status: 'online' | 'offline' | 'busy';
  socketId?: string;
  lastHeartbeat: Date;
  capabilities: Record<string, unknown>;
}

export class DeviceRegistry {
  private devices = new Map<string, DeviceRecord>();

  async register(params: {
    deviceId: string;
    agentAddress?: string;
    platform: string;
    capabilities?: Record<string, unknown>;
  }): Promise<DeviceRecord> {
    const existing = await db('devices').where({ device_id: params.deviceId }).first();
    let row: Record<string, unknown>;

    if (existing) {
      [row] = await db('devices')
        .where({ device_id: params.deviceId })
        .update({
          agent_address: params.agentAddress ?? existing.agent_address,
          platform: params.platform,
          capabilities: JSON.stringify(params.capabilities ?? {}),
          status: 'online',
          last_heartbeat: db.fn.now(),
        })
        .returning('*');
    } else {
      [row] = await db('devices').insert({
        device_id: params.deviceId,
        agent_address: params.agentAddress ?? null,
        platform: params.platform,
        capabilities: JSON.stringify(params.capabilities ?? {}),
        status: 'online',
        last_heartbeat: db.fn.now(),
      }).returning('*');
    }

    const record: DeviceRecord = {
      id:            String(row['id']),
      deviceId:      String(row['device_id']),
      agentAddress:  row['agent_address'] ? String(row['agent_address']) : undefined,
      platform:      String(row['platform']),
      status:        'online',
      lastHeartbeat: new Date(),
      capabilities:  params.capabilities ?? {},
    };
    this.devices.set(record.id, record);
    return record;
  }

  heartbeat(deviceId: string, socketId?: string): void {
    const device = this.findByDeviceId(deviceId);
    if (!device) return;
    device.lastHeartbeat = new Date();
    if (device.status === 'offline') device.status = 'online';
    if (socketId) device.socketId = socketId;
    db('devices')
      .where({ id: device.id })
      .update({ status: device.status, last_heartbeat: new Date() })
      .catch(() => {});
  }

  setOffline(socketId: string): void {
    for (const device of this.devices.values()) {
      if (device.socketId === socketId) {
        device.status = 'offline';
        device.socketId = undefined;
        db('devices').where({ id: device.id }).update({ status: 'offline' }).catch(() => {});
        break;
      }
    }
  }

  markBusy(deviceId: string): void {
    const d = this.devices.get(deviceId);
    if (d) {
      d.status = 'busy';
      db('devices').where({ id: deviceId }).update({ status: 'busy' }).catch(() => {});
    }
  }

  markAvailable(deviceId: string): void {
    const d = this.devices.get(deviceId);
    if (d) {
      d.status = 'online';
      db('devices').where({ id: deviceId }).update({ status: 'online' }).catch(() => {});
    }
  }

  getAvailableDevice(): DeviceRecord | null {
    for (const d of this.devices.values()) {
      if (d.status === 'online' && d.socketId) return d;
    }
    return null;
  }

  findByDeviceId(deviceId: string): DeviceRecord | null {
    for (const d of this.devices.values()) {
      if (d.deviceId === deviceId) return d;
    }
    return null;
  }

  findBySocketId(socketId: string): DeviceRecord | null {
    for (const d of this.devices.values()) {
      if (d.socketId === socketId) return d;
    }
    return null;
  }

  getOnlineCount(): number {
    return [...this.devices.values()].filter(d => d.status !== 'offline').length;
  }

  getAllOnline(): DeviceRecord[] {
    return [...this.devices.values()].filter(d => d.status !== 'offline');
  }

  pruneStale(): void {
    const cutoff = new Date(Date.now() - 60_000);
    for (const [, device] of this.devices) {
      if (device.lastHeartbeat < cutoff && device.status !== 'offline') {
        device.status = 'offline';
        db('devices').where({ id: device.id }).update({ status: 'offline' }).catch(() => {});
      }
    }
  }
}
