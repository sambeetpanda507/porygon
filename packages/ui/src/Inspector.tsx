"use client";

import type { ChangeEvent, ReactNode } from "react";
import {
  getComponentById,
  getComponentStats,
  type ComponentDef,
  type ComponentStats,
} from "@porygon/icons";

export interface InspectorProps {
  selectedComponentId: string | undefined;
  statsOverride: ComponentStats | undefined;
  onStatsChange: (stats: ComponentStats) => void;
}

export function Inspector({
  selectedComponentId,
  statsOverride,
  onStatsChange,
}: InspectorProps): ReactNode {
  if (!selectedComponentId) {
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-empty">Select a component on the canvas to inspect it.</div>
      </div>
    );
  }

  const component: ComponentDef | undefined = getComponentById(selectedComponentId);
  if (!component) {
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-empty">Unknown component.</div>
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
    </div>
  );
}
