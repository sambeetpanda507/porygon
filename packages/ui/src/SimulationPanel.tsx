"use client";

import type { ReactNode } from "react";
import type { Graph, SimulationTick } from "@porygon/simulator";

export type SimulationStatus = "idle" | "running" | "paused";

export interface SimulationPanelProps {
  graph: Graph;
  tick: SimulationTick | null;
  status: SimulationStatus;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function SimulationPanel({
  graph,
  tick,
  status,
  onPlay,
  onPause,
  onReset,
}: SimulationPanelProps): ReactNode {
  return (
    <div className="simulation-panel" data-testid="simulation-panel">
      <div className="simulation-panel-header">
        <div className="simulation-panel-title" data-testid="simulation-status">
          Simulation: {status}
        </div>
        <div className="simulation-controls">
          <button
            type="button"
            data-testid="sim-play"
            onClick={onPlay}
            disabled={status === "running" || graph.nodes.length === 0}
          >
            Simulate
          </button>
          <button type="button" data-testid="sim-pause" onClick={onPause} disabled={status !== "running"}>
            Pause
          </button>
          <button type="button" data-testid="sim-reset" onClick={onReset} disabled={status === "idle"}>
            Reset
          </button>
        </div>
      </div>

      {tick === null ? (
        <div className="simulation-panel-empty">Click Simulate to run traffic over this diagram.</div>
      ) : (
        <ul className="simulation-node-list" data-testid="simulation-node-list">
          {tick.nodes.map((nodeResult) => {
            const node = graph.nodes.find((candidate) => candidate.id === nodeResult.nodeId);
            return (
              <li key={nodeResult.nodeId} data-testid={`sim-node-${nodeResult.nodeId}`}>
                <span className="simulation-node-label">{node?.label ?? nodeResult.nodeId}</span>
                <span
                  className={`simulation-node-status simulation-node-status-${nodeResult.status}`}
                  data-testid={`sim-node-${nodeResult.nodeId}-status`}
                >
                  {nodeResult.status}
                </span>
                <span data-testid={`sim-node-${nodeResult.nodeId}-rps`}>
                  {Math.round(nodeResult.rps).toLocaleString()} rps
                </span>
                <span data-testid={`sim-node-${nodeResult.nodeId}-latency`}>
                  {Math.round(nodeResult.latencyMs)} ms
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
