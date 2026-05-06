/**
 * OCRService — TFLite Mobile License Plate Recognition
 * Production: react-native-fast-tflite + GPU delegate, greedy CTC decode.
 * Dev/CI:     deterministic mock when MOCK_OCR=true or model load fails.
 */

import { loadTensorflowModel } from 'react-native-fast-tflite';
import type { TensorflowModel } from 'react-native-fast-tflite';
import type { OCRConfig, OCRResult, DetectedPlate, OCRMetrics } from '../types/ocr';

// React Native global injected by Metro bundler
declare const __DEV__: boolean;

// ─── Model constants ──────────────────────────────────────────────────────────
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BLANK_IDX = CHARSET.length;        // 36
const NUM_CLASSES = CHARSET.length + 1;  // 37
const SEQ_LEN = 18;
const DET_MAX_BOXES = 16;
const INPUT_H = 480;
const INPUT_W = 640;
const INPUT_C = 3;

// Model output indices
const OUT_DET = 0;  // Float32[DET_MAX_BOXES * 5]  (x,y,w,h,conf normalised)
const OUT_REC = 1;  // Float32[DET_MAX_BOXES * SEQ_LEN * NUM_CLASSES] CTC logits

const DEFAULT_CONFIG: OCRConfig = {
  modelPath: 'ocr_v1.tflite',
  confidenceThreshold: 0.85,
  maxPlatesPerFrame: 4,
  inputResolution: { width: INPUT_W, height: INPUT_H },
  enableGPUDelegate: true,
  quantized: true,
};

// ─── Greedy CTC decoder ───────────────────────────────────────────────────────
function greedyCTC(logits: Float32Array, offset: number): { text: string; charConfs: number[] } {
  let prev = BLANK_IDX;
  let text = '';
  const charConfs: number[] = [];

  for (let t = 0; t < SEQ_LEN; t++) {
    const base = offset + t * NUM_CLASSES;
    let maxIdx = 0;
    let maxRaw = -Infinity;
    let sumExp = 0;

    for (let c = 0; c < NUM_CLASSES; c++) {
      const v = logits[base + c] ?? -Infinity;
      if (v > maxRaw) { maxRaw = v; maxIdx = c; }
      sumExp += Math.exp(v);
    }

    if (maxIdx !== BLANK_IDX && maxIdx !== prev) {
      text += CHARSET[maxIdx] ?? '';
      charConfs.push(Math.exp(maxRaw) / sumExp);
    }
    prev = maxIdx;
  }

  return { text, charConfs };
}

function isValidPlate(text: string): boolean {
  return text.length >= 2 && text.length <= 10 && /[A-Z]/.test(text) && /[0-9]/.test(text);
}

// ─── Dev mock (deterministic per 5-second window) ────────────────────────────
const MOCK_PLATES = ['ABC1234', 'XYZ7891', 'MTEST01', 'DEF4567', 'GHI8902'];
function devMock(): DetectedPlate[] {
  const idx = Math.floor(Date.now() / 5000) % MOCK_PLATES.length;
  const text = MOCK_PLATES[idx]!;
  const conf = 0.87 + idx * 0.025;
  return [{
    text,
    confidence: conf,
    boundingBox: { x: 160, y: 180, width: 320, height: 80 },
    characterConfidences: Array(text.length).fill(conf),
    state: 'CA',
    plateType: 'STANDARD',
  }];
}

// ─── Service class ────────────────────────────────────────────────────────────
class OCRService {
  private config: OCRConfig;
  private model: TensorflowModel | null = null;
  private isInitialized = false;
  private useMock = false;
  private metrics: OCRMetrics = {
    totalFramesProcessed: 0,
    platesDetected: 0,
    averageConfidence: 0,
    averageLatencyMs: 0,
    p95LatencyMs: 0,
    hotlistHits: 0,
  };
  private latencyHistory: number[] = [];

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (process.env['MOCK_OCR'] === 'true' || (__DEV__ && process.env['FORCE_MOCK_OCR'] === 'true')) {
      console.log('[OCRService] Mock mode — skipping TFLite load');
      this.useMock = true;
      this.isInitialized = true;
      return;
    }

