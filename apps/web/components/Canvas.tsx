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
import {
  createComponentSkeleton,
  extractGraph,
  getPorygonComponentId,
  getPorygonStatsOverride,
  withPorygonStatsOverride,
  PORYGON_DRAG_MIME_TYPE,
} from "@porygon/canvas";
import { getComponentById, type ComponentDef, type ComponentStats } from "@porygon/icons";
import { validateGraph, type Graph, type GraphWarning } from "@porygon/simulator";
import { ComponentLibrary, GraphDebugPanel, Inspector } from "@porygon/ui";
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

const EMPTY_GRAPH: Graph = { nodes: [], edges: [] };

function graphsAreEqual(a: Graph, b: Graph): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function Canvas(): ReactNode {
  const [initialData, setInitialData] = useState<StoredScene | null | undefined>(undefined);
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>(undefined);
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(undefined);
  const [selectedStatsOverride, setSelectedStatsOverride] = useState<ComponentStats | undefined>(
    undefined,
  );
  const [graph, setGraph] = useState<Graph>(EMPTY_GRAPH);
  const [warnings, setWarnings] = useState<readonly GraphWarning[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
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

      // Excalidraw can call onChange with the same top-level array
      // reference it passed last time (elements are mutated in place
      // internally, e.g. while resolving an arrow's binding), so storing
      // `elements` itself in state and deriving things from it via
      // useMemo would silently serve a stale result on later calls where
      // the reference didn't change. Deriving everything synchronously,
      // right here, from the live `elements` this call actually received
      // avoids that entirely.
      const selectedIds: string[] = Object.keys(appState.selectedElementIds).filter(
        (id: string): boolean => appState.selectedElementIds[id] === true,
      );
      const selectedId: string | undefined =
        selectedIds.length === 1 ? selectedIds[0] : undefined;
      setSelectedElementId(selectedId);

      const selectedElement: OrderedExcalidrawElement | undefined = selectedId
        ? elements.find((element: OrderedExcalidrawElement): boolean => element.id === selectedId)
        : undefined;
      setSelectedComponentId(
        selectedElement ? getPorygonComponentId(selectedElement) : undefined,
      );
      setSelectedStatsOverride(
        selectedElement ? getPorygonStatsOverride(selectedElement) : undefined,
      );

      const extractedGraph: Graph = extractGraph(elements);
      const extractedWarnings: readonly GraphWarning[] = validateGraph(extractedGraph);
      // extractGraph/validateGraph build a brand-new object every call, even
      // when nothing actually changed — onChange fires continuously while
      // dragging, so setting state unconditionally here re-renders on every
      // single one of those calls. Keeping the previous reference when the
      // content is unchanged lets React bail out instead.
      setGraph((previous: Graph): Graph =>
        graphsAreEqual(previous, extractedGraph) ? previous : extractedGraph,
      );
      setWarnings((previous: readonly GraphWarning[]): readonly GraphWarning[] =>
        JSON.stringify(previous) === JSON.stringify(extractedWarnings) ? previous : extractedWarnings,
      );
    },
    [],
  );

  const handleStatsChange = useCallback(
    (stats: ComponentStats): void => {
      const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
      if (!api || !selectedElementId) {
        return;
      }
      const existingElements: readonly OrderedExcalidrawElement[] = api.getSceneElements();
      const updatedElements = existingElements.map(
        (element: OrderedExcalidrawElement): OrderedExcalidrawElement =>
          element.id === selectedElementId
            ? { ...element, customData: withPorygonStatsOverride(element, stats) }
            : element,
      );
      api.updateScene({ elements: updatedElements });
    },
    [selectedElementId],
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

  const inspectorPanel: ReactNode = (
    <Inspector
      selectedComponentId={selectedComponentId}
      statsOverride={selectedStatsOverride}
      onStatsChange={handleStatsChange}
    />
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
        <button
          type="button"
          className="debug-panel-toggle"
          data-testid="debug-panel-toggle"
          onClick={() => setShowDebugPanel((shown: boolean): boolean => !shown)}
        >
          {showDebugPanel ? "Hide graph debug" : "Graph debug"}
        </button>
        {showDebugPanel && <GraphDebugPanel graph={graph} warnings={warnings} />}
      </div>
      {inspectorPanel}
    </div>
  );
}
