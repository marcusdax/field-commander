/**
 * useLuminNode — React hook for LuminNode swarm management
 */

import { useState, useCallback } from 'react';
import type { LuminNodeDevice, SwarmConfig, WatchdogAlert, SwarmMetrics } from '../types/luminNode';
import { luminNodeSwarm } from '../services/LuminNodeSwarm';

export interface UseLuminNodeReturn {
  swarm: SwarmConfig | null;
  metrics: SwarmMetrics;
  discoverNodes: () => Promise<LuminNodeDevice[]>;
  formSwarm: (nodeIds: string[]) => Promise<SwarmConfig>;
  enableWatchdog: (plate: string, onAlert: (a: WatchdogAlert) => void) => Promise<void>;
  dissolveSwarm: () => Promise<void>;
}

export function useLuminNode(): UseLuminNodeReturn {
  const [swarm, setSwarm] = useState<SwarmConfig | null>(luminNodeSwarm.swarm);
  const [metrics, setMetrics] = useState<SwarmMetrics>(luminNodeSwarm.getMetrics());

  const discoverNodes = useCallback(async () => {
    return luminNodeSwarm.discoverNodes();
  }, []);

  const formSwarm = useCallback(async (nodeIds: string[]) => {
    const cfg = await luminNodeSwarm.formSwarm(nodeIds);
    setSwarm(cfg);
    setMetrics(luminNodeSwarm.getMetrics());
    return cfg;
  }, []);

  const enableWatchdog = useCallback(async (
    plate: string,
    onAlert: (a: WatchdogAlert) => void
  ) => {
    await luminNodeSwarm.enableWatchdog(plate, (alert) => {
      setMetrics(luminNodeSwarm.getMetrics());
      onAlert(alert);
    });
  }, []);

  const dissolveSwarm = useCallback(async () => {
    await luminNodeSwarm.dissolveSwarm();
    setSwarm(null);
    setMetrics(luminNodeSwarm.getMetrics());
  }, []);

  return { swarm, metrics, discoverNodes, formSwarm, enableWatchdog, dissolveSwarm };
}