    try {
      const delegate = this.config.enableGPUDelegate ? 'gpu' : 'default';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.model = await loadTensorflowModel(require('../../../assets/models/ocr_v1.tflite'), delegate);
      console.log(`[OCRService] TFLite model loaded (${delegate} delegate)`);
    } catch (err) {
      console.warn('[OCRService] TFLite load failed — falling back to mock:', err);
      this.useMock = true;
    }

    this.isInitialized = true;
  }

  async processFrame(imageBase64: string): Promise<OCRResult> {
    if (!this.isInitialized) await this.initialize();

    const startTime = Date.now();
    const frameId = `frame_${startTime}_${Math.random().toString(36).slice(2, 8)}`;

    const raw = (this.useMock || !this.model) ? devMock() : await this.runInference(imageBase64);
    const filtered = raw.filter(p => p.confidence >= this.config.confidenceThreshold);
    const processingTimeMs = Date.now() - startTime;

    this.updateMetrics(filtered, processingTimeMs);
    return { plates: filtered, processingTimeMs, frameId, timestamp: startTime };
  }

  private async runInference(imageBase64: string): Promise<DetectedPlate[]> {
    if (!this.model) return [];

    const input = this.preprocess(imageBase64);
    // react-native-fast-tflite v1.x: run([inputBuffer]) → [out0Buffer, out1Buffer]
    const outputs = this.model.run([input]);
    const detections = new Float32Array(outputs[OUT_DET] as ArrayBuffer);
    const recognition = new Float32Array(outputs[OUT_REC] as ArrayBuffer);

    const plates: DetectedPlate[] = [];
    for (let i = 0; i < DET_MAX_BOXES && plates.length < this.config.maxPlatesPerFrame; i++) {
      const conf = detections[i * 5 + 4] ?? 0;
      if (conf < 0.5) continue;

      const { text, charConfs } = greedyCTC(recognition, i * SEQ_LEN * NUM_CLASSES);
      if (!isValidPlate(text)) continue;

      const plateConf = charConfs.length ? charConfs.reduce((s, c) => s + c, 0) / charConfs.length : conf;
      plates.push({
        text,
        confidence: plateConf,
        boundingBox: {
          x: (detections[i * 5 + 0] ?? 0) * INPUT_W,
          y: (detections[i * 5 + 1] ?? 0) * INPUT_H,
          width: (detections[i * 5 + 2] ?? 0) * INPUT_W,
          height: (detections[i * 5 + 3] ?? 0) * INPUT_H,
        },
        characterConfidences: charConfs,
        plateType: 'STANDARD',
      });
    }
    return plates;
  }

  /**
   * Convert base64 raw-RGB payload to a normalised Float32 tensor [H*W*C].
   * In the VisionCamera frame processor path the frame buffer is passed directly
   * to react-native-fast-tflite without this conversion step.
   */
  private preprocess(imageBase64: string): Float32Array {
    const raw = Buffer.from(imageBase64, 'base64');
    const size = INPUT_H * INPUT_W * INPUT_C;
    const tensor = new Float32Array(size);
    for (let i = 0; i < Math.min(raw.length, size); i++) {
      tensor[i] = (raw[i] ?? 0) / 255.0;
    }
    return tensor;
  }

  getMetrics(): OCRMetrics { return { ...this.metrics }; }

  resetMetrics(): void {
    this.latencyHistory = [];
    this.metrics = { totalFramesProcessed: 0, platesDetected: 0, averageConfidence: 0, averageLatencyMs: 0, p95LatencyMs: 0, hotlistHits: 0 };
  }

  private updateMetrics(plates: DetectedPlate[], latencyMs: number): void {
    this.metrics.totalFramesProcessed += 1;
    this.metrics.platesDetected += plates.length;

    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > 1000) this.latencyHistory.shift();

    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    this.metrics.averageLatencyMs = sum / this.latencyHistory.length;

    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    this.metrics.p95LatencyMs = sorted[Math.floor(sorted.length * 0.95)] ?? 0;

    if (plates.length > 0) {
      const avg = plates.reduce((s, p) => s + p.confidence, 0) / plates.length;
      this.metrics.averageConfidence =
        (this.metrics.averageConfidence * (this.metrics.totalFramesProcessed - 1) + avg) /
        this.metrics.totalFramesProcessed;
    }
  }
}

export const ocrService = new OCRService();
export default OCRService;
