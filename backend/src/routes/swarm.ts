/**
 * Swarm API Route — POST /v1/swarm/register
 * Registers a LuminNode swarm session and returns coverage metadata.
 */

import type { Request, Response } from 'express';

interface SwarmRegistration {
  node_ids: string[];
  target_plate?: string;
  agent_id: string;
}

// In-memory store for demo; replace with Redis/Postgres in production
const swarmRegistry = new Map<string, object>();

export async function registerSwarm(req: Request, res: Response): Promise<void> {
  const { node_ids, target_plate, agent_id } = req.body as SwarmRegistration;

  if (!Array.isArray(node_ids) || node_ids.length === 0) {
    res.status(400).json({ error: 'node_ids must be a non-empty array' });
    return;
  }

  if (node_ids.length > 12) {
    res.status(422).json({ error: 'Maximum 12 nodes per swarm' });
    return;
  }

  const swarmId = `swarm_${Date.now()}_${agent_id}`;
  const coverageArea = node_ids.length * 500;             // 500 m² per node
  const estimatedBatteryHours = 8;                        // 10,000 mAh at full charge

  swarmRegistry.set(swarmId, {
    swarmId,
    nodeIds: node_ids,
    targetPlate: target_plate,
    agentId: agent_id,
    createdAt: new Date().toISOString(),
  });

  res.json({
    swarm_id: swarmId,
    coverage_area: coverageArea,
    estimated_battery_hours: estimatedBatteryHours,
    node_count: node_ids.length,
  });
}

export function getSwarm(swarmId: string): object | undefined {
  return swarmRegistry.get(swarmId);
}
