"use client";

import type { ChangeEvent, ReactNode } from "react";
import {
  getComponentById,
  getComponentExplanation,
  getComponentStats,
  type ComponentDef,
  type ComponentStats,
} from "@p0rygon/icons";
import { FAILURE_LABELS, type FailureInjection, type FailureType } from "@p0rygon/simulator";

export interface InspectorProps {
  selectedComponentId: string | undefined;
  selectedElementId: string | undefined;
  selectedEdgeId: string | undefined;
  statsOverride: ComponentStats | undefined;
  onStatsChange: (stats: ComponentStats) => void;
  activeFailures: readonly FailureInjection[];
  onToggleFailure: (failure: FailureInjection) => void;
  explainMode: boolean;
}

const NODE_FAILURE_TYPES: readonly FailureType[] = [
  "kill-node",
  "degrade-node",
  "cold-cache",
  "fill-queue",
  "throttle-dependency",
];

function FailureButton({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}): ReactNode {
  return (
    <button
      type="button"
      className={`failure-button${active ? " failure-button-active" : ""}`}
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
    >
      {active ? `${label} (active)` : label}
    </button>
  );
}

export function Inspector({
  selectedComponentId,
  selectedElementId,
  selectedEdgeId,
  statsOverride,
  onStatsChange,
  activeFailures,
  onToggleFailure,
  explainMode,
}: InspectorProps): ReactNode {
  function isFailureActive(type: FailureType, targetId: string): boolean {
    return activeFailures.some(
      (failure) => failure.type === type && failure.targetId === targetId,
    );
  }

  if (selectedEdgeId) {
    const cutActive = isFailureActive("cut-edge", selectedEdgeId);
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-empty">Connection selected.</div>
        <div className="inspector-failures">
          <div className="inspector-failures-title">Failure injection</div>
          <FailureButton
            label={FAILURE_LABELS["cut-edge"]}
            active={cutActive}
            testId="failure-cut-edge"
            onClick={() => onToggleFailure({ type: "cut-edge", targetId: selectedEdgeId })}
          />
        </div>
      </div>
    );
  }

  if (!selectedComponentId) {
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-empty">Select a component on the canvas to inspect it.</div>
      </div>
    );
  }

  const component: ComponentDef | undefined = getComponentById(selectedComponentId);
  if (!component || !selectedElementId) {
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-empty">Unknown component.</div>
      </div>
    );
  }

  if (explainMode) {
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-header">
          <div className="icon-glyph" style={{ background: component.color }}>
            {component.glyph}
          </div>
          <div>
            <div className="inspector-title" data-testid="inspector-label">
              {component.label}
            </div>
            <div className="inspector-category">{component.categoryId}</div>
          </div>
        </div>
        <div className="inspector-explanation" data-testid="inspector-explanation">
          {getComponentExplanation(component)}
        </div>
      </div>
    );
  }

  const stats: ComponentStats = statsOverride ?? getComponentStats(component);

  function handleMaxRpsChange(event: ChangeEvent<HTMLInputElement>): void {
    const maxRps = Number(event.target.value);
    if (Number.isNaN(maxRps)) {
      return;
    }
    onStatsChange({ ...stats, maxRps });
  }

  function handleAvgLatencyChange(event: ChangeEvent<HTMLInputElement>): void {
    const avgLatencyMs = Number(event.target.value);
    if (Number.isNaN(avgLatencyMs)) {
      return;
    }
    onStatsChange({ ...stats, avgLatencyMs });
  }

  return (
    <div className="inspector" data-testid="inspector">
      <div className="inspector-header">
        <div className="icon-glyph" style={{ background: component.color }}>
          {component.glyph}
        </div>
        <div>
          <div className="inspector-title" data-testid="inspector-label">
            {component.label}
          </div>
          <div className="inspector-category">{component.categoryId}</div>
        </div>
      </div>
      <div className="inspector-stats">
        <div className="inspector-stat">
          <span className="inspector-stat-label">Max RPS</span>
          <span className="inspector-stat-value" data-testid="inspector-max-rps">
            {stats.maxRps.toLocaleString()}
          </span>
        </div>
        <div className="inspector-stat">
          <span className="inspector-stat-label">Avg latency</span>
          <span className="inspector-stat-value">{stats.avgLatencyMs} ms</span>
        </div>
        <div className="inspector-stat">
          <span className="inspector-stat-label">Failure modes</span>
          <span className="inspector-stat-value">{stats.failureModes.join(", ")}</span>
        </div>
      </div>
      <div className="inspector-edit">
        <label className="inspector-edit-field">
          <span>Max RPS</span>
          <input
            type="number"
            data-testid="inspector-edit-max-rps"
            value={stats.maxRps}
            onChange={handleMaxRpsChange}
          />
        </label>
        <label className="inspector-edit-field">
          <span>Avg latency (ms)</span>
          <input
            type="number"
            data-testid="inspector-edit-avg-latency"
            value={stats.avgLatencyMs}
            onChange={handleAvgLatencyChange}
          />
        </label>
      </div>
      <div className="inspector-failures">
        <div className="inspector-failures-title">Failure injection</div>
        {NODE_FAILURE_TYPES.map((failureType) => (
          <FailureButton
            key={failureType}
            label={FAILURE_LABELS[failureType]}
            active={isFailureActive(failureType, selectedElementId)}
            testId={`failure-${failureType}`}
            onClick={() => onToggleFailure({ type: failureType, targetId: selectedElementId })}
          />
        ))}
      </div>
    </div>
  );
}
