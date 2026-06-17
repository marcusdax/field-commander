/**
 * NVIN / InsightLPR Core Type Definitions (extracted from mobile-app)
 */

export interface PlateReading {
  plateText: string;
  confidence: number;
  boundingBox: BoundingBox;
  imageHash: string;
  timestamp: string;
  geolocation: GeoLocation;
  deviceId: string;
  sessionId?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeoLocation {
  lat: number;
  lon: number;
  accuracy?: number;
  altitude?: number;
  spoofed?: boolean;
}

export interface NVINAnalysisRequest {
  plateText: string;
  confidence: number;
  imageHash: string;
  geolocation: GeoLocation;
  timestamp: string;
  deviceId: string;
  agentId?: string;
}

export interface NVINAnalysisResponse {
  hotlistMatch: boolean;
  anomalyScore: number;
  recoveryLikelihood: number;
  routeRisk: number;
  recommendedAction: ActionCode;
  chainHash: string;
  vehicleInfo?: VehicleInfo;
  alertLevel: AlertLevel;
}

export type ActionCode =
  | 'NO_ACTION'
  | 'MONITOR'
  | 'ALERT'
  | 'IMMEDIATE_RESPONSE'
  | 'UPLOAD_EVIDENCE'
  | 'TRIGGER_DTA';

export type AlertLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  registeredState?: string;
  stolenSince?: string;
  caseNumber?: string;
  listedValue?: number;
}

export interface HotlistEntry {
  plateHash: string;
  alertLevel: AlertLevel;
  caseType: string;
  reward?: number;
  expiresAt?: string;
}

export interface NADEOutput {
  anomalyScore: number;
  anomalyType?: string;
  confidence: number;
  features: string[];
}

export interface GIEOutput {
  geospatialRisk: number;
  predictedRoute?: string[];
  hotZones: GeoLocation[];
}

export interface BNEOutput {
  behaviorLabel: string;
  intentScore: number;
  recoveryLikelihood: number;
}

export interface KDAFusionOutput {
  nade: NADEOutput;
  gie: GIEOutput;
  bne: BNEOutput;
  unifiedScore: number;
  recommendedAction: ActionCode;
}

export interface DTAPayoutRequest {
  plateHash: string;
  agentAddress: string;
  evidenceHash: string;
  confidence: number;
}

export interface DTAPayoutResponse {
  transactionHash: string;
  payoutAmountEth: string;
  tcrReward: string;
  blockNumber: number;
}

export interface AgentEarnings {
  agentAddress: string;
  totalEthEarned: string;
  totalTcrEarned: string;
  recoveriesCount: number;
}

export {};
