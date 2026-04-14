/**
 * LuminNode Swarm Type Definitions
 * Wireless 4K camera mesh for 360° stakeout coverage
 */

export interface LuminNodeDevice {
  nodeId: string;
  macAddress: string;
  firmwareVersion: string;
  batteryPercent: number;
  isConnected: boolean;
  signalStrength: number;      // dBm
  location?: LuminNodeLocation;
  capabilities: NodeCapabilities;
}

export interface LuminNodeLocation {
  lat: number;
  lon: number;
  mountingType: 'MAGNETIC' | 'TRIPOD' | 'ADHESIVE' | 'HANDHELD';
  coverageAngle: number;       // degrees FOV
  orientationDeg?: number;     // 0–359
}

export interface NodeCapabilities {
  resolution4K: boolean;
  nightVision: boolean;
  irIllumination940nm: boolean;
  weatherproofIP67: boolean;
  maxFPS: number;
}

export interface SwarmConfig {
  swarmId: string;
  nodes: string[];             // node IDs
  topology: Record<string, MeshRole>;
  coverageAreaM2: number;
  estimatedBatteryHours: number;
  watchdogTarget?: string;     // Target plate text
  createdAt: number;
}

export type MeshRole = 'PRIMARY' | 'RELAY' | 'LEAF';

export interface WatchdogAlert {
  swarmId: string;
  nodeId: string;
  detectedPlate: string;
  confidence: number;
  timestamp: number;
  imageUri: string;
  location: LuminNodeLocation;
}

export interface SwarmMetrics {
  activeNodes: number;
  totalNodes: number;
  avgBatteryPercent: number;
  detectionCount: number;
  alertsTriggered: number;
  meshLatencyMs: number;
}
