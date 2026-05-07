/**
 * OCRFrameProcessor — VisionCamera frame processor plugin
 *
 * Runs TFLite OCR synchronously in the Reanimated worklet thread.
 * Zero JS-thread blocking; the camera loop calls inference every frame.
 *
 * Usage:
 *   const { frameProcessor, modelState } = useOCRFrameProcessor(onResult);
 *   <Camera frameProcessor={frameProcessor} />
 */

import { useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { runOnJS } from 'react-native-reanimated';
import type { DetectedPlate } from '../types/ocr';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BLANK_IDX = CHARSET.length;
const NUM_CLASSES = CHARSET.length + 1;
const SEQ_LEN = 18;
const DET_MAX_BOXES = 16;

function ctcDecodeWorklet(rec: Float32Array, offset: number): string {
  'worklet';
  let prev = BLANK_IDX;
  let text = '';
  for (let t = 0; t < SEQ_LEN; t++) {
    let maxIdx = 0;
    let maxVal = -Infinity;
    const base = offset + t * NUM_CLASSES;
    for (let c = 0; c < NUM_CLASSES; c++) {
      if ((rec[base + c] ?? -Infinity) > maxVal) {
        maxVal = rec[base + c] ?? -Infinity;
        maxIdx = c;
      }
    }
    if (maxIdx !== BLANK_IDX && maxIdx !== prev) text += CHARSET[maxIdx] ?? '';
    prev = maxIdx;
  }
  return text;
}

export interface FrameOCRResult {
  plates: DetectedPlate[];
  processingTimeMs: number;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Hook that returns a VisionCamera frame processor performing on-device OCR.
 * Pass a stable (useCallback-wrapped) onResult to avoid worklet closure churn.
 */
export function useOCRFrameProcessor(
  onResult: (result: FrameOCRResult) => void,
  confidenceThreshold = 0.85,
) {
  const model = useTensorflowModel(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../../assets/models/ocr_v1.tflite'),
    'gpu',
  );

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (model.state !== 'loaded') return;

    const start = performance.now();
    // react-native-fast-tflite accepts a VisionCamera Frame directly as input
    const [out0, out1] = model.model.run([frame]);
    const dets = new Float32Array(out0 as ArrayBuffer);
    const recs = new Float32Array(out1 as ArrayBuffer);

    const plates: DetectedPlate[] = [];
    for (let i = 0; i < DET_MAX_BOXES; i++) {
      const detConf = dets[i * 5 + 4] ?? 0;
      if (detConf < 0.5) continue;

      const text = ctcDecodeWorklet(recs, i * SEQ_LEN * NUM_CLASSES);
      if (text.length < 2 || detConf < confidenceThreshold) continue;

      plates.push({
        text,
        confidence: detConf,
        boundingBox: {
          x: (dets[i * 5 + 0] ?? 0) * frame.width,
          y: (dets[i * 5 + 1] ?? 0) * frame.height,
          width: (dets[i * 5 + 2] ?? 0) * frame.width,
          height: (dets[i * 5 + 3] ?? 0) * frame.height,
        },
        plateType: 'STANDARD',
      });
    }

    const processingTimeMs = performance.now() - start;
    runOnJS(onResult)({ plates, processingTimeMs, frameWidth: frame.width, frameHeight: frame.height });
  }, [model, confidenceThreshold, onResult]);

  return { frameProcessor, modelState: model.state };
}
