"use client";

import type { ChangeEvent, ReactNode } from "react";

export interface VersionSummary {
  id: string;
  timestamp: number;
  elementCount: number;
}

export interface SharingPanelProps {
  onExport: () => void;
  onImportFile: (file: File) => void;
  onCopyShareLink: () => void;
  copyFeedback: boolean;
  versions: readonly VersionSummary[];
  onSaveVersion: () => void;
  onRestoreVersion: (versionId: string) => void;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function SharingPanel({
  onExport,
  onImportFile,
  onCopyShareLink,
  copyFeedback,
  versions,
  onSaveVersion,
  onRestoreVersion,
}: SharingPanelProps): ReactNode {
  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) {
      onImportFile(file);
    }
    event.target.value = "";
  }

  return (
    <div className="sharing-panel" data-testid="sharing-panel">
      <div className="sharing-panel-title">Sharing</div>

      <div className="sharing-panel-row">
        <button type="button" data-testid="export-p0rygon" onClick={onExport}>
          Export .p0rygon
        </button>
        <label className="sharing-import-label">
          Import .p0rygon
          <input
            type="file"
            accept=".p0rygon,.json,application/json"
            data-testid="import-p0rygon-input"
            onChange={handleFileInputChange}
          />
        </label>
      </div>

      <button type="button" data-testid="copy-share-link" onClick={onCopyShareLink}>
        {copyFeedback ? "Link copied!" : "Copy share link"}
      </button>

      <div className="sharing-versions">
        <div className="sharing-versions-header">
          <span>Versions</span>
          <button type="button" data-testid="save-version" onClick={onSaveVersion}>
            Save version
          </button>
        </div>
        {versions.length === 0 ? (
          <div className="sharing-versions-empty">No saved versions yet.</div>
        ) : (
          <ul className="sharing-versions-list" data-testid="versions-list">
            {versions.map((version) => (
              <li key={version.id} data-testid={`version-${version.id}`}>
                <span>
                  {formatTimestamp(version.timestamp)} · {version.elementCount} element
                  {version.elementCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  data-testid={`restore-version-${version.id}`}
                  onClick={() => onRestoreVersion(version.id)}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
