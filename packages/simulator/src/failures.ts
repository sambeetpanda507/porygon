// packages/simulator — failure injection: perturbations applied on top of
// an otherwise-normal tick, per plan.md 5.2 ("kill a node, degrade a node,
// partition the network, exhaust a cache, fill a queue, throttle a
// dependency").
import type { ComponentStats } from "@porygon/icons";

export type FailureType =
  | "kill-node"
  | "degrade-node"
  | "cut-edge"
  | "cold-cache"
  | "fill-queue"
  | "throttle-dependency";

export interface FailureInjection {
  type: FailureType;
  /** A node id for every type except "cut-edge", which takes an edge id. */
  targetId: string;
}

export const FAILURE_LABELS: Record<FailureType, string> = {
  "kill-node": "Kill node",
  "degrade-node": "Degrade node",
  "cut-edge": "Cut edge",
  "cold-cache": "Cold cache",
  "fill-queue": "Fill queue",
  "throttle-dependency": "Throttle dependency",
};

/**
 * A node-level failure doesn't remove the node from the graph — it just
 * makes it worse at its job for the duration it's active, so the same
 * propagation/load math in computeTick still applies, with the node simply
 * running at reduced effective capacity and/or added latency.
 */
export function applyFailureToStats(stats: ComponentStats, failureType: FailureType): ComponentStats {
  switch (failureType) {
    case "degrade-node":
      // A degraded instance (slow disk, high latency) still takes requests,
      // just slower and with less headroom.
      return { ...stats, maxRps: stats.maxRps * 0.5, avgLatencyMs: stats.avgLatencyMs * 5 };
    case "cold-cache":
      // A cold cache barely absorbs anything — almost everything falls
      // through to whatever's behind it, and what it does serve is slow.
      return { ...stats, maxRps: stats.maxRps * 0.1, avgLatencyMs: stats.avgLatencyMs * 10 };
    case "fill-queue":
      // A queue near its backlog limit accepts far less new work and each
      // item waits much longer before being handled.
      return { ...stats, maxRps: stats.maxRps * 0.2, avgLatencyMs: stats.avgLatencyMs * 8 };
    case "throttle-dependency":
      return { ...stats, maxRps: stats.maxRps * 0.5 };
    default:
      return stats;
  }
}
