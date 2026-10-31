"use client";

import type { ReactNode } from "react";
import { SYSTEM_DESIGN_PRESETS, type SystemDesignPreset } from "@p0rygon/canvas";

export interface TemplatesPanelProps {
  onLoadPreset: (preset: SystemDesignPreset) => void;
  hasExistingDiagram: boolean;
}

export function TemplatesPanel({ onLoadPreset, hasExistingDiagram }: TemplatesPanelProps): ReactNode {
  return (
    <div className="templates-panel" data-testid="templates-panel">
      <div className="templates-panel-title">Preloaded designs</div>
      <div className="templates-panel-hint">
        Loading one replaces the current canvas{hasExistingDiagram ? " — export first if you want to keep it" : ""}.
      </div>
      <ul className="templates-list" data-testid="templates-list">
        {SYSTEM_DESIGN_PRESETS.map((preset) => (
          <li key={preset.id} data-testid={`template-${preset.id}`}>
            <div className="templates-list-item-text">
              <div className="templates-list-item-label">{preset.label}</div>
              <div className="templates-list-item-description">{preset.description}</div>
            </div>
            <button
              type="button"
              data-testid={`template-load-${preset.id}`}
              onClick={() => onLoadPreset(preset)}
            >
              Load
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
