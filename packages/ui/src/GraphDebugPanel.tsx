"use client";

import type { ReactNode } from "react";
import type { Graph, GraphWarning } from "@porygon/simulator";

export interface GraphDebugPanelProps {
  graph: Graph;
  warnings: readonly GraphWarning[];
}

/**
 * Shows the graph extracted from the current scene (node count, edge
 * directions) plus any inline validation warnings. Toggled on/off by the
 * caller; renders nothing on its own when hidden.
 */
export function GraphDebugPanel({ graph, warnings }: GraphDebugPanelProps): ReactNode {
  return (
    <div className="debug-panel" data-testid="debug-panel">
      <div className="debug-panel-title">Graph debug</div>

      <div className="debug-panel-section">
        <div className="debug-panel-label">Nodes</div>
        <div className="debug-panel-value" data-testid="debug-node-count">
          {graph.nodes.length}
        </div>
      </div>

      <div className="debug-panel-section">
        <div className="debug-panel-label">Edges</div>
        <ul className="debug-edge-list" data-testid="debug-edge-list">
          {graph.edges.map((edge) => {
            const fromNode = graph.nodes.find((node) => node.id === edge.fromNodeId);
            const toNode = graph.nodes.find((node) => node.id === edge.toNodeId);
            return (
              <li key={edge.id} data-testid={`debug-edge-${edge.id}`}>
                {fromNode?.label ?? edge.fromNodeId} → {toNode?.label ?? edge.toNodeId}
              </li>
            );
          })}
        </ul>
      </div>

      {warnings.length > 0 && (
        <div className="debug-panel-section debug-panel-warnings" data-testid="debug-warnings">
          <div className="debug-panel-label">Warnings</div>
          <ul className="debug-warning-list">
            {warnings.map((warning) => (
              <li key={`${warning.type}-${warning.message}`} data-testid={`debug-warning-${warning.type}`}>
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
