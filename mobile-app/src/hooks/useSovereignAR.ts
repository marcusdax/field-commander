import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { AnomalyMarker, GeofenceZone } from '../types/mission';

interface UseSovereignAROptions {
  missionId: string;
  ghostMode: boolean;
}

export const useSovereignAR = (options: UseSovereignAROptions) => {
  const { missionId, ghostMode } = options;
  
  const [planes, setPlanes] = useState<any[]>([]);
  const [anchors, setAnchors] = useState<AnomalyMarker[]>([]);
  const [geofence, setGeofence] = useState<GeofenceZone | null>(null);
  const [isARReady, setIsARReady] = useState(false);
  const [worldTrackingEnabled, setWorldTrackingEnabled] = useState(false);
  
  const arSessionRef = useRef<any>(null);

  useEffect(() => {
    const initAR = async () => {
      console.log('🎯 Initializing Sovereign AR...');
      
      setIsARReady(true);
      console.log(`✅ AR Ready (${Platform.OS})`);
    };

    initAR();

    return () => {
      console.log('🛑 AR Session ending');
    };
  }, [missionId]);

  const startWorldTracking = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🌍 Starting world tracking...');
      setWorldTrackingEnabled(true);
      return true;
    } catch (error) {
      console.error('World tracking failed:', error);
      return false;
    }
  }, []);

  const placeWorldPin = useCallback(async (
    screenX: number,
    screenY: number,
    type: AnomalyMarker['type'] = 'verification'
  ): Promise<AnomalyMarker | null> => {
    try {
      const hitResult = await performHitTest(screenX, screenY);
      
      if (!hitResult) {
        console.warn('No surface detected at tap location');
        return null;
      }

      const newAnchor: AnomalyMarker = {
        id: `ANCHOR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type,
        position: hitResult.position,
        confidence: 0.85 + Math.random() * 0.1,
        description: getTypeDescription(type),
        timestamp: Date.now(),
      };

      setAnchors(prev => [...prev, newAnchor]);
      console.log(`📍 World pin placed: ${type} at`, hitResult.position);

      return newAnchor;
    } catch (error) {
      console.error('Failed to place world pin:', error);
      return null;
    }
  }, []);

  const performHitTest = async (
    screenX: number,
    screenY: number
  ): Promise<{ position: { x: number; y: number; z: number }; transform: number[] } | null> => {
    return {
      position: {
        x: (Math.random() - 0.5) * 2,
        y: 0,
        z: -1 - Math.random() * 2,
      },
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        screenX, screenY, -2, 1,
      ],
    };
  };

  const getTypeDescription = (type: AnomalyMarker['type']): string => {
    const descriptions = {
      threat: 'Immediate threat detected',
      verification: 'Requires analyst verification',
      info: 'Informational marker',
      evidence: 'Evidence for documentation',
    };
    return descriptions[type];
  };

  const removeAnchor = useCallback((anchorId: string): void => {
    setAnchors(prev => prev.filter(a => a.id !== anchorId));
    console.log(`🗑️ Anchor removed: ${anchorId}`);
  }, []);

  const confirmAnchor = useCallback(async (anchorId: string): Promise<void> => {
    setAnchors(prev => prev.map(a => 
      a.id === anchorId 
        ? { ...a, confirmedBy: 'analyst', confidence: 1.0 } 
        : a
    ));
    console.log(`✅ Anchor confirmed: ${anchorId}`);
  }, []);

  const setGeofenceZone = useCallback((zone: GeofenceZone): void => {
    setGeofence(zone);
    console.log(`🔲 Geofence set: ${zone.type} zone (${zone.radius}m)`);
  }, []);

  const checkGeofence = useCallback((latitude: number, longitude: number): boolean => {
    if (!geofence) return true;
    
    const distance = calculateDistance(
      latitude, longitude,
      geofence.center.lat, geofence.center.lng
    );
    
    const isInside = distance <= geofence.radius;
    console.log(`📍 Distance to geofence center: ${distance}m (${isInside ? 'INSIDE' : 'OUTSIDE'})`);
    
    return geofence.type === 'inclusion' ? isInside : !isInside;
  }, [geofence]);

  const calculateDistance = (
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const getAnchorsByType = useCallback((type: AnomalyMarker['type']): AnomalyMarker[] => {
    return anchors.filter(a => a.type === type);
  }, [anchors]);

  const getAnchorsSummary = useCallback(() => {
    return {
      total: anchors.length,
      threat: anchors.filter(a => a.type === 'threat').length,
      verification: anchors.filter(a => a.type === 'verification').length,
      info: anchors.filter(a => a.type === 'info').length,
      evidence: anchors.filter(a => a.type === 'evidence').length,
      confirmed: anchors.filter(a => a.confirmedBy).length,
    };
  }, [anchors]);

  return {
    planes,
    anchors,
    geofence,
    isARReady,
    worldTrackingEnabled,
    startWorldTracking,
    placeWorldPin,
    removeAnchor,
    confirmAnchor,
    setGeofenceZone,
    checkGeofence,
    getAnchorsByType,
    getAnchorsSummary,
  };
};
