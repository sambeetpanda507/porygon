// packages/canvas — turns a catalog ComponentDef into an Excalidraw element
// skeleton, and reads it back off a dropped/selected element.
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ComponentDef, ComponentStats } from "@porygon/icons";

export interface PorygonCustomData {
  porygon: {
    componentId: string;
    statsOverride?: ComponentStats;
  };
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 70;

/**
 * Builds a rectangle-with-label skeleton centered at the given scene
 * coordinates, tagged with the component's id via Excalidraw's customData.
 */
export function createComponentSkeleton(
  component: ComponentDef,
  centerX: number,
  centerY: number,
): ExcalidrawElementSkeleton {
  const customData: PorygonCustomData = { porygon: { componentId: component.id } };
  return {
    type: "rectangle",
    x: centerX - NODE_WIDTH / 2,
    y: centerY - NODE_HEIGHT / 2,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    backgroundColor: component.color,
    strokeColor: component.color,
    fillStyle: "solid",
    customData,
    label: {
      text: `${component.glyph}  ${component.label}`,
      fontSize: 14,
    },
  };
}

export function getPorygonComponentId(element: {
  customData?: Record<string, unknown>;
}): string | undefined {
  const porygonData = element.customData?.["porygon"] as
    | PorygonCustomData["porygon"]
    | undefined;
  return porygonData?.componentId;
}

export function getPorygonStatsOverride(element: {
  customData?: Record<string, unknown>;
}): ComponentStats | undefined {
  const porygonData = element.customData?.["porygon"] as
    | PorygonCustomData["porygon"]
    | undefined;
  return porygonData?.statsOverride;
}

/**
 * Returns a new customData object with the component's stats override set,
 * preserving its componentId. Used to apply an edit made in the Inspector
 * back onto the underlying Excalidraw element.
 */
export function withPorygonStatsOverride(
  element: { customData?: Record<string, unknown> },
  stats: ComponentStats,
): Record<string, unknown> {
  const componentId = getPorygonComponentId(element);
  const customData: PorygonCustomData = {
    porygon: { componentId: componentId ?? "", statsOverride: stats },
  };
  return { ...customData };
}

export const PORYGON_DRAG_MIME_TYPE = "application/x-porygon-component";
