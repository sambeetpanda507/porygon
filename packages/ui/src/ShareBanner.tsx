"use client";

import type { ReactNode } from "react";

export interface ShareBannerProps {
  onDuplicate: () => void;
}

export function ShareBanner({ onDuplicate }: ShareBannerProps): ReactNode {
  return (
    <div className="share-banner" data-testid="share-banner">
      <span>Read-only shared view — this snapshot isn&apos;t live and can&apos;t be edited here.</span>
      <button type="button" data-testid="duplicate-to-edit" onClick={onDuplicate}>
        Duplicate to edit
      </button>
    </div>
  );
}
