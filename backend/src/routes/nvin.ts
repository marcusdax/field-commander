import { Router } from 'express';
import crypto from 'crypto';
import { NVINGateway } from '../services/NVINGateway';
import { db } from '../db/client';
import type { NVINAnalysisRequest } from '@field-commander/types';

export const nvinRouter = Router();
const gateway = new NVINGateway();

function sha256Hex(text: string): string {
  return '0x' + crypto.createHash('sha256').update(text.toUpperCase().trim()).digest('hex');
}

nvinRouter.post('/analyze', async (req, res) => {
  try {
    const { sessionId, ...body } = req.body as NVINAnalysisRequest & { sessionId?: string };
    if (!body.plateText || typeof body.confidence !== 'number') {
      return res.status(400).json({ error: 'plateText and confidence required' });
    }

    const result = await gateway.analyze(body);

    // Persist audit trail — non-blocking
    db('hotlist_audit').insert({
      plate_hash: sha256Hex(body.plateText),
      hit: result.hotlistMatch,
      agent_id: body.agentId ?? null,
      session_id: sessionId ?? null,
      lat: body.geolocation?.lat ?? null,
      lon: body.geolocation?.lon ?? null,
      confidence: body.confidence,
      recommended_action: result.recommendedAction,
    }).catch((err: Error) => console.warn('[NVIN] audit insert failed:', err.message));

    return res.json(result);
  } catch (err) {
    console.error('[NVIN] analyze error:', err);
    return res.status(500).json({ error: 'Analysis failed' });
  }
});

nvinRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));
