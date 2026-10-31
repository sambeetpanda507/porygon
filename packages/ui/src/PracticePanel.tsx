"use client";

import type { ChangeEvent, ReactNode } from "react";
import type { ScenarioPrompt } from "@p0rygon/simulator";

export interface PracticePanelProps {
  prompts: readonly ScenarioPrompt[];
  selectedPromptId: string | undefined;
  onSelectPrompt: (promptId: string | undefined) => void;
  elapsedSeconds: number;
  checkedItems: ReadonlySet<string>;
  onToggleChecklistItem: (item: string) => void;
  explainMode: boolean;
  onToggleExplainMode: () => void;
}

const NO_PROMPT_VALUE = "";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PracticePanel({
  prompts,
  selectedPromptId,
  onSelectPrompt,
  elapsedSeconds,
  checkedItems,
  onToggleChecklistItem,
  explainMode,
  onToggleExplainMode,
}: PracticePanelProps): ReactNode {
  const selectedPrompt: ScenarioPrompt | undefined = prompts.find(
    (prompt) => prompt.id === selectedPromptId,
  );

  function handlePromptChange(event: ChangeEvent<HTMLSelectElement>): void {
    const value = event.target.value;
    onSelectPrompt(value === NO_PROMPT_VALUE ? undefined : value);
  }

  return (
    <div className="practice-panel" data-testid="practice-panel">
      <div className="practice-panel-title">Practice mode</div>

      <label className="practice-prompt-field">
        <span>Prompt</span>
        <select data-testid="prompt-select" value={selectedPromptId ?? NO_PROMPT_VALUE} onChange={handlePromptChange}>
          <option value={NO_PROMPT_VALUE}>None — free design</option>
          {prompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.title}
            </option>
          ))}
        </select>
      </label>

      {selectedPrompt ? (
        <>
          <div className="practice-prompt-description">{selectedPrompt.description}</div>

          <div className="practice-timer" data-testid="practice-timer">
            {formatElapsed(elapsedSeconds)}
          </div>

          <ul className="practice-checklist" data-testid="practice-checklist">
            {selectedPrompt.checklist.map((item) => {
              const checked = checkedItems.has(item);
              return (
                <li key={item}>
                  <label className="practice-checklist-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleChecklistItem(item)}
                    />
                    <span className={checked ? "practice-checklist-item-done" : undefined}>
                      {item}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className={`explain-mode-toggle${explainMode ? " explain-mode-toggle-active" : ""}`}
            data-testid="explain-mode-toggle"
            aria-pressed={explainMode}
            onClick={onToggleExplainMode}
          >
            {explainMode ? "Explain mode: on" : "Explain mode: off"}
          </button>
        </>
      ) : (
        <div className="practice-panel-empty">
          Pick a prompt to get a timer, a self-review checklist, and that scenario's traffic profile.
        </div>
      )}
    </div>
  );
}
