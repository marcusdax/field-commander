import { Router, Request, Response } from 'express';
import { JobScheduler } from '../services/JobScheduler';

export function createNVINRouter(scheduler: JobScheduler): Router {
  const router = Router();
  router.post('/submit', async (req: Request, res: Response) => {
    try {
      const job = await scheduler.submitJob(req.body);
      res.status(202).json({ jobId: job.id, status: job.status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  return router;
}
