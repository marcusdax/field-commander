/**
 * NVINService — InsightLPR / Odasi Gateway
 * Submits plate readings to the National Vehicle Intelligence Network
 * and returns unified KDA fusion analysis.
 */

import type {
  NVINAnalysisRequest,
  NVINAnalysisResponse,
  DTAPayoutRequest,
  DTAPayoutResponse,
} from '../types/nvin';

const NVIN_API_URL = process.env.NVIN_API_URL ?? 'https://api.nvin.network/v1';
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

class NVINService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client': 'FieldCommander/1.0',
    };
  }

  /**
   * Submit an OCR plate capture to NVIN for analysis.
   * Triggers NADE, GIE, BNE engines and returns KDA fusion result.
   */
  async submitCapture(request: NVINAnalysisRequest): Promise<NVINAnalysisResponse> {
    const response = await fetchWithTimeout(
      `${NVIN_API_URL}/ocr/submit`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          plate_text: request.plateText,
          confidence: request.confidence,
          image_hash: request.imageHash,
          geolocation: request.geolocation,
          timestamp: request.timestamp,
          device_id: request.deviceId,
          agent_id: request.agentId,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIN submitCapture failed [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    return {
      hotlistMatch: data.hotlist_match,
      anomalyScore: data.anomaly_score,
      recoveryLikelihood: data.recovery_likelihood,
      routeRisk: data.route_risk ?? 0,
      recommendedAction: data.recommended_action,
      chainHash: data.chain_hash,
      vehicleInfo: data.vehicle_info,
      alertLevel: data.alert_level,
    };
  }

  /**
   * Request a DTA payout for a verified recovery.
   * Triggers the CitizenLedgerDTA smart contract on Polygon.
   */
  async requestDTAPayout(request: DTAPayoutRequest): Promise<DTAPayoutResponse> {
    const response = await fetchWithTimeout(
      `${NVIN_API_URL}/dta/payout`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          plate_hash: request.plateHash,
          agent_address: request.agentAddress,
          evidence_hash: request.evidenceHash,
          confidence: request.confidence,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DTA payout failed [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    return {
      transactionHash: data.transaction_hash,
      payoutAmountEth: data.payout_amount,
      tcrReward: data.tcr_reward,
      blockNumber: data.block_number,
    };
  }

  /**
   * Health-check the NVIN gateway.
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${NVIN_API_URL}/health`,
        { method: 'GET', headers: this.headers },
        3_000
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const nvinService = new NVINService(process.env.NVIN_API_KEY ?? '');
export default NVINService;
