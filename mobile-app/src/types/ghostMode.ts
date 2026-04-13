/**
 * Ghost Mode — Covert Operations Type Definitions
 * Tor + Post-Quantum Cryptography layer for field agents
 */

export interface GhostModeConfig {
  spoofLocation: boolean;
  silentUpload: boolean;
  encryptLocal: boolean;
  torRouting: boolean;
  deadMansSwitch: boolean;
  burstUploadIntervalMs?: number;  // Default: 5000
}

export interface GhostSession {
  sessionId: string;
  activatedAt: number;
  torCircuit: TorCircuitInfo;
  spoofedLocation: SpoofedLocation | null;
  encryptionKeyId: string;
  expiresAt?: number;
}

export interface TorCircuitInfo {
  circuitId: string;
  entryNode: string;
  exitNode: string;
  latencyMs: number;
  established: boolean;
}

export interface SpoofedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
}

export interface EvidenceData {
  id: string;
  type: EvidenceType;
  payload: Uint8Array;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export type EvidenceType =
  | 'PLATE_SCAN'
  | 'VIDEO_CLIP'
  | 'PHOTO'
  | 'AUDIO'
  | 'GPS_TRACK'
  | 'MAGIC_MOMENT';

export interface UploadResult {
  success: boolean;
  remoteId?: string;
  errorCode?: string;
  bytesUploaded: number;
  durationMs: number;
}
