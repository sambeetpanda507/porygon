// packages/simulator — deterministic tick-based traffic simulation.
// Each tick is a pure function of the graph, the traffic spec, the tick
// number, and the active failure injections: no hidden mutable state, so a
// tick can be recomputed or replayed identically (e.g. from inside a Web
// Worker).
import type { ComponentStats } from "@porygon/icons";
import { applyFailureToStats, type FailureInjection } from "./failures";
import type { Graph, GraphEdge } from "./graph";

export type NodeStatus = "healthy" | "strained" | "overloaded" | "dead";

export interface TrafficSpec {
  sourceNodeIds: readonly string[];
  targetRps: number;
  rampTicks: number;
}

export interface NodeTickResult {
  nodeId: string;
  rps: number;
  latencyMs: number;
  status: NodeStatus;
}

export interface SimulationTick {
  tick: number;
  nodes: readonly NodeTickResult[];
}

const STRAINED_LOAD_FACTOR = 0.7;

/**
 * Computes one tick: ramps traffic from 0 up to targetRps over rampTicks
 * ticks at each source node (every source gets the full targetRps — they
 * are independent entry points, not shares of one combined rate), then
 * propagates it along outgoing edges — splitting evenly across a node's
 * out-edges (fan-out) — and derives each node's load, latency, and health
 * status from its capacity.
 *
 * `failures` lets a kill-node/degrade-node/cut-edge/etc. perturbation be
 * layered on top without touching the graph itself: a killed node still
 * receives whatever traffic reaches it (shown as "dead", 0 rps processed)
 * but passes nothing onward; a cut edge is simply excluded from
 * propagation; the other failure types reduce a node's effective capacity
 * and/or add latency for this tick only.
 */
export function computeTick(
  graph: Graph,
  traffic: TrafficSpec,
  tick: number,
  failures: readonly FailureInjection[] = [],
): SimulationTick {
  const killedNodeIds = new Set<string>(
    failures.filter((failure) => failure.type === "kill-node").map((failure) => failure.targetId),
  );
  const cutEdgeIds = new Set<string>(
    failures.filter((failure) => failure.type === "cut-edge").map((failure) => failure.targetId),
  );
  const statsFailureByNodeId = new Map<string, FailureInjection["type"]>();
  for (const failure of failures) {
    if (
      failure.type === "degrade-node" ||
      failure.type === "cold-cache" ||
      failure.type === "fill-queue" ||
      failure.type === "throttle-dependency"
    ) {
      statsFailureByNodeId.set(failure.targetId, failure.type);
    }
  }

  const rampProgress = Math.min(1, tick / Math.max(1, traffic.rampTicks));
  const rampedRps = traffic.targetRps * rampProgress;

  const incomingRps = new Map<string, number>();
  for (const node of graph.nodes) {
    incomingRps.set(node.id, 0);
  }
  for (const sourceNodeId of traffic.sourceNodeIds) {
    if (incomingRps.has(sourceNodeId)) {
      incomingRps.set(sourceNodeId, rampedRps);
    }
  }

  const outgoingEdges = new Map<string, GraphEdge[]>();
  for (const node of graph.nodes) {
    outgoingEdges.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (cutEdgeIds.has(edge.id) || killedNodeIds.has(edge.fromNodeId)) {
      continue;
    }
    outgoingEdges.get(edge.fromNodeId)?.push(edge);
  }

  const visited = new Set<string>();
  const queue: string[] = [...traffic.sourceNodeIds];
  while (queue.length > 0) {
    const nodeId = queue.shift() as string;
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const edges = outgoingEdges.get(nodeId) ?? [];
    if (edges.length === 0) {
      continue;
    }
    const nodeRps = incomingRps.get(nodeId) ?? 0;
    const share = nodeRps / edges.length;
    for (const edge of edges) {
      incomingRps.set(edge.toNodeId, (incomingRps.get(edge.toNodeId) ?? 0) + share);
      if (!visited.has(edge.toNodeId)) {
        queue.push(edge.toNodeId);
      }
    }
  }

  const nodes: NodeTickResult[] = graph.nodes.map((node): NodeTickResult => {
    if (killedNodeIds.has(node.id)) {
      return { nodeId: node.id, rps: 0, latencyMs: 0, status: "dead" };
    }

    const failureType = statsFailureByNodeId.get(node.id);
    const stats: ComponentStats = failureType
      ? applyFailureToStats(node.stats, failureType)
      : node.stats;

    const rps = incomingRps.get(node.id) ?? 0;
    const load = stats.maxRps > 0 ? rps / stats.maxRps : 0;
    const latencyMs = stats.avgLatencyMs * (1 + Math.max(0, load - 1) * 4 + load * 0.5);

    let status: NodeStatus = "healthy";
    if (load >= 1) {
      status = "overloaded";
    } else if (load >= STRAINED_LOAD_FACTOR) {
      status = "strained";
    }

    return { nodeId: node.id, rps, latencyMs, status };
  });

  return { tick, nodes };
}
