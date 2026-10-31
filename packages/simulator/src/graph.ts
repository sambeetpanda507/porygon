// packages/simulator — the graph input format the simulation engine (Phase
// 4/5) will run on. Populated here in Phase 3 by the canvas's graph
// extraction layer; the simulator itself still lands in a later phase.
import type { ComponentStats } from "@porygon/icons";

export interface GraphNode {
  id: string;
  componentId: string;
  label: string;
  stats: ComponentStats;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface Graph {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}
