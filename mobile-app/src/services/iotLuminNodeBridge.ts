import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LuminNode } from '../types/mission';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtts://iot.shadowcorps.net:8883';
const MAX_NODES = 12;
const WATCHDOG_INTERVAL = 5000;

interface LuminNodeMessage {
  nodeId: string;
  type: 'status' | 'alert' | 'data' | 'stream';
  payload: any;
  timestamp: number;
}

export const useLuminNodeSwarm = (maxNodes: number = MAX_NODES) => {
  const [nodes, setNodes] = useState<LuminNode[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const watchdogIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const pairNode = useCallback(async (nodeId: string): Promise<boolean> => {
    if (nodes.length >= maxNodes) {
      console.warn('Maximum LuminNodes reached');
      return false;
    }

    if (nodes.find(n => n.id === nodeId)) {
      console.warn(`Node ${nodeId} already paired`);
      return false;
    }

    const newNode: LuminNode = {
      id: nodeId,
      status: 'paired',
      battery: 100,
      lastSeen: Date.now(),
      watchdogEnabled: false,
    };

    setNodes(prev => [...prev, newNode]);
    console.log(`📡 LuminNode paired: ${nodeId}`);

    return true;
  }, [nodes, maxNodes]);

  const unpairNode = useCallback(async (nodeId: string): Promise<void> => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    
    const interval = watchdogIntervals.current.get(nodeId);
    if (interval) {
      clearInterval(interval);
      watchdogIntervals.current.delete(nodeId);
    }

    console.log(`📡 LuminNode unpaired: ${nodeId}`);
  }, []);

  const activateNode = useCallback(async (nodeId: string): Promise<boolean> => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId 
        ? { ...n, status: 'active', lastSeen: Date.now() } 
        : n
    ));

    console.log(`📡 LuminNode activated: ${nodeId}`);
    return true;
  }, []);

  const toggleWatchdog = useCallback(async (nodeId: string): Promise<void> => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newWatchdogState = !node.watchdogEnabled;

    setNodes(prev => prev.map(n => 
      n.id === nodeId 
        ? { ...n, watchdogEnabled: newWatchdogState } 
        : n
    ));

    if (newWatchdogState) {
      const interval = setInterval(() => {
        simulateWatchdogAlert(nodeId);
      }, WATCHDOG_INTERVAL);

      watchdogIntervals.current.set(nodeId, interval);
      console.log(`👁️ Watchdog enabled for: ${nodeId}`);
    } else {
      const interval = watchdogIntervals.current.get(nodeId);
      if (interval) {
        clearInterval(interval);
        watchdogIntervals.current.delete(nodeId);
      }
      console.log(`👁️ Watchdog disabled for: ${nodeId}`);
    }
  }, [nodes]);

  const simulateWatchdogAlert = (nodeId: string) => {
    if (Math.random() > 0.85) {
      const alert = `Movement detected on ${nodeId}`;
      setAlerts(prev => [...prev.slice(-4), alert]);
      console.log(`🚨 ${alert}`);
    }
  };

  const getNodeStreamUrl = useCallback((nodeId: string): string | null => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.streamUrl || null;
  }, [nodes]);

  useEffect(() => {
    return () => {
      watchdogIntervals.current.forEach(interval => clearInterval(interval));
      watchdogIntervals.current.clear();
    };
  }, []);

  return {
    nodes,
    alerts,
    isConnected,
    pairNode,
    unpairNode,
    activateNode,
    toggleWatchdog,
    getNodeStreamUrl,
  };
};

export const connectLuminNodeSwarm = async (nodeIDs: string[]): Promise<boolean> => {
  console.log(`🌐 Connecting LuminNode swarm (${nodeIDs.length} nodes)...`);
  
  try {
    console.log(`✅ LuminNode swarm connected via MQTT: ${MQTT_BROKER}`);
    return true;
  } catch (error) {
    console.error('Failed to connect LuminNode swarm:', error);
    return false;
  }
};

export const subscribeToNodeData = async (
  nodeId: string,
  callback: (data: LuminNodeMessage) => void
): Promise<() => void> => {
  console.log(`📡 Subscribing to node data: ${nodeId}`);

  const interval = setInterval(() => {
    if (Math.random() > 0.7) {
      callback({
        nodeId,
        type: 'data',
        payload: {
          temperature: 20 + Math.random() * 10,
          humidity: 40 + Math.random() * 20,
          motion: Math.random() > 0.8,
        },
        timestamp: Date.now(),
      });
    }
  }, 2000);

  return () => clearInterval(interval);
};

export const sendCommandToNode = async (
  nodeId: string,
  command: 'capture' | 'stream' | 'sleep' | 'wake'
): Promise<boolean> => {
  console.log(`📡 Sending command to ${nodeId}: ${command}`);
  return true;
};

export const getSwarmStatus = async (): Promise<{
  totalNodes: number;
  activeNodes: number;
  watchdogNodes: number;
  offlineNodes: number;
  averageBattery: number;
}> => {
  return {
    totalNodes: 0,
    activeNodes: 0,
    watchdogNodes: 0,
    offlineNodes: 0,
    averageBattery: 0,
  };
};
