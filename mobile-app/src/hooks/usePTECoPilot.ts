import { useState, useEffect, useCallback, useRef } from 'react';
import Geolocation, { GeoPosition, GeoError } from '@react-native-community/geolocation';
import { PTESuggestion } from '../types/mission';

interface UsePTECoPilotOptions {
  missionId: string;
  ghostMode: boolean;
  enabled?: boolean;
}

export const usePTECoPilot = (options: UsePTECoPilotOptions) => {
  const { missionId, ghostMode, enabled = true } = options;
  
  const [suggestions, setSuggestions] = useState<PTESuggestion[]>([]);
  const [optimalRoute, setOptimalRoute] = useState<{
    heading: number;
    distance: number;
    waypoints: { lat: number; lng: number }[];
  } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [missionExtensionOpportunity, setMissionExtensionOpportunity] = useState(false);
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high'>('low');
  
  const watchId = useRef<number | null>(null);
  const suggestionInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    console.log('🤖 Starting PTE Co-Pilot...');

    const startLocationTracking = () => {
      Geolocation.setOptions({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });

      watchId.current = Geolocation.watchPosition(
        (position: GeoPosition) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          
          if (ghostMode) {
            console.log('📍 Location tracked (Ghost Mode active)');
          }
        },
        (error: GeoError) => {
          console.error('Location error:', error);
        },
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    };

    startLocationTracking();

    suggestionInterval.current = setInterval(() => {
      generateSuggestions();
    }, 8000);

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
      if (suggestionInterval.current) {
        clearInterval(suggestionInterval.current);
      }
    };
  }, [enabled, ghostMode, missionId]);

  const generateSuggestions = useCallback(() => {
    if (!currentLocation) return;

    const newSuggestions: PTESuggestion[] = [];

    const random = Math.random();

    if (random > 0.3) {
      newSuggestions.push({
        id: `SUG-${Date.now()}-1`,
        type: 'route',
        content: `Approach from ${getRandomDirection()} – ${60 + Math.floor(Math.random() * 30)}% lower risk`,
        confidence: 0.7 + Math.random() * 0.2,
        timestamp: Date.now(),
      });
    }

    if (random > 0.5) {
      newSuggestions.push({
        id: `SUG-${Date.now()}-2`,
        type: 'pin',
        content: `Deploy LuminNode #${Math.floor(Math.random() * 12) + 1} at ${getRandomDirection()} for blind-spot coverage`,
        confidence: 0.65 + Math.random() * 0.2,
        timestamp: Date.now(),
      });
    }

    if (random > 0.7) {
      newSuggestions.push({
        id: `SUG-${Date.now()}-3`,
        type: 'extension',
        content: `Mission extension opportunity detected (+${15 + Math.floor(Math.random() * 20)} TC)`,
        confidence: 0.6 + Math.random() * 0.2,
        timestamp: Date.now(),
      });
      setMissionExtensionOpportunity(true);
    }

    if (random > 0.85) {
      newSuggestions.push({
        id: `SUG-${Date.now()}-4`,
        type: 'safety',
        content: `Elevated activity detected in proximity – maintain ${Math.floor(Math.random() * 3) + 2}m distance`,
        confidence: 0.75 + Math.random() * 0.15,
        timestamp: Date.now(),
      });
      setThreatLevel('medium');
    }

    setSuggestions(newSuggestions);
    updateOptimalRoute();

    console.log(`💡 Generated ${newSuggestions.length} PTE suggestions`);
  }, [currentLocation]);

  const updateOptimalRoute = useCallback(() => {
    if (!currentLocation) return;

    setOptimalRoute({
      heading: Math.random() * 360,
      distance: 50 + Math.random() * 200,
      waypoints: [
        {
          latitude: currentLocation.latitude + (Math.random() - 0.5) * 0.01,
          longitude: currentLocation.longitude + (Math.random() - 0.5) * 0.01,
        },
        {
          latitude: currentLocation.latitude + (Math.random() - 0.5) * 0.02,
          longitude: currentLocation.longitude + (Math.random() - 0.5) * 0.02,
        },
      ],
    });
  }, [currentLocation]);

  const getRandomDirection = (): string => {
    const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
    return directions[Math.floor(Math.random() * directions.length)];
  };

  const acceptSuggestion = useCallback((suggestionId: string): void => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    console.log(`✅ Suggestion accepted: ${suggestionId}`);
  }, []);

  const dismissSuggestion = useCallback((suggestionId: string): void => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    console.log(`❌ Suggestion dismissed: ${suggestionId}`);
  }, []);

  const dismissAllSuggestions = useCallback((): void => {
    setSuggestions([]);
  }, []);

  const requestMissionExtension = useCallback(async (): Promise<boolean> => {
    console.log('📝 Requesting mission extension...');
    return true;
  }, []);

  const getSafetyRating = useCallback((): 'safe' | 'caution' | 'danger' => {
    if (threatLevel === 'high') return 'danger';
    if (threatLevel === 'medium') return 'caution';
    return 'safe';
  }, [threatLevel]);

  return {
    suggestions,
    optimalRoute,
    currentLocation,
    missionExtensionOpportunity,
    threatLevel,
    acceptSuggestion,
    dismissSuggestion,
    dismissAllSuggestions,
    requestMissionExtension,
    getSafetyRating,
  };
};
