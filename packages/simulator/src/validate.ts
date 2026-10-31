// packages/simulator — inline graph validation (warnings, not hard errors).
import type { Graph } from "./graph";

export type GraphWarning =
  | { type: "disconnected-node"; nodeId: string; message: string }
  | { type: "cycle"; nodeIds: readonly string[]; message: string }
  | { type: "ambiguous-sources"; nodeIds: readonly string[]; message: string };

export function validateGraph(graph: Graph): readonly GraphWarning[] {
  const warnings: GraphWarning[] = [];

  const touchedNodeIds = new Set<string>();
  for (const edge of graph.edges) {
    touchedNodeIds.add(edge.fromNodeId);
    touchedNodeIds.add(edge.toNodeId);
  }
  for (const node of graph.nodes) {
    if (!touchedNodeIds.has(node.id)) {
      warnings.push({
        type: "disconnected-node",
        nodeId: node.id,
        message: `"${node.label}" has no connections.`,
      });
    }
  }

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const node of graph.nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoing.get(edge.fromNodeId)?.push(edge.toNodeId);
    incoming.get(edge.toNodeId)?.push(edge.fromNodeId);
  }

  const rootNodeIds: string[] = graph.nodes
    .filter(
      (node): boolean =>
        (incoming.get(node.id)?.length ?? 0) === 0 &&
        (outgoing.get(node.id)?.length ?? 0) > 0,
    )
    .map((node): string => node.id);
  // Multiple "client" nodes are a deliberate, well-defined traffic setup —
  // the simulator treats every one of them as an independent source, so
  // there's nothing ambiguous about it. Only warn when the graph has
  // several entry points and none of them is a recognized client, since
  // that's the case the simulator's own source-picking falls back to an
  // arbitrary single root for.
  const hasClientNode = graph.nodes.some((node): boolean => node.componentId === "client");
  if (!hasClientNode && rootNodeIds.length > 1) {
    warnings.push({
      type: "ambiguous-sources",
      nodeIds: rootNodeIds,
      message: `Found ${rootNodeIds.length} possible traffic entry points; expected one.`,
    });
  }

  const cycleNodeIds = findCycle(graph, outgoing);
  if (cycleNodeIds) {
    warnings.push({
      type: "cycle",
      nodeIds: cycleNodeIds,
      message: `Cycle detected: ${cycleNodeIds.join(" → ")}.`,
    });
  }

  return warnings;
}

function findCycle(
  graph: Graph,
  outgoing: Map<string, string[]>,
): readonly string[] | undefined {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];

  function visit(nodeId: string): readonly string[] | undefined {
    visited.add(nodeId);
    inStack.add(nodeId);
    stack.push(nodeId);

    for (const nextId of outgoing.get(nodeId) ?? []) {
      if (inStack.has(nextId)) {
        const cycleStart = stack.indexOf(nextId);
        return stack.slice(cycleStart).concat(nextId);
      }
      if (!visited.has(nextId)) {
        const found = visit(nextId);
        if (found) {
          return found;
        }
      }
    }

    inStack.delete(nodeId);
    stack.pop();
    return undefined;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      const found = visit(node.id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}
