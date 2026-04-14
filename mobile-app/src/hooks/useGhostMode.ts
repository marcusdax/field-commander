/**
 * useGhostMode — React hook for Ghost Mode (Tor + PQC + GPS spoof)
 */

import { useState, useCallback } from 'react';
import type { GhostModeConfig, GhostSession } from '../types/ghostMode';
import { ghostMode } from '../services/GhostModeController';

export interface UseGhostModeReturn {
  isActive: boolean;
  session: GhostSession | null;
  activate: (config?: Partial<GhostModeConfig>) => Promise<void>;
  deactivate: () => Promise<void>;
}

export function useGhostMode(): UseGhostModeReturn {
  const [isActive, setIsActive] = useState(ghostMode.isActive);
  const [session, setSession] = useState<GhostSession | null>(ghostMode.currentSession);

  const activate = useCallback(async (config?: Partial<GhostModeConfig>) => {
    const s = await ghostMode.activate(config);
    setSession(s);
    setIsActive(true);
  }, []);

  const deactivate = useCallback(async () => {
    await ghostMode.deactivate();
    setSession(null);
    setIsActive(false);
  }, []);

  return { isActive, session, activate, deactivate };
}
