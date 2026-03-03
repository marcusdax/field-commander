import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Sensors } from 'react-native-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MagicMoment, AnomalyMarker } from '../types/mission';
import { storeInVault } from './qrcVault';
import { settleDTA } from './dtaSettlement';
import { registerMagicMoment } from './blockchainDTA';

const BUFFER_DURATION_MS = 15000;
const MAX_BUFFER_SIZE = 450;

interface SensorData {
  pressure: number;
  temperature: number;
  airQuality: number;
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
}

interface UseMagicMomentOptions {
  missionId: string;
  ghostMode: boolean;
  anchors: AnomalyMarker[];
  luminNodes: string[];
}

export const useMagicMoment = (options: UseMagicMomentOptions) => {
  const { missionId, ghostMode, anchors, luminNodes } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [buffer, setBuffer] = useState<any[]>([]);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  
  const recordingRef = useRef(false);
  const bufferRef = useRef<any[]>([]);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const subscription = Sensors.pressure.subscribe({
      next: (pressure) => {
        setSensorData(prev => prev ? { ...prev, pressure } : null);
      },
      error: (error) => console.log('Pressure sensor error:', error),
    });

    return () => {
      subscription.unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    console.log('🎬 Starting Magic Moment capture...');
    setIsRecording(true);
    recordingRef.current = true;
    startTimeRef.current = Date.now();
    bufferRef.current = [];

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / BUFFER_DURATION_MS, 1);
      setRecordingProgress(progress);

      if (elapsed >= BUFFER_DURATION_MS) {
        stopRecording();
      }
    }, 100);
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    console.log('🛑 Stopping Magic Moment capture...');
    recordingRef.current = false;
    setIsRecording(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const momentData: MagicMoment = {
      id: `MM-${Date.now()}`,
      missionId,
      duration: BUFFER_DURATION_MS / 1000,
      timestamp: Date.now(),
      videoBuffer: bufferRef.current.map(b => b.frame),
      spatialAnchors: anchors,
      dualAngle: luminNodes.length > 0,
      sensors: sensorData || {
        pressure: 0,
        temperature: 0,
        airQuality: 0,
        accelerometer: { x: 0, y: 0, z: 0 },
        gyroscope: { x: 0, y: 0, z: 0 },
      },
    };

    await captureMagicMoment(momentData);
  }, [missionId, anchors, luminNodes, sensorData]);

  const captureMagicMoment = async (momentData: MagicMoment): Promise<{
    dtaToken: string;
    tcEarned: number;
  }> => {
    try {
      if (ghostMode) {
        await storeInVault(momentData, 'magic_moment', missionId);
      }

      const settlement = await settleDTA(missionId, {
        verificationMultiplier: 1.5,
        civicImpactMultiplier: 1.2,
      });

      await registerMagicMoment(missionId, momentData, settlement.tcEarned);

      console.log(`🔥 Magic Moment captured & vaulted | DTA: ${settlement.dtaToken} | TC: +${settlement.tcEarned}`);

      return {
        dtaToken: settlement.dtaToken,
        tcEarned: settlement.tcEarned,
      };
    } catch (error) {
      console.error('Magic Moment capture failed:', error);
      throw error;
    }
  };

  const addToBuffer = useCallback((frame: any) => {
    if (!recordingRef.current) return;

    bufferRef.current.push({
      timestamp: Date.now(),
      frame,
      sensors: sensorData,
    });

    if (bufferRef.current.length > MAX_BUFFER_SIZE) {
      bufferRef.current.shift();
    }
  }, [sensorData]);

  return {
    isRecording,
    recordingProgress,
    sensorData,
    startRecording,
    stopRecording,
    addToBuffer,
  };
};

export const startMagicMoment = async (
  missionId: string,
  anchors: AnomalyMarker[],
  ghostMode: boolean,
  luminNodes: any[]
): Promise<void> => {
  console.log('🎬 Starting Magic Moment service...');
  
  const momentData: MagicMoment = {
    id: `MM-${Date.now()}`,
    missionId,
    duration: 15,
    timestamp: Date.now(),
    videoBuffer: [],
    spatialAnchors: anchors,
    dualAngle: luminNodes.length > 0,
    sensors: {
      pressure: 1013.25,
      temperature: 22,
      airQuality: 42,
      accelerometer: { x: 0, y: 0, z: 9.8 },
      gyroscope: { x: 0, y: 0, z: 0 },
    },
  };

  if (ghostMode) {
    await storeInVault(momentData, 'magic_moment', missionId);
  }

  const settlement = await settleDTA(missionId, {
    verificationMultiplier: 1.5,
    civicImpactMultiplier: 1.2,
  });

  await registerMagicMoment(missionId, momentData, settlement.tcEarned);

  console.log(`🔥 Magic Moment complete: ${settlement.dtaToken}`);
};
