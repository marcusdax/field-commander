import { Router, Request, Response } from 'express';
import { DeviceRegistry } from '../services/DeviceRegistry';

export function createDevicesRouter(registry: DeviceRegistry): Router {
  const router = Router();
  router.get('/', (_req: Request, res: Response) => { res.json(registry.getAll()); });
  router.post('/register', (req: Request, res: Response) => {
    const record = registry.register(req.body);
    res.status(201).json(record);
  });
  return router;
}
