import { Router, Request, Response } from 'express';
import { JobScheduler } from '../services/JobScheduler';

export function createDashboardRouter(scheduler: JobScheduler): Router {
  const router = Router();
  router.get('/', (_req: Request, res: Response) => { res.json(scheduler.getStats()); });
  return router;
}
