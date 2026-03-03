import { useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { MagicMoment } from '../types/mission';

interface DefectResult {
  type: 'crack' | 'structural_stress' | 'occupancy' | 'anomaly';
  confidence: number;
  location: { x: number; y: number; width: number; height: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UseAIDefectDetectionOptions {
  missionId: string;
  ghostMode: boolean;
  onDefectDetected?: (defects: DefectResult[]) => void;
}

export const useAIDefectDetection = (options: UseAIDefectDetectionOptions) => {
  const { missionId, ghostMode, onDefectDetected } = options;

  const processFrame = useFrameProcessor((frame) => {
    'worklet';
    
    const mockDefects = detectDefects(frame);
    
    if (mockDefects.length > 0 && onDefectDetected) {
      runOnJS(onDefectDetected)(mockDefects);
    }
  }, []);

  const analyzeFrame = async (frame: any): Promise<DefectResult[]> => {
    return detectDefects(frame);
  };

  return {
    frameProcessor: processFrame,
    analyzeFrame,
  };
};

const detectDefects = (frame: any): DefectResult[] => {
  const defects: DefectResult[] = [];
  
  const randomChance = Math.random();
  
  if (randomChance > 0.95) {
    defects.push({
      type: 'crack',
      confidence: 0.75 + Math.random() * 0.2,
      location: {
        x: Math.random() * 0.8,
        y: Math.random() * 0.8,
        width: 0.1 + Math.random() * 0.2,
        height: 0.1 + Math.random() * 0.2,
      },
      severity: Math.random() > 0.7 ? 'high' : 'medium',
    });
  }

  if (randomChance > 0.9) {
    defects.push({
      type: 'structural_stress',
      confidence: 0.65 + Math.random() * 0.25,
      location: {
        x: Math.random() * 0.8,
        y: Math.random() * 0.8,
        width: 0.15 + Math.random() * 0.3,
        height: 0.15 + Math.random() * 0.3,
      },
      severity: Math.random() > 0.5 ? 'critical' : 'high',
    });
  }

  if (randomChance > 0.92) {
    defects.push({
      type: 'occupancy',
      confidence: 0.8 + Math.random() * 0.15,
      location: {
        x: Math.random() * 0.8,
        y: Math.random() * 0.8,
        width: 0.2 + Math.random() * 0.2,
        height: 0.2 + Math.random() * 0.2,
      },
      severity: 'medium',
    });
  }

  return defects;
};

export const generateAutomatedReport = async (
  missionId: string,
  defects: DefectResult[]
): Promise<{
  reportId: string;
  defects: DefectResult[];
  summary: string;
  recommendedActions: string[];
  timestamp: number;
}> => {
  const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const criticalCount = defects.filter(d => d.severity === 'critical').length;
  const highCount = defects.filter(d => d.severity === 'high').length;

  const summary = `
    Analysis Complete for Mission ${missionId}.
    Found ${defects.length} defect(s).
    ${criticalCount > 0 ? `${criticalCount} CRITICAL issues require immediate attention.` : ''}
    ${highCount > 0 ? `${highCount} HIGH severity issues detected.` : ''}
    ${defects.length === 0 ? 'No significant defects detected.' : ''}
  `.trim();

  const recommendedActions: string[] = [];

  if (criticalCount > 0) {
    recommendedActions.push('STOP all operations in affected area');
    recommendedActions.push('Notify immediate supervisor');
    recommendedActions.push('Document with Magic Moment capture');
  }

  if (highCount > 0) {
    recommendedActions.push('Schedule urgent inspection');
    recommendedActions.push('Implement temporary safety measures');
  }

  if (defects.some(d => d.type === 'structural_stress')) {
    recommendedActions.push('Request structural engineer review');
    recommendedActions.push('Block access to affected zone');
  }

  const report = {
    reportId,
    defects,
    summary,
    recommendedActions,
    timestamp: Date.now(),
  };

  console.log(`📋 Automated report generated: ${reportId}`);

  return report;
};

export const runBatchAnalysis = async (
  frames: any[],
  missionId: string
): Promise<DefectResult[]> => {
  const allDefects: DefectResult[] = [];

  for (const frame of frames) {
    const defects = await analyzeFrame(frame);
    allDefects.push(...defects);
  }

  return allDefects;
};
