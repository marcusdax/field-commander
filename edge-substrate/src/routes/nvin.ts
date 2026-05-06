import { Router } from 'express';
import crypto from 'crypto';
import type { JobScheduler } from '../services/JobScheduler';

/**
 * NVIN Gateway endpoint — Field Commander mobile → Edge Substrate job queue.
 * POST /v1/nvin/ocr/submit creates a nvin_fusion job and returns the job ID.
 * The caller polls GET /v1/nvin/job/:jobId for the result.
 */
export function createNVINRouter(scheduler: JobScheduler) {
  const router = Router();

  router.post('/ocr/submit', async (req, res) => {
    try {
      const { plateText, confidence, geolocation, agentId, deviceId, imageHash, timestamp } = req.body;
      if (!plateText || typeof confidence !== 'number' || !geolocation) {
        return res.status(400).json({ error: 'plateText, confidence, geolocation required' });
      }

      const plateHash = crypto
        .createHash('sha256')
        .update(plateText.toUpperCase().trim())
        .digest('hex');

      // High-confidence scans get elevated priority (9 vs default 5)
      const priority = confidence >= 0.9 ? 9 : 5;

      const job = await scheduler.submitJob('nvin_fusion', {
        plateHash,
        plateText,
        geolocation,
        confidence,
        agentId:   agentId   ?? null,
        deviceId:  deviceId  ?? null,
        imageHash: imageHash ?? null,
        timestamp: timestamp ?? new Date().toISOString(),
      }, priority, 'nvin_gateway');

      return res.status(202).json({ jobId: job.id, plateHash, status: 'queued' });
    } catch (err) {
      console.error('[NVIN] ocr/submit error:', err);
      return res.status(500).json({ error: 'Submission failed' });
    }
  });

  router.get('/job/:jobId', async (req, res) => {
    const { db } = await import('../db/client');
    const job = await db('jobs').where({ id: req.params['jobId'] }).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json({ jobId: job.id, status: job.status, result: job.result });
  });

  return router;
}
