// packages/simulator — deterministic tick-based traffic simulation.
// Each tick is a pure function of the graph, the traffic spec, the tick
// number, and the active failure injections: no hidden mutable state, so a
// tick can be recomputed or replayed identically (e.g. from inside a Web
// Worker).
import type { ComponentStats } from "@p0rygon/icons";
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
 * propagates it along outgoing edges with real backpressure — a node only
 * ever forwards up to its own effective Max RPS, splitting evenly across
 * its out-edges (fan-out); whatever it's offered beyond that is dropped at
 * that node rather than silently passed through — and derives each node's
 * load, latency, and health status from what it was offered vs. its
 * capacity.
 *
 * Nodes are processed in topological order (every node waits until all of
 * its upstream edges have delivered their share) so a node with multiple
 * incoming edges sees its true combined offered load before deciding what
 * it can forward, rather than acting on a partial, still-arriving total.
 * A cycle has no topological order, so leftover cycle members are
 * processed in a final pass once the graph debug panel's own cycle
 * warning has already told the user that one exists — ticks downstream of
 * a cycle are an approximation, not a guarantee.
 *
 * `failures` lets a kill-node/degrade-node/cut-edge/etc. perturbation be
 * layered on top without touching the graph itself: a killed node still
 * receives whatever traffic reaches it (shown as "dead", 0 rps processed)
 * but forwards nothing; a cut edge is simply excluded from propagation;
 * the other failure types reduce a node's effective capacity and/or add
 * latency for this tick only — including the capacity it forwards with.
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

  const effectiveStatsByNodeId = new Map<string, ComponentStats>();
  for (const node of graph.nodes) {
    const failureType = statsFailureByNodeId.get(node.id);
    effectiveStatsByNodeId.set(
      node.id,
      failureType ? applyFailureToStats(node.stats, failureType) : node.stats,
    );
  }

  const rampProgress = Math.min(1, tick / Math.max(1, traffic.rampTicks));
  const rampedRps = traffic.targetRps * rampProgress;

  const offeredRps = new Map<string, number>();
  for (const node of graph.nodes) {
    offeredRps.set(node.id, 0);
  }
  for (const sourceNodeId of traffic.sourceNodeIds) {
    if (offeredRps.has(sourceNodeId)) {
      offeredRps.set(sourceNodeId, (offeredRps.get(sourceNodeId) ?? 0) + rampedRps);
    }
  }

  const outgoingEdges = new Map<string, GraphEdge[]>();
  const remainingInDegree = new Map<string, number>();
  for (const node of graph.nodes) {
    outgoingEdges.set(node.id, []);
    remainingInDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    if (cutEdgeIds.has(edge.id) || killedNodeIds.has(edge.fromNodeId)) {
      continue;
    }
    outgoingEdges.get(edge.fromNodeId)?.push(edge);
    remainingInDegree.set(edge.toNodeId, (remainingInDegree.get(edge.toNodeId) ?? 0) + 1);
  }

  function forward(nodeId: string): void {
    const edges = outgoingEdges.get(nodeId) ?? [];
    if (edges.length === 0 || killedNodeIds.has(nodeId)) {
      return;
    }
    const nodeOffered = offeredRps.get(nodeId) ?? 0;
    const capacity = effectiveStatsByNodeId.get(nodeId)?.maxRps ?? 0;
    const forwarded = capacity > 0 ? Math.min(nodeOffered, capacity) : nodeOffered;
    const share = forwarded / edges.length;
    for (const edge of edges) {
      offeredRps.set(edge.toNodeId, (offeredRps.get(edge.toNodeId) ?? 0) + share);
    }
  }

  const processed = new Set<string>();
  const queue: string[] = graph.nodes
    .filter((node) => (remainingInDegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  while (queue.length > 0) {
    const nodeId = queue.shift() as string;
    if (processed.has(nodeId)) {
      continue;
    }
    processed.add(nodeId);
    forward(nodeId);
    for (const edge of outgoingEdges.get(nodeId) ?? []) {
      const remaining = (remainingInDegree.get(edge.toNodeId) ?? 0) - 1;
      remainingInDegree.set(edge.toNodeId, remaining);
      if (remaining <= 0 && !processed.has(edge.toNodeId)) {
        queue.push(edge.toNodeId);
      }
    }
  }
  // Anything left is part of a cycle (no node in it ever reaches in-degree
  // 0) — forward from each exactly once anyway, in whatever order, so
  // downstream-of-the-cycle nodes still get a number instead of none.
  for (const node of graph.nodes) {
    if (!processed.has(node.id)) {
      processed.add(node.id);
      forward(node.id);
    }
  }

  const nodes: NodeTickResult[] = graph.nodes.map((node): NodeTickResult => {
    if (killedNodeIds.has(node.id)) {
      return { nodeId: node.id, rps: 0, latencyMs: 0, status: "dead" };
    }

    const stats = effectiveStatsByNodeId.get(node.id) ?? node.stats;
    const rps = offeredRps.get(node.id) ?? 0;
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
