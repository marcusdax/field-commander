import { Router } from 'express';
import type { DeviceRegistry } from '../services/DeviceRegistry';
import { db } from '../db/client';

export function createDevicesRouter(registry: DeviceRegistry) {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const { deviceId, agentAddress, platform, capabilities } = req.body;
      if (!deviceId || !platform) {
        return res.status(400).json({ error: 'deviceId and platform required' });
      }
      const device = await registry.register({ deviceId, agentAddress, platform, capabilities });
      return res.status(201).json(device);
    } catch (err) {
      console.error('[Devices] register error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/:deviceId/heartbeat', (req, res) => {
    registry.heartbeat(req.params['deviceId']!);
    return res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  router.get('/', async (_req, res) => {
    const rows = await db('devices').orderBy('registered_at', 'desc').limit(100);
    return res.json(rows);
  });

  router.get('/:deviceId', async (req, res) => {
    const row = await db('devices').where({ device_id: req.params['deviceId'] }).first();
    if (!row) return res.status(404).json({ error: 'Device not found' });
    return res.json(row);
  });

  return router;
}
