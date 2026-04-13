/**
 * OCR API Route — POST /v1/ocr/submit
 * Receives plate captures from Field Commander mobile agents.
 */

import type { Request, Response } from 'express';
import { NVINGateway } from '../services/NVINGateway';

const gateway = new NVINGateway();

export async function submitOCR(req: Request, res: Response): Promise<void> {
  const {
    plate_text,
    confidence,
    image_hash,
    geolocation,
    timestamp,
    device_id,
    agent_id,
  } = req.body as Record<string, unknown>;

  if (!plate_text || typeof confidence !== 'number') {
    res.status(400).json({ error: 'plate_text and confidence are required' });
    return;
  }

  try {
    const analysis = await gateway.analyze({
      plateText: plate_text as string,
      confidence: confidence as number,
      imageHash: image_hash as string,
      geolocation: geolocation as { lat: number; lon: number },
      timestamp: timestamp as string,
      deviceId: device_id as string,
      agentId: agent_id as string | undefined,
    });

    res.json({
      hotlist_match: analysis.hotlistMatch,
      anomaly_score: analysis.anomalyScore,
      recovery_likelihood: analysis.recoveryLikelihood,
      route_risk: analysis.routeRisk,
      recommended_action: analysis.recommendedAction,
      chain_hash: analysis.chainHash,
      alert_level: analysis.alertLevel,
      vehicle_info: analysis.vehicleInfo ?? null,
    });
  } catch (err) {
    console.error('[OCR route] Error:', err);
    res.status(500).json({ error: 'Internal analysis error' });
  }
}
