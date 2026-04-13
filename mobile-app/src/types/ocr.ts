/**
 * OCR Engine Type Definitions
 * TFLite-based Mobile License Plate Recognition
 */

export interface OCRConfig {
  modelPath: string;
  confidenceThreshold: number;   // Default: 0.85
  maxPlatesPerFrame: number;     // Default: 4
  inputResolution: Resolution;
  enableGPUDelegate: boolean;
  quantized: boolean;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface OCRResult {
  plates: DetectedPlate[];
  processingTimeMs: number;
  frameId: string;
  timestamp: number;
}

export interface DetectedPlate {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  characterConfidences?: number[];  // Per-character confidence
  state?: string;                   // Detected state/country
  plateType?: PlateType;
}

export type PlateType =
  | 'STANDARD'
  | 'VANITY'
  | 'TEMPORARY'
  | 'COMMERCIAL'
  | 'GOVERNMENT'
  | 'DIPLOMATIC'
  | 'UNKNOWN';

export interface OCRMetrics {
  totalFramesProcessed: number;
  platesDetected: number;
  averageConfidence: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  hotlistHits: number;
}

// ─── AR Overlay ──────────────────────────────────────────────────────────────

export interface AROverlayConfig {
  showConfidence: boolean;
  showHotlistStatus: boolean;
  showRecoveryLikelihood: boolean;
  pulseOnHotlistMatch: boolean;
  colorScheme: ARColorScheme;
}

export interface ARColorScheme {
  hotlistMatch: string;    // Default: '#FF0000'
  highConfidence: string;  // Default: '#00FF00'
  medConfidence: string;   // Default: '#FFA500'
  lowConfidence: string;   // Default: '#808080'
}

// ─── Magic Moment ────────────────────────────────────────────────────────────

export interface MagicMomentCapture {
  captureId: string;
  plateReading: import('./nvin').PlateReading;
  videoBufferSeconds: number;   // Default: 15
  audioIncluded: boolean;
  gpsTrack: import('./nvin').GeoLocation[];
  evidenceHash: string;         // SHA-256 of all captured data
  chainHash?: string;           // NVIN blockchain anchor
  capturedAt: number;
}
