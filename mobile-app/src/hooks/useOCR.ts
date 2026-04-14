/**
 * useOCR — React hook for on-device license plate OCR
 */

import { useState, useCallback } from 'react';
import type { OCRResult, OCRMetrics } from '../types/ocr';
import { ocrService } from '../services/OCRService';

export interface UseOCRReturn {
  processFrame: (imageBase64: string) => Promise<OCRResult | null>;
  metrics: OCRMetrics;
  isProcessing: boolean;
  lastResult: OCRResult | null;
  resetMetrics: () => void;
}

export function useOCR(): UseOCRReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OCRResult | null>(null);
  const [metrics, setMetrics] = useState<OCRMetrics>(ocrService.getMetrics());

  const processFrame = useCallback(async (imageBase64: string): Promise<OCRResult | null> => {
    if (isProcessing) return null;
    setIsProcessing(true);
    try {
      const result = await ocrService.processFrame(imageBase64);
      setLastResult(result);
      setMetrics(ocrService.getMetrics());
      return result;
    } catch (err) {
      console.error('[useOCR] processFrame error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const resetMetrics = useCallback(() => {
    ocrService.resetMetrics();
    setMetrics(ocrService.getMetrics());
  }, []);

  return { processFrame, metrics, isProcessing, lastResult, resetMetrics };
}
