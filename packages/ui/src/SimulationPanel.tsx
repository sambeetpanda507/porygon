"use client";

import type { ChangeEvent, ReactNode } from "react";
import { SCENARIO_PRESETS, summarizeTick, type Graph, type SimulationTick } from "@porygon/simulator";

export type SimulationStatus = "idle" | "running" | "paused";

export interface SimulationPanelProps {
  graph: Graph;
  tick: SimulationTick | null;
  status: SimulationStatus;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  scenarioId: string;
  onScenarioChange: (scenarioId: string) => void;
}

/** One glance-able sentence: node health counts, peak latency, and which
 * nodes (if any) need attention — so you don't have to read every row to
 * tell whether this run is fine. */
function buildOverviewText(tick: SimulationTick, graph: Graph): string {
  const summary = summarizeTick(tick);
  const parts: string[] = [
    `${summary.totalNodes} node${summary.totalNodes === 1 ? "" : "s"}`,
    summary.deadCount > 0
      ? `${summary.healthyCount} healthy, ${summary.strainedCount} strained, ${summary.overloadedCount} overloaded, ${summary.deadCount} dead`
      : `${summary.healthyCount} healthy, ${summary.strainedCount} strained, ${summary.overloadedCount} overloaded`,
    `peak latency ${Math.round(summary.peakLatencyMs)} ms`,
  ];

  const attentionNodeLabels: string[] = tick.nodes
    .filter((node) => node.status !== "healthy")
    .map((node) => graph.nodes.find((candidate) => candidate.id === node.nodeId)?.label ?? node.nodeId);
  if (attentionNodeLabels.length > 0) {
    parts.push(`watch: ${attentionNodeLabels.join(", ")}`);
  }

  return parts.join(" · ");
}

export function SimulationPanel({
  graph,
  tick,
  status,
  onPlay,
  onPause,
  onReset,
  scenarioId,
  onScenarioChange,
}: SimulationPanelProps): ReactNode {
  function handleScenarioChange(event: ChangeEvent<HTMLSelectElement>): void {
    onScenarioChange(event.target.value);
  }

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

      <label className="simulation-scenario-field">
        <span>Scenario</span>
        <select
          data-testid="scenario-select"
          value={scenarioId}
          onChange={handleScenarioChange}
          disabled={status === "running"}
        >
          {SCENARIO_PRESETS.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.label}
            </option>
          ))}
        </select>
      </label>

      {tick === null ? (
        <div className="simulation-panel-empty">Click Simulate to run traffic over this diagram.</div>
      ) : (
        <>
          <div className="simulation-overview" data-testid="simulation-overview">
            {buildOverviewText(tick, graph)}
          </div>
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
        </>
      )}
    </div>
  );
}
