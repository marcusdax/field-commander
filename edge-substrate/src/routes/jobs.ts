import { Router } from 'express';
import type { JobScheduler } from '../services/JobScheduler';
import { db } from '../db/client';

export function createJobsRouter(scheduler: JobScheduler) {
  const router = Router();

  router.post('/submit', async (req, res) => {
    try {
      const { jobType, payload, priority, createdBy } = req.body;
      if (!jobType || !payload) {
        return res.status(400).json({ error: 'jobType and payload required' });
      }
      const job = await scheduler.submitJob(jobType, payload, priority, createdBy);
      return res.status(201).json(job);
    } catch (err) {
      console.error('[Jobs] submit error:', err);
      return res.status(500).json({ error: 'Job submission failed' });
    }
  });

  router.post('/:jobId/result', async (req, res) => {
    try {
      const { deviceId, result } = req.body;
      if (!deviceId || !result) {
        return res.status(400).json({ error: 'deviceId and result required' });
      }
      await scheduler.completeJob(req.params['jobId']!, result, deviceId);
      return res.json({ status: 'ok' });
    } catch (err) {
      console.error('[Jobs] result error:', err);
      return res.status(500).json({ error: 'Result submission failed' });
    }
  });

  router.get('/', async (req, res) => {
    const { status, type, limit = '50' } = req.query;
    const q = db('jobs').orderBy('created_at', 'desc').limit(parseInt(String(limit), 10));
    if (status) q.where({ status });
    if (type)   q.where({ job_type: type });
    return res.json(await q);
  });

  router.get('/:jobId', async (req, res) => {
    const job = await db('jobs').where({ id: req.params['jobId'] }).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json(job);
  });

  return router;
}
