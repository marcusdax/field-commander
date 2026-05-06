/**
 * NVINAdapter — executes nvin_fusion jobs for the Edge Substrate scheduler.
 *
 * Beta: KDA logic runs inline in Node.js.
 * Production: compiles to WASM and ships to device compute nodes.
 */

import Redis from 'ioredis';
import crypto from 'crypto';

const redis = new Redis({
  host:               process.env['REDIS_HOST']     ?? 'localhost',
  port:               parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
  password:           process.env['REDIS_PASSWORD'],
  lazyConnect:        true,
  enableOfflineQueue: false,
});
redis.on('error', (e: Error) => console.error('[Edge/Redis]', e.message));

export interface NVINFusionPayload {
  plateHash:   string;
  plateText?:  string;
  geolocation: { lat: number; lon: number };
  confidence:  number;
  agentId?:    string;
  timestamp:   string;
}

export interface FusionResult {
  hotlistMatch:        boolean;
  kdaScore:            number;
  recommendedAction:   string;
  recoveryLikelihood:  number;
  anomalyScore:        number;
  geospatialRisk:      number;
  intentScore:         number;
  executedAt:          string;
}

export class NVINAdapter {
  async executeJob(payload: NVINFusionPayload): Promise<FusionResult> {
    const [hotlistMatch, geoRisk] = await Promise.all([
      this.checkHotlist(payload.plateHash, payload.plateText),
      this.getGeoRisk(payload.geolocation.lat, payload.geolocation.lon),
    ]);

    // KDA fusion weights: NADE 35%, GIE 30%, BNE 35% (v4.0 spec)
    const anomalyScore  = Math.min(1, payload.confidence * 0.8 + 0.05);  // NADE
    const intentScore   = payload.confidence * 0.9;                       // BNE
    const kdaScore      = anomalyScore * 0.35 + geoRisk * 0.30 + intentScore * 0.35;
    const recoveryLikelihood = payload.confidence * 0.85;

    return {
      hotlistMatch,
      kdaScore,
      recommendedAction: this.recommend(kdaScore, recoveryLikelihood, hotlistMatch),
      recoveryLikelihood,
      anomalyScore,
      geospatialRisk: geoRisk,
      intentScore,
      executedAt: new Date().toISOString(),
    };
  }

  async handleResult(
    payload: Record<string, unknown>,
    result: Record<string, unknown>,
  ): Promise<{ plateHash: string; agentAddress: string; dtaPayload: unknown } | null> {
    const fusion = result as FusionResult;
    const job    = payload as NVINFusionPayload;

    if (!fusion.hotlistMatch || fusion.recommendedAction !== 'TRIGGER_DTA') return null;

    const agentAddress = job.agentId ?? '';
    if (!agentAddress.startsWith('0x')) {
      console.warn('[NVINAdapter] DTA skipped: no valid agent address in job payload');
      return null;
    }

    const backendUrl = process.env['NVIN_BACKEND_URL'] ?? 'http://localhost:3001';
    try {
      const resp = await fetch(`${backendUrl}/api/dta/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateHash:     job.plateHash,
          agentAddress,
          evidenceHash:  crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex'),
          confidence:    job.confidence,
        }),
      });
      if (!resp.ok) throw new Error(`DTA API ${resp.status}`);
      const dtaPayload = await resp.json();
      console.log(`[NVINAdapter] DTA payout triggered → ${(job.plateHash ?? '').slice(0, 12)}...`);
      return { plateHash: job.plateHash, agentAddress, dtaPayload };
    } catch (err) {
      console.error('[NVINAdapter] DTA payout failed:', err);
      return null;
    }
  }

  private async checkHotlist(plateHash: string, plateText?: string): Promise<boolean> {
    try {
      if ((await redis.sismember('hotlist:plates', plateHash)) === 1) return true;
      if (plateText) {
        const raw = crypto.createHash('sha256').update(plateText.toUpperCase().trim()).digest('hex');
        return (await redis.sismember('hotlist:plates', raw)) === 1;
      }
      return false;
    } catch { return false; }
  }

  private async getGeoRisk(lat: number, lon: number): Promise<number> {
    try {
      const nearby = await redis.call(
        'GEORADIUS', 'geo:hotzones', String(lon), String(lat), '50', 'km', 'COUNT', '10'
      ) as string[];
      if (!nearby.length) return 0.1;
      return Math.min(1, 0.2 + nearby.length * 0.15);
    } catch {
      const lR = (lat * Math.PI) / 180;
      const lO = (lon * Math.PI) / 180;
      return (Math.sin(lR * 7) * Math.cos(lO * 3) + 1) / 2;
    }
  }

  private recommend(kda: number, recovery: number, hotlist: boolean): string {
    if (hotlist && kda >= 0.75) return 'TRIGGER_DTA';
    if (kda >= 0.9)             return 'IMMEDIATE_RESPONSE';
    if (kda >= 0.75 && recovery >= 0.8) return 'TRIGGER_DTA';
    if (kda >= 0.6)             return 'UPLOAD_EVIDENCE';
    if (kda >= 0.4)             return 'ALERT';
    if (kda >= 0.2)             return 'MONITOR';
    return 'NO_ACTION';
  }
}
