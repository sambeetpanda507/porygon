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
  NODE_STATUS_COLORS,
  PORYGON_DRAG_MIME_TYPE,
} from "@porygon/canvas";
import { getComponentById, type ComponentDef, type ComponentStats } from "@porygon/icons";
import {
  getScenarioById,
  validateGraph,
  DEFAULT_SCENARIO_ID,
  type FailureInjection,
  type Graph,
  type GraphWarning,
  type ScenarioPreset,
  type ScenarioPrompt,
  type SimulationTick,
  type TrafficSpec,
} from "@porygon/simulator";
import {
  ComponentLibrary,
  GraphDebugPanel,
  Inspector,
  PracticePanel,
  ShareBanner,
  SharingPanel,
  SimulationPanel,
} from "@porygon/ui";
import type { SimulationStatus, VersionSummary } from "@porygon/ui";
import { SCENARIO_PROMPTS } from "@/content/prompts";
import { idbGet, idbSet } from "@/lib/db";
import { buildShareUrl, decodeBase64ToScene, getShareParamFromLocation } from "@/lib/sharing";
import type {
  ResetCommand,
  SetFailuresCommand,
  StartCommand,
  StopCommand,
  WorkerMessage,
} from "@/workers/simulation.worker";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false },
);

const SCENE_KEY = "porygon-scene";
const VERSIONS_KEY = "porygon-versions";
const ONBOARDING_DISMISSED_KEY = "porygon-onboarding-dismissed";
const SAVE_DEBOUNCE_MS = 300;
const COPY_FEEDBACK_MS = 2_000;

