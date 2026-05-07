const BACKEND_URL = process.env['NVIN_BACKEND_URL'] ?? 'http://localhost:3001';

export interface NVINFusionPayload {
  plateHash: string;
  lat?: number;
  lon?: number;
  confidence: number;
  agentAddress: string;
  sessionId?: string;
  nadEScore?: number;
  gieScore?: number;
  bneScore?: number;
}

export interface FusionResult {
  kdaScore: number;
  hotlistHit: boolean;
  recommendedAction: string;
  evidenceHash: string;
}

export interface PayoutTrigger {
  txHash: string;
  payoutEth: number;
}

export class NVINAdapter {
  async executeJob(payload: NVINFusionPayload): Promise<FusionResult> {
    const nadE = payload.nadEScore ?? Math.random();
    const gie = payload.gieScore ?? Math.random();
    const bne = payload.bneScore ?? Math.random();
    const kdaScore = nadE * 0.35 + gie * 0.30 + bne * 0.35;
    const hotlistHit = payload.confidence >= 90 && kdaScore > 0.7;
    const recommendedAction = this.recommend(hotlistHit, kdaScore);
    const evidenceHash = '0x' + Buffer.from(payload.plateHash + String(Date.now())).toString('hex').slice(0, 64);
    return { kdaScore, hotlistHit, recommendedAction, evidenceHash };
  }

  private recommend(hotlistHit: boolean, kda: number): string {
    if (hotlistHit && kda >= 0.75) return 'TRIGGER_DTA';
    if (kda >= 0.85) return 'INTERCEPT';
    if (kda >= 0.70) return 'ALERT';
    return 'MONITOR';
  }

  async handleResult(payload: NVINFusionPayload, result: FusionResult): Promise<PayoutTrigger | null> {
    if (result.recommendedAction !== 'TRIGGER_DTA') return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/dta/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAddress: payload.agentAddress,
          plateHash: payload.plateHash,
          confidence: payload.confidence,
          evidenceHash: result.evidenceHash,
          sessionId: payload.sessionId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { txHash: data.txHash, payoutEth: data.payoutEth ?? 0.5 };
      }
    } catch (_) {}
    return null;
  }
}
