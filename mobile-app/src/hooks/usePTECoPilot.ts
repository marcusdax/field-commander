import { useState, useEffect, useCallback, useRef } from 'react';
import Geolocation, { GeoPosition, GeoError } from '@react-native-community/geolocation';
import { PTESuggestion } from '../types/mission';
import { evaluatePteTacticalState } from '../services/masternexCryptoCore.ts';

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

    const tactical = evaluatePteTacticalState({
      missionId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      accuracy: currentLocation.accuracy,
      ghostMode,
    });

    setSuggestions(tactical.suggestions);
    setThreatLevel(tactical.threatLevel);
    setMissionExtensionOpportunity(tactical.suggestions.some(s => s.type === 'extension'));
    updateOptimalRoute();

    console.log(`💡 Generated ${tactical.suggestions.length} PTE suggestions in ${tactical.hexId}`);
  }, [currentLocation, missionId, ghostMode]);

  const updateOptimalRoute = useCallback(() => {
    if (!currentLocation) return;

    setOptimalRoute({
      heading: Math.random() * 360,
      distance: 50 + Math.random() * 200,
      waypoints: [
        {
          lat: currentLocation.latitude + 0.0035,
          lng: currentLocation.longitude + 0.0035,
        },
        {
          lat: currentLocation.latitude + 0.007,
          lng: currentLocation.longitude - 0.004,
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
