// packages/simulator — deterministic tick-based traffic simulation.
// Each tick is a pure function of the graph, the traffic spec, and the
// tick number: no hidden mutable state, so a tick can be recomputed or
// replayed identically (e.g. from inside a Web Worker).
import type { Graph, GraphEdge } from "./graph";

export type NodeStatus = "healthy" | "strained" | "overloaded";

export interface TrafficSpec {
  sourceNodeId: string;
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
 * ticks at the source node, then propagates it along outgoing edges —
 * splitting evenly across a node's out-edges (fan-out) — and derives each
 * node's load, latency, and health status from its capacity.
 */
export function computeTick(graph: Graph, traffic: TrafficSpec, tick: number): SimulationTick {
  const rampProgress = Math.min(1, tick / Math.max(1, traffic.rampTicks));
  const rampedRps = traffic.targetRps * rampProgress;

  const incomingRps = new Map<string, number>();
  for (const node of graph.nodes) {
    incomingRps.set(node.id, 0);
  }
  if (incomingRps.has(traffic.sourceNodeId)) {
    incomingRps.set(traffic.sourceNodeId, rampedRps);
  }

  const outgoingEdges = new Map<string, GraphEdge[]>();
  for (const node of graph.nodes) {
    outgoingEdges.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoingEdges.get(edge.fromNodeId)?.push(edge);
  }

  const visited = new Set<string>();
  const queue: string[] = [traffic.sourceNodeId];
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
    const rps = incomingRps.get(node.id) ?? 0;
    const load = node.stats.maxRps > 0 ? rps / node.stats.maxRps : 0;
    const latencyMs = node.stats.avgLatencyMs * (1 + Math.max(0, load - 1) * 4 + load * 0.5);

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
