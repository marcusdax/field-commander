import { Router, Request, Response } from 'express';
import { JobScheduler } from '../services/JobScheduler';

export function createJobsRouter(scheduler: JobScheduler): Router {
  const router = Router();
  router.get('/', (_req: Request, res: Response) => { res.json(scheduler.getPendingJobs()); });
  return router;
}
