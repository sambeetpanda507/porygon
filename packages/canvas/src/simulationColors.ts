// packages/canvas — the fixed semantic colors a node is painted while a
// simulation is running, per plan.md 5.2 (green/healthy, yellow/strained,
// red/overloaded). Kept separate from a component's own catalog color,
// which is restored once the simulation resets.
import type { NodeStatus } from "@porygon/simulator";

export const NODE_STATUS_COLORS: Record<NodeStatus, string> = {
  healthy: "#2f9e44",
  strained: "#f08c00",
  overloaded: "#e03131",
};
