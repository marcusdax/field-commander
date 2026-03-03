export interface Mission {
  id: string;
  type: 'verification' | 'inspection' | 'rescue' | 'surveillance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'active' | 'completed' | 'aborted';
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy: number;
  };
  anomalyMarkers: AnomalyMarker[];
  createdAt: number;
  updatedAt: number;
  assignedAnalyst?: string;
  pteConfidence?: number;
  geofence?: GeofenceZone;
}

export interface AnomalyMarker {
  id: string;
  type: 'threat' | 'verification' | 'info' | 'evidence';
  position: {
    x: number;
    y: number;
    z: number;
  };
  confidence: number;
  description?: string;
  confirmedBy?: string;
  timestamp: number;
}

export interface GeofenceZone {
  id: string;
  center: { lat: number; lng: number };
  radius: number;
  type: 'inclusion' | 'exclusion';
  color: string;
}

export interface Analyst {
  id: string;
  pseudonym: string;
  clearanceLevel: 1 | 2 | 3 | 4;
  truthCredits: number;
  missionsCompleted: number;
  rating: number;
  zkpVerified: boolean;
}

export interface MagicMoment {
  id: string;
  missionId: string;
  duration: number;
  timestamp: number;
  videoBuffer: string[];
  spatialAnchors: AnomalyMarker[];
  dualAngle: boolean;
  sensors: {
    pressure: number;
    temperature: number;
    airQuality: number;
    accelerometer: { x: number; y: number; z: number };
    gyroscope: { x: number; y: number; z: number };
  };
  cognitiveDebrief?: CognitiveDebrief;
  dtaToken?: string;
}

export interface CognitiveDebrief {
  responses: {
    question: string;
    answer: string;
    timestamp: number;
  }[];
  sentiment: 'neutral' | 'concerned' | 'alert' | 'threatened';
}

export interface GhostModeStatus {
  active: boolean;
  torActive: boolean;
  socksPort: number | null;
  encryptionLevel: string;
  gpsSpoofed: boolean;
}

export interface LuminNode {
  id: string;
  status: 'paired' | 'active' | 'watchdog' | 'offline';
  battery: number;
  streamUrl?: string;
  lastSeen: number;
  watchdogEnabled: boolean;
}

export interface SWISDrawing {
  id: string;
  type: 'arrow' | 'circle' | 'text' | 'measure';
  transform: number[];
  label?: string;
  color: string;
  createdBy: string;
  timestamp: number;
}

export interface DTARegistration {
  dtaToken: string;
  immutableHash: string;
  tcAwarded: number;
  missionId: string;
  analystId: string;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
}

export interface PTESuggestion {
  id: string;
  type: 'route' | 'pin' | 'extension' | 'safety';
  content: string;
  confidence: number;
  timestamp: number;
}
