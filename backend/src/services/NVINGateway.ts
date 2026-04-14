/**
 * NVINGateway — Server-side InsightLPR / Odasi integration
 * Receives plate captures from mobile agents and fans out to Odasi AI engines.
 */

import type {
  NVINAnalysisRequest,
  NVINAnalysisResponse,
  KDAFusionOutput,
  ActionCode,
  AlertLevel,
} from '../../mobile-app/src/types/nvin';
import { OdasiEngine } from './OdasiEngine';

export class NVINGateway {
  private odasi: OdasiEngine;

  constructor() {
    this.odasi = new OdasiEngine();
  }

  async analyze(request: NVINAnalysisRequest): Promise<NVINAnalysisResponse> {
    // Fan out to all four Odasi engines in parallel
    const [nade, gie, bne] = await Promise.all([
      this.odasi.runNADE(request),
      this.odasi.runGIE(request),
      this.odasi.runBNE(request),
    ]);

    // KDA fusion
    const kda: KDAFusionOutput = this.odasi.fuseKDA({ nade, gie, bne });

    const hotlistMatch = await this.odasi.checkHotlist(request.plateText);
    const alertLevel = this.deriveAlertLevel(kda.unifiedScore, hotlistMatch);
    const chainHash = await this.anchorToChain(request, kda);

    return {
      hotlistMatch,
      anomalyScore: nade.anomalyScore,
      recoveryLikelihood: bne.recoveryLikelihood,
      routeRisk: gie.geospatialRisk,
      recommendedAction: kda.recommendedAction,
      chainHash,
      alertLevel,
    };
  }

  private deriveAlertLevel(score: number, hotlist: boolean): AlertLevel {
    if (hotlist || score >= 0.9) return 'RED';
    if (score >= 0.7) return 'ORANGE';
    if (score >= 0.5) return 'YELLOW';
    return 'GREEN';
  }

  private async anchorToChain(
    request: NVINAnalysisRequest,
    kda: KDAFusionOutput
  ): Promise<string> {
    // Production: call Polygon RPC to anchor event hash
    const payload = JSON.stringify({ plate: request.plateText, score: kda.unifiedScore, ts: Date.now() });
    return `chain_${Buffer.from(payload).toString('base64url').slice(0, 32)}`;
  }
}
