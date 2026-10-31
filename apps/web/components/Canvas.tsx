"use client";

import "@excalidraw/excalidraw/index.css";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { idbGet, idbSet } from "@/lib/db";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false },
);

const SCENE_KEY = "porygon-scene";
const SAVE_DEBOUNCE_MS = 300;

interface StoredScene {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

export function Canvas(): ReactNode {
  const [initialData, setInitialData] = useState<StoredScene | null | undefined>(undefined);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    let cancelled = false;
    idbGet<StoredScene>(SCENE_KEY).then((stored: StoredScene | undefined) => {
      if (!cancelled) {
        setInitialData(stored ?? null);
      }
    });
    return (): void => {
      cancelled = true;
    };
  }, []);

  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ): void => {
      if (saveTimeout.current !== null) {
        clearTimeout(saveTimeout.current);
      }
      saveTimeout.current = setTimeout(() => {
        const scene: StoredScene = { elements, appState, files };
        void idbSet(SCENE_KEY, scene);
      }, SAVE_DEBOUNCE_MS);
    },
    [],
  );

  if (initialData === undefined) {
    return <div className="canvas-loading">Loading your last diagram…</div>;
  }

  return (
    <div className="canvas-root">
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI): void => {
          excalidrawApiRef.current = api;
        }}
        initialData={initialData ?? undefined}
        onChange={handleChange}
      />
    </div>
  );
}
