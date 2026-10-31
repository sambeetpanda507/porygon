// packages/simulator — a short, human-readable rollup of one simulation
// tick, for a glance-able overview rather than reading every node's row.
import type { SimulationTick } from "./simulate";

export interface SimulationSummary {
  totalNodes: number;
  healthyCount: number;
  strainedCount: number;
  overloadedCount: number;
  deadCount: number;
  peakLatencyMs: number;
  totalRps: number;
}

export function summarizeTick(tick: SimulationTick): SimulationSummary {
  let healthyCount = 0;
  let strainedCount = 0;
  let overloadedCount = 0;
  let deadCount = 0;
  let peakLatencyMs = 0;
  let totalRps = 0;

  for (const node of tick.nodes) {
    totalRps += node.rps;
    peakLatencyMs = Math.max(peakLatencyMs, node.latencyMs);
    if (node.status === "healthy") {
      healthyCount += 1;
    } else if (node.status === "strained") {
      strainedCount += 1;
    } else if (node.status === "overloaded") {
      overloadedCount += 1;
    } else {
      deadCount += 1;
    }
  }

  return {
    totalNodes: tick.nodes.length,
    healthyCount,
    strainedCount,
    overloadedCount,
    deadCount,
    peakLatencyMs,
    totalRps,
  };
}
