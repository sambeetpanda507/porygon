// packages/canvas — reads an Excalidraw scene and extracts the typed graph
// (nodes + directed edges from bound arrows) that packages/simulator runs
// on. A node is any element tagged with a porygon componentId; an edge is
// any arrow whose start and end are both bound to a tagged node.
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { getComponentById, getComponentStats, type ComponentStats } from "@porygon/icons";
import type { Graph, GraphEdge, GraphNode } from "@porygon/simulator";
import { getPorygonComponentId, getPorygonStatsOverride } from "./componentElement";

export function extractGraph(elements: readonly ExcalidrawElement[]): Graph {
  const nodes: GraphNode[] = [];
  const nodeIds = new Set<string>();

  for (const element of elements) {
    if (element.isDeleted) {
      continue;
    }
    const componentId = getPorygonComponentId(element);
    if (!componentId) {
      continue;
    }
    const component = getComponentById(componentId);
    if (!component) {
      continue;
    }
    const stats: ComponentStats = getPorygonStatsOverride(element) ?? getComponentStats(component);
    nodes.push({ id: element.id, componentId, label: component.label, stats });
    nodeIds.add(element.id);
  }

  const edges: GraphEdge[] = [];
  for (const element of elements) {
    if (element.isDeleted || element.type !== "arrow") {
      continue;
    }
    const fromNodeId = element.startBinding?.elementId;
    const toNodeId = element.endBinding?.elementId;
    if (!fromNodeId || !toNodeId || !nodeIds.has(fromNodeId) || !nodeIds.has(toNodeId)) {
      continue;
    }
    edges.push({ id: element.id, fromNodeId, toNodeId });
  }

  return { nodes, edges };
}
