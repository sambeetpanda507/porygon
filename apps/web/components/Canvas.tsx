"use client";

import "@excalidraw/excalidraw/index.css";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
  createComponentSkeleton,
  getPorygonComponentId,
  PORYGON_DRAG_MIME_TYPE,
} from "@porygon/canvas";
import { getComponentById, type ComponentDef } from "@porygon/icons";
import { ComponentLibrary, Inspector } from "@porygon/ui";
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
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(undefined);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

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

      const selectedIds: string[] = Object.keys(appState.selectedElementIds).filter(
        (id: string): boolean => appState.selectedElementIds[id] === true,
      );
      if (selectedIds.length === 1) {
        const selectedElement = elements.find(
          (element: OrderedExcalidrawElement): boolean => element.id === selectedIds[0],
        );
        setSelectedComponentId(
          selectedElement ? getPorygonComponentId(selectedElement) : undefined,
        );
      } else {
        setSelectedComponentId(undefined);
      }
    },
    [],
  );

  // Drop handling is wired via a native, capture-phase listener instead of a
  // React onDrop prop: Excalidraw's own canvas has its own drop handling
  // (for image files) that can swallow the bubbling React synthetic event
  // before it reaches us.
  //
  // Depends on `initialData`: while it's `undefined` this component renders
  // the loading placeholder instead of canvas-root, so canvasWrapRef hasn't
  // attached to anything yet. Re-running this effect once loading finishes
  // (and canvas-root actually mounts) is what lets the ref resolve.
  useEffect(() => {
    const wrapEl: HTMLDivElement | null = canvasWrapRef.current;
    if (!wrapEl) {
      return;
    }

    function handleDragOver(event: DragEvent): void {
      if (event.dataTransfer?.types.includes(PORYGON_DRAG_MIME_TYPE)) {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
      }
    }

    async function handleDrop(event: DragEvent): Promise<void> {
      const componentId: string | undefined = event.dataTransfer?.getData(
        PORYGON_DRAG_MIME_TYPE,
      );
      const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
      if (!componentId || !api) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const component: ComponentDef | undefined = getComponentById(componentId);
      if (!component) {
        return;
      }

      const { convertToExcalidrawElements, viewportCoordsToSceneCoords } = await import(
        "@excalidraw/excalidraw"
      );

      const appState: AppState = api.getAppState();
      const { x, y } = viewportCoordsToSceneCoords(
        { clientX: event.clientX, clientY: event.clientY },
        appState,
      );
      const skeleton = createComponentSkeleton(component, x, y);
      const newElements = convertToExcalidrawElements([skeleton]);
      const existingElements: readonly OrderedExcalidrawElement[] = api.getSceneElements();
      api.updateScene({ elements: [...existingElements, ...newElements] });
    }

    function handleDropSync(event: DragEvent): void {
      void handleDrop(event);
    }

    wrapEl.addEventListener("dragover", handleDragOver, true);
    wrapEl.addEventListener("drop", handleDropSync, true);

    return (): void => {
      wrapEl.removeEventListener("dragover", handleDragOver, true);
      wrapEl.removeEventListener("drop", handleDropSync, true);
    };
  }, [initialData]);

  const inspectorPanel: ReactNode = useMemo(
    () => <Inspector selectedComponentId={selectedComponentId} />,
    [selectedComponentId],
  );

  if (initialData === undefined) {
    return <div className="canvas-loading">Loading your last diagram…</div>;
  }

  return (
    <div className="app-shell">
      <ComponentLibrary />
      <div className="canvas-root" ref={canvasWrapRef}>
        <Excalidraw
          excalidrawAPI={(api: ExcalidrawImperativeAPI): void => {
            excalidrawApiRef.current = api;
          }}
          initialData={initialData ?? undefined}
          onChange={handleChange}
        />
      </div>
      {inspectorPanel}
    </div>
  );
}
