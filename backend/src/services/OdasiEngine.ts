/**
 * OdasiEngine — NADE, GIE, BNE, KDA AI engine wrappers
 * Production: HTTP fan-out to Odasi microservices + Redis hotlist.
 * Dev:        ODASI_MOCK=true for deterministic local outputs.
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import type { NVINAnalysisRequest, NADEOutput, GIEOutput, BNEOutput, KDAFusionOutput, ActionCode } from '@field-commander/types';

// ─── Redis client (lazy connect) ─────────────────────────────────────────────
const redis = new Redis({
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
  password: process.env['REDIS_PASSWORD'],
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 150, 3000),
});
redis.on('error', (err: Error) => {
  if (process.env['NODE_ENV'] !== 'test') console.error('[Redis]', err.message);
});

function plateHash(plateText: string): string {
  return crypto.createHash('sha256').update(plateText.toUpperCase().trim()).digest('hex');
}

async function postWithTimeout(url: string, body: unknown, ms = 5000): Promise<unknown> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(tid);
  }
}

// ─── Deterministic dev mocks ──────────────────────────────────────────────────
function mockNADE(req: NVINAnalysisRequest): NADEOutput {
  const base = req.confidence * 0.8;
  return {
    anomalyScore: Math.min(1, base + 0.05),
    anomalyType: base > 0.7 ? 'ROUTE_DEVIATION' : 'NONE',
    confidence: req.confidence,
    features: base > 0.7 ? ['speed_anomaly', 'repeat_sighting'] : [],
  };
}

function mockGIE(req: NVINAnalysisRequest): GIEOutput {
  const latR = (req.geolocation.lat * Math.PI) / 180;
  const lonR = (req.geolocation.lon * Math.PI) / 180;
  const risk = (Math.sin(latR * 7) * Math.cos(lonR * 3) + 1) / 2;
  return {
    geospatialRisk: Number(risk.toFixed(4)),
    predictedRoute: risk > 0.6 ? ['I-95 N', 'Exit 42'] : [],
    hotZones: [],
  };
}

function mockBNE(req: NVINAnalysisRequest): BNEOutput {
  return {
    behaviorLabel: req.confidence > 0.88 ? 'HIGH_VALUE_TARGET' : 'ROUTINE_SCAN',
    intentScore: req.confidence * 0.9,
    recoveryLikelihood: req.confidence * 0.85,
  };
}

// ─── OdasiEngine ─────────────────────────────────────────────────────────────
export class OdasiEngine {
  private get isMock(): boolean {
    return process.env['ODASI_MOCK'] === 'true' || process.env['NODE_ENV'] === 'test';
  }

  async runNADE(req: NVINAnalysisRequest): Promise<NADEOutput> {
    const url = process.env['ODASI_NADE_URL'];
    if (!url || this.isMock) return mockNADE(req);
    return postWithTimeout(url, req) as Promise<NADEOutput>;
  }

  async runGIE(req: NVINAnalysisRequest): Promise<GIEOutput> {
    const url = process.env['ODASI_GIE_URL'];
    if (!url || this.isMock) return mockGIE(req);
    return postWithTimeout(url, req) as Promise<GIEOutput>;
  }

  async runBNE(req: NVINAnalysisRequest): Promise<BNEOutput> {
    const url = process.env['ODASI_BNE_URL'];
    if (!url || this.isMock) return mockBNE(req);
    return postWithTimeout(url, req) as Promise<BNEOutput>;
  }

  fuseKDA({ nade, gie, bne }: { nade: NADEOutput; gie: GIEOutput; bne: BNEOutput }): KDAFusionOutput {
    const unifiedScore = nade.anomalyScore * 0.35 + gie.geospatialRisk * 0.30 + bne.intentScore * 0.35;
    return { nade, gie, bne, unifiedScore, recommendedAction: this.recommendAction(unifiedScore, bne.recoveryLikelihood) };
  }

  async checkHotlist(plateText: string): Promise<boolean> {
    try {
      const hash = plateHash(plateText);
      const hit = await redis.sismember('hotlist:plates', hash);
      return hit === 1;
    } catch {
      return false;
    }
  }

  async getGeoRisk(lat: number, lon: number): Promise<number> {
    try {
      // GEORADIUS: find hotzone members within 50 km
      const nearby = await redis.call(
        'GEORADIUS', 'geo:hotzones', String(lon), String(lat), '50', 'km', 'COUNT', '10'
      ) as string[];
      if (!nearby.length) return 0.1;
      return Math.min(1, 0.2 + nearby.length * 0.15);
    } catch {
      const latR = (lat * Math.PI) / 180;
      const lonR = (lon * Math.PI) / 180;
      return (Math.sin(latR * 7) * Math.cos(lonR * 3) + 1) / 2;
    }
  }

  private recommendAction(score: number, recovery: number): ActionCode {
    if (score >= 0.9) return 'IMMEDIATE_RESPONSE';
    if (score >= 0.75 && recovery >= 0.8) return 'TRIGGER_DTA';
    if (score >= 0.6) return 'UPLOAD_EVIDENCE';
    if (score >= 0.4) return 'ALERT';
    if (score >= 0.2) return 'MONITOR';
    return 'NO_ACTION';
  }
}
