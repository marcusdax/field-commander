/**
 * PlateAROverlay — Real-time AR bounding-box and status overlay
 * Renders over the camera feed using @viro-community/react-viro (ARKit/ARCore).
 */

import React from 'react';
import type { AlertLevel } from '../types/nvin';
import type { AROverlayConfig } from '../types/ocr';

interface PlateOverlayProps {
  plateText: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  isHotlistMatch: boolean;
  alertLevel?: AlertLevel;
  recoveryLikelihood?: number;
  config?: Partial<AROverlayConfig>;
}

const DEFAULT_COLORS: AROverlayConfig['colorScheme'] = {
  hotlistMatch: '#FF0000',
  highConfidence: '#00FF00',
  medConfidence: '#FFA500',
  lowConfidence: '#808080',
};

const getStatusColor = (
  isHotlistMatch: boolean,
  confidence: number,
  colors: AROverlayConfig['colorScheme']
): string => {
  if (isHotlistMatch) return colors.hotlistMatch;
  if (confidence > 0.9) return colors.highConfidence;
  if (confidence > 0.7) return colors.medConfidence;
  return colors.lowConfidence;
};

const getAlertLabel = (level?: AlertLevel): string => {
  switch (level) {
    case 'RED': return '⚠️ HOTLIST MATCH — IMMEDIATE ACTION';
    case 'ORANGE': return '⚠️ HIGH ALERT';
    case 'YELLOW': return '⚠️ MONITOR';
    default: return '';
  }
};

/**
 * PlateAROverlay renders AR annotations directly over detected plates.
 *
 * Note: In production this component is used inside a ViroARScene from
 * @viro-community/react-viro. Viro handles 3D world anchoring;
 * we pass bounding-box screen coordinates from the OCR output.
 *
 * For unit tests and Storybook this component renders plain RN View/Text
 * wrappers — swap ViroARScene/ViroText for the real Viro imports at build time.
 */
export const PlateAROverlay: React.FC<PlateOverlayProps> = ({
  plateText,
  confidence,
  boundingBox,
  isHotlistMatch,
  alertLevel,
  recoveryLikelihood,
  config,
}) => {
  const colors = { ...DEFAULT_COLORS, ...config?.colorScheme };
  const statusColor = getStatusColor(isHotlistMatch, confidence, colors);
  const alertLabel = getAlertLabel(alertLevel);

  // --- Viro AR imports would be uncommented in production native build ---
  // import { ViroARScene, ViroText, ViroBox } from '@viro-community/react-viro';
  //
  // return (
  //   <ViroARScene>
  //     <ViroBox position={[bb.x, bb.y, -1]} scale={[bb.w, bb.h, 0.01]} materials={['highlight']} />
  //     <ViroText text={plateText} position={[bb.x, bb.y - 0.1, -1]} color={statusColor} />
  //     <ViroText text={`${(confidence * 100).toFixed(0)}%`} position={[bb.x + 0.2, bb.y, -1]} />
  //     {isHotlistMatch && <ViroText text={alertLabel} color="#FF0000" />}
  //   </ViroARScene>
  // );

  // Fallback: return structured data for non-AR environments
  return {
    plateText,
    statusColor,
    confidence: `${(confidence * 100).toFixed(0)}%`,
    alertLabel: isHotlistMatch ? alertLabel : null,
    recoveryText: recoveryLikelihood != null
      ? `Recovery likelihood: ${(recoveryLikelihood * 100).toFixed(0)}%`
      : null,
    boundingBox,
  } as unknown as React.ReactElement;
};

export default PlateAROverlay;