interface StoredScene {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

interface VersionRecord extends StoredScene {
  id: string;
  timestamp: number;
}

const EMPTY_GRAPH: Graph = { nodes: [], edges: [] };
const SIM_TARGET_RPS = 2000;
const SIM_RAMP_TICKS = 5;
const SIM_TICK_INTERVAL_MS = 300;

function graphsAreEqual(a: Graph, b: Graph): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Every "client" node on the canvas (there can be more than one — each is
 * an independent traffic entry point), else whichever node has no incoming
 * edges (a root of the diagram), else just the first node. */
function pickSourceNodeIds(graph: Graph): readonly string[] {
  const clientNodeIds = graph.nodes
    .filter((node) => node.componentId === "client")
    .map((node) => node.id);
  if (clientNodeIds.length > 0) {
    return clientNodeIds;
  }
  const targetIds = new Set(graph.edges.map((edge) => edge.toNodeId));
  const rootNode = graph.nodes.find((node) => !targetIds.has(node.id));
  const fallbackId = (rootNode ?? graph.nodes[0])?.id;
  return fallbackId ? [fallbackId] : [];
}

export function Canvas(): ReactNode {
  const [initialData, setInitialData] = useState<StoredScene | null | undefined>(undefined);
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>(undefined);
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(undefined);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>(undefined);
  const [selectedStatsOverride, setSelectedStatsOverride] = useState<ComponentStats | undefined>(
    undefined,
  );
  const [graph, setGraph] = useState<Graph>(EMPTY_GRAPH);
  const [warnings, setWarnings] = useState<readonly GraphWarning[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [showPracticePanel, setShowPracticePanel] = useState<boolean>(false);
  const [simStatus, setSimStatus] = useState<SimulationStatus>("idle");
  const [latestTick, setLatestTick] = useState<SimulationTick | null>(null);
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO_ID);
  const [activeFailures, setActiveFailures] = useState<readonly FailureInjection[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(undefined);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [checkedItems, setCheckedItems] = useState<ReadonlySet<string>>(new Set());
  const [explainMode, setExplainMode] = useState<boolean>(false);
  const [isReadOnlyShare, setIsReadOnlyShare] = useState<boolean>(false);
  const [showSharingPanel, setShowSharingPanel] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [versions, setVersions] = useState<readonly VersionRecord[]>([]);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const simWorkerRef = useRef<Worker | null>(null);
  const originalColorsRef = useRef<
    Map<string, { backgroundColor: string; strokeColor: string }>
  >(new Map());

  useEffect(() => {
    let cancelled = false;

    // A #share=<encoded> link renders a read-only snapshot straight from
    // the URL, never touching this browser's own saved diagram — picking
    // that up instead of the real one would be a quiet, confusing bug.
    const shareParam = getShareParamFromLocation();
    if (shareParam) {
      try {
        const sharedScene = decodeBase64ToScene<StoredScene>(shareParam);
        setInitialData(sharedScene);
        setIsReadOnlyShare(true);
        return;
      } catch {
        // Malformed/corrupted share param — fall through to the normal
        // load below rather than leaving the canvas stuck loading forever.
      }
    }

    idbGet<StoredScene>(SCENE_KEY).then((stored: StoredScene | undefined) => {
      if (!cancelled) {
        setInitialData(stored ?? null);
      }
    });
    idbGet<readonly VersionRecord[]>(VERSIONS_KEY).then(
      (stored: readonly VersionRecord[] | undefined) => {
        if (!cancelled) {
          setVersions(stored ?? []);
        }
      },
    );
    return (): void => {
      cancelled = true;
    };
  }, []);

  // Navigating to a URL that differs only by its fragment (e.g. pasting a
  // new #share=... link into a tab that's already on /design) never
  // reloads the page in any browser — the above effect, which only runs
  // once on mount, would silently never notice the new share link. A full
  // reload is the simplest correct fix: it re-runs that effect from
  // scratch against the new hash instead of trying to splice a second
  // "load a share" code path into already-mounted state.
  useEffect(() => {
    function handleHashChange(): void {
      window.location.reload();
    }
    window.addEventListener("hashchange", handleHashChange);
    return (): void => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // First-run hint: only for a genuinely empty, never-dismissed canvas —
  // not for a shared read-only view, and not once the user has an existing
  // diagram (dismissed or not) or has ever dismissed it before.
  useEffect(() => {
    if (initialData === undefined || isReadOnlyShare) {
      return;
    }
    const alreadyDismissed = window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== null;
    const hasExistingDiagram = (initialData?.elements.length ?? 0) > 0;
    if (!alreadyDismissed && !hasExistingDiagram) {
      setShowOnboarding(true);
    }
  }, [initialData, isReadOnlyShare]);

  const handleDismissOnboarding = useCallback((): void => {
    setShowOnboarding(false);
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
  }, []);

  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ): void => {
      if (isReadOnlyShare) {
        return;
      }
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
      setSelectedEdgeId(
        selectedElement && selectedElement.type === "arrow" ? selectedElement.id : undefined,
      );

      const extractedGraph: Graph = extractGraph(elements);
      if (extractedGraph.nodes.length > 0) {
        setShowOnboarding(false);
        window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
      }
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
    [isReadOnlyShare],
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

  // Captured once per run (not cleared on pause/reset) so re-running the
  // simulation, or resetting after it, always restores each node's actual
  // catalog color rather than whatever color a previous run happened to
  // leave it in.
  const captureOriginalColors = useCallback((): void => {
    const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
    if (!api) {
      return;
    }
    for (const element of api.getSceneElements()) {
      if (getPorygonComponentId(element) && !originalColorsRef.current.has(element.id)) {
        originalColorsRef.current.set(element.id, {
          backgroundColor: element.backgroundColor,
          strokeColor: element.strokeColor,
        });
      }
    }
  }, []);

  const applyTickColors = useCallback((result: SimulationTick): void => {
    const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
    if (!api) {
      return;
    }
    const colorByNodeId = new Map<string, string>(
      result.nodes.map((node) => [node.nodeId, NODE_STATUS_COLORS[node.status]]),
    );
    const existingElements: readonly OrderedExcalidrawElement[] = api.getSceneElements();
    const updatedElements = existingElements.map(
      (element: OrderedExcalidrawElement): OrderedExcalidrawElement => {
        const color = colorByNodeId.get(element.id);
        return color ? { ...element, backgroundColor: color, strokeColor: color } : element;
      },
    );
    api.updateScene({ elements: updatedElements });
  }, []);

  const restoreOriginalColors = useCallback((): void => {
    const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
    if (!api) {
      return;
    }
    const existingElements: readonly OrderedExcalidrawElement[] = api.getSceneElements();
    const updatedElements = existingElements.map(
      (element: OrderedExcalidrawElement): OrderedExcalidrawElement => {
        const original = originalColorsRef.current.get(element.id);
        return original ? { ...element, ...original } : element;
      },
    );
    api.updateScene({ elements: updatedElements });
  }, []);

  const ensureSimWorker = useCallback((): Worker => {
    let worker: Worker | null = simWorkerRef.current;
    if (worker === null) {
      worker = new Worker(new URL("../workers/simulation.worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<WorkerMessage>): void => {
        if (event.data.type === "tick") {
          setLatestTick(event.data.result);
          applyTickColors(event.data.result);
        }
      };
      simWorkerRef.current = worker;
    }
    return worker;
  }, [applyTickColors]);

  const handleSimPlay = useCallback((): void => {
    const sourceNodeIds: readonly string[] = pickSourceNodeIds(graph);
    if (sourceNodeIds.length === 0) {
      return;
    }
    captureOriginalColors();
    const worker: Worker = ensureSimWorker();
    const scenario: ScenarioPreset | undefined = getScenarioById(scenarioId);
    const traffic: TrafficSpec = {
      sourceNodeIds,
      targetRps: SIM_TARGET_RPS * (scenario?.targetRpsMultiplier ?? 1),
      rampTicks: scenario?.rampTicks ?? SIM_RAMP_TICKS,
    };
    const command: StartCommand = {
      type: "start",
      graph,
      traffic,
      tickIntervalMs: SIM_TICK_INTERVAL_MS,
      failures: activeFailures,
    };
    worker.postMessage(command);
    setSimStatus("running");
  }, [graph, scenarioId, activeFailures, captureOriginalColors, ensureSimWorker]);

  const handleSimPause = useCallback((): void => {
    const command: StopCommand = { type: "stop" };
    simWorkerRef.current?.postMessage(command);
    setSimStatus("paused");
  }, []);

  const handleSimReset = useCallback((): void => {
    const command: ResetCommand = { type: "reset" };
    simWorkerRef.current?.postMessage(command);
    setSimStatus("idle");
    setLatestTick(null);
    setActiveFailures([]);
    restoreOriginalColors();
  }, [restoreOriginalColors]);

  // Toggling a failure while idle just affects what the *next* Simulate run
  // starts with; toggling one while a run is already going pushes the
  // change straight to the worker so it takes effect on the next tick,
  // without restarting the run or resetting the tick counter.
  const handleToggleFailure = useCallback(
    (failure: FailureInjection): void => {
      setActiveFailures((previous: readonly FailureInjection[]): readonly FailureInjection[] => {
        const isActive = previous.some(
          (candidate) => candidate.type === failure.type && candidate.targetId === failure.targetId,
        );
        const next: readonly FailureInjection[] = isActive
          ? previous.filter(
              (candidate) =>
                !(candidate.type === failure.type && candidate.targetId === failure.targetId),
            )
          : [...previous, failure];

        if (simStatus === "running") {
          const command: SetFailuresCommand = { type: "set-failures", failures: next };
          simWorkerRef.current?.postMessage(command);
        }
        return next;
      });
    },
    [simStatus],
  );

  useEffect(() => {
    return (): void => {
      simWorkerRef.current?.terminate();
    };
  }, []);

  // Counts up once a second for as long as a practice prompt is selected;
  // resets whenever the prompt changes (including to "none").
  useEffect(() => {
    if (!selectedPromptId) {
      return;
    }
    const intervalId = setInterval(() => {
      setElapsedSeconds((previous: number): number => previous + 1);
    }, 1_000);
    return (): void => clearInterval(intervalId);
  }, [selectedPromptId]);

  const handleSelectPrompt = useCallback((promptId: string | undefined): void => {
    setSelectedPromptId(promptId);
    setElapsedSeconds(0);
    setCheckedItems(new Set());
    const prompt: ScenarioPrompt | undefined = SCENARIO_PROMPTS.find(
      (candidate) => candidate.id === promptId,
    );
    if (prompt) {
      setScenarioId(prompt.scenarioId);
    }
  }, []);

  const handleToggleChecklistItem = useCallback((item: string): void => {
    setCheckedItems((previous: ReadonlySet<string>): ReadonlySet<string> => {
      const next = new Set(previous);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  const handleToggleExplainMode = useCallback((): void => {
    setExplainMode((previous: boolean): boolean => !previous);
  }, []);

  const buildCurrentScene = useCallback((): StoredScene | null => {
    const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
    if (!api) {
      return null;
    }
    return {
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
    };
  }, []);

  // AppState carries several fields that are Maps/Sets/host objects at
  // runtime (collaborators, followedBy, fileHandle, ...) — JSON.stringify
  // silently turns a Map/Set into "{}", and Excalidraw's own merge logic
  // then crashes (e.g. calling .forEach on it) when that comes back in as
  // initialData. Stripping known offenders one at a time is a losing game
  // (we already missed "followedBy" once), so portable scenes just drop
  // appState entirely — Excalidraw's own defaults are perfectly fine for a
  // freshly opened export or share link, which never needs to carry the
  // exporting user's scroll position/selection/collaborators anyway. Only
  // JSON-serialized paths (export, share link) need this — idbSet uses
  // IndexedDB's structured clone, which preserves Maps/Sets natively, so
  // version snapshots are unaffected and keep the full appState.
  const buildPortableScene = useCallback((): StoredScene | null => {
    const scene: StoredScene | null = buildCurrentScene();
    if (!scene) {
      return null;
    }
    return { ...scene, appState: {} };
  }, [buildCurrentScene]);

  const handleExport = useCallback((): void => {
    const scene: StoredScene | null = buildPortableScene();
    if (!scene) {
      return;
    }
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "diagram.porygon";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [buildPortableScene]);

  const handleImportFile = useCallback((file: File): void => {
    const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
    if (!api) {
      return;
    }
    void file.text().then((text: string): void => {
      let parsed: Partial<StoredScene>;
      try {
        parsed = JSON.parse(text) as Partial<StoredScene>;
      } catch {
        return;
      }
      if (!Array.isArray(parsed.elements)) {
        return;
      }
      const elements = parsed.elements as readonly OrderedExcalidrawElement[];
      api.updateScene({ elements: elements as OrderedExcalidrawElement[] });
      const scene: StoredScene = {
        elements,
        appState: parsed.appState ?? {},
        files: parsed.files ?? {},
      };
      void idbSet(SCENE_KEY, scene);
    });
  }, []);

  const handleCopyShareLink = useCallback((): void => {
    const scene: StoredScene | null = buildPortableScene();
    if (!scene) {
      return;
    }
    void navigator.clipboard.writeText(buildShareUrl(scene)).then((): void => {
      setCopyFeedback(true);
      if (copyFeedbackTimeout.current !== null) {
        clearTimeout(copyFeedbackTimeout.current);
      }
      copyFeedbackTimeout.current = setTimeout(() => setCopyFeedback(false), COPY_FEEDBACK_MS);
    });
  }, [buildPortableScene]);

  const handleSaveVersion = useCallback((): void => {
    const scene: StoredScene | null = buildCurrentScene();
    if (!scene) {
      return;
    }
    const record: VersionRecord = { ...scene, id: `v-${Date.now()}`, timestamp: Date.now() };
    setVersions((previous: readonly VersionRecord[]): readonly VersionRecord[] => {
      const next = [record, ...previous];
      void idbSet(VERSIONS_KEY, next);
      return next;
    });
  }, [buildCurrentScene]);

  const handleRestoreVersion = useCallback(
    (versionId: string): void => {
      const api: ExcalidrawImperativeAPI | null = excalidrawApiRef.current;
      const version: VersionRecord | undefined = versions.find(
        (candidate) => candidate.id === versionId,
      );
      if (!api || !version) {
        return;
      }
      api.updateScene({ elements: version.elements as OrderedExcalidrawElement[] });
      const scene: StoredScene = {
        elements: version.elements,
        appState: version.appState,
        files: version.files,
      };
      void idbSet(SCENE_KEY, scene);
    },
    [versions],
  );

  const handleDuplicateToEdit = useCallback((): void => {
    if (!initialData) {
      return;
    }
    void idbSet(SCENE_KEY, initialData).then((): void => {
      window.location.href = "/design";
    });
  }, [initialData]);

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
      selectedElementId={selectedElementId}
      selectedEdgeId={selectedEdgeId}
      statsOverride={selectedStatsOverride}
      onStatsChange={handleStatsChange}
      activeFailures={activeFailures}
      onToggleFailure={handleToggleFailure}
      explainMode={explainMode}
    />
  );

  const versionSummaries: readonly VersionSummary[] = versions.map(
    (version): VersionSummary => ({
      id: version.id,
      timestamp: version.timestamp,
      elementCount: version.elements.length,
    }),
  );

  if (initialData === undefined) {
    return <div className="canvas-loading">Loading your last diagram…</div>;
  }

  return (
    <div className="app-shell">
      {!isReadOnlyShare && <ComponentLibrary />}
      <div className="canvas-root" ref={canvasWrapRef}>
        <Excalidraw
          excalidrawAPI={(api: ExcalidrawImperativeAPI): void => {
            excalidrawApiRef.current = api;
          }}
          initialData={initialData ?? undefined}
          onChange={handleChange}
          viewModeEnabled={isReadOnlyShare}
        />
        {isReadOnlyShare ? (
          <ShareBanner onDuplicate={handleDuplicateToEdit} />
        ) : (
          <>
            {showOnboarding && (
              <div className="onboarding-tooltip" data-testid="onboarding-tooltip" role="status">
                <span>
                  Drag a component from the sidebar onto the canvas to start your first design.
                </span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  data-testid="onboarding-dismiss"
                  onClick={handleDismissOnboarding}
                >
                  ×
                </button>
              </div>
            )}
            <button
              type="button"
              className="debug-panel-toggle"
              data-testid="debug-panel-toggle"
              onClick={() => setShowDebugPanel((shown: boolean): boolean => !shown)}
            >
              {showDebugPanel ? "Hide graph debug" : "Graph debug"}
            </button>
            {showDebugPanel && <GraphDebugPanel graph={graph} warnings={warnings} />}
            <SimulationPanel
              graph={graph}
              tick={latestTick}
              status={simStatus}
              onPlay={handleSimPlay}
              onPause={handleSimPause}
              onReset={handleSimReset}
              scenarioId={scenarioId}
              onScenarioChange={setScenarioId}
            />
            <button
              type="button"
              className="practice-panel-toggle"
              data-testid="practice-panel-toggle"
              onClick={() => setShowPracticePanel((shown: boolean): boolean => !shown)}
            >
              {showPracticePanel ? "Hide practice mode" : "Practice mode"}
            </button>
            {showPracticePanel && (
              <PracticePanel
                prompts={SCENARIO_PROMPTS}
                selectedPromptId={selectedPromptId}
                onSelectPrompt={handleSelectPrompt}
                elapsedSeconds={elapsedSeconds}
                checkedItems={checkedItems}
                onToggleChecklistItem={handleToggleChecklistItem}
                explainMode={explainMode}
                onToggleExplainMode={handleToggleExplainMode}
              />
            )}
            <button
              type="button"
              className="sharing-panel-toggle"
              data-testid="sharing-panel-toggle"
              onClick={() => setShowSharingPanel((shown: boolean): boolean => !shown)}
            >
              {showSharingPanel ? "Hide sharing" : "Sharing"}
            </button>
            {showSharingPanel && (
              <SharingPanel
                onExport={handleExport}
                onImportFile={handleImportFile}
                onCopyShareLink={handleCopyShareLink}
                copyFeedback={copyFeedback}
                versions={versionSummaries}
                onSaveVersion={handleSaveVersion}
                onRestoreVersion={handleRestoreVersion}
              />
            )}
          </>
        )}
      </div>
      {!isReadOnlyShare && inspectorPanel}
    </div>
  );
}
