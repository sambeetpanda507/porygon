// packages/canvas — turns a catalog ComponentDef into an Excalidraw element
// skeleton, and reads it back off a dropped/selected element.
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ComponentDef, ComponentStats } from "@p0rygon/icons";

export interface P0rygonCustomData {
  p0rygon: {
    componentId: string;
    statsOverride?: ComponentStats;
  };
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 70;

/**
 * Builds a rectangle-with-label skeleton centered at the given scene
 * coordinates, tagged with the component's id via Excalidraw's customData.
 *
 * `id` is optional and only needed when the caller has to reference this
 * node from another skeleton in the same batch — e.g. an arrow's
 * `start`/`end` binding (see presets.ts, which builds a whole preloaded
 * diagram's nodes and bound arrows in one convertToExcalidrawElements call).
 * A single dropped node never needs it since there's nothing else in that
 * batch to bind to.
 */
export function createComponentSkeleton(
  component: ComponentDef,
  centerX: number,
  centerY: number,
  id?: string,
): ExcalidrawElementSkeleton {
  const customData: P0rygonCustomData = { p0rygon: { componentId: component.id } };
  return {
    type: "rectangle",
    id,
    x: centerX - NODE_WIDTH / 2,
    y: centerY - NODE_HEIGHT / 2,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    backgroundColor: component.color,
    strokeColor: component.color,
    fillStyle: "solid",
    roundness: { type: 3 },
    customData,
    label: {
      text: `${component.glyph}  ${component.label}`,
      fontSize: 14,
      // Every catalog color is a mid-to-dark saturated swatch (same ones
      // the sidebar's icon-glyph badges already pair with white text/icons
      // against), so white is readable on all of them. Without this, the
      // label inherits Excalidraw's default near-black text color, which is
      // invisible against these backgrounds — only a label's emoji glyph
      // (rendered by the system's color emoji font, unaffected by text
      // color) stayed visible, leaving every node looking like a blank box.
      strokeColor: "#ffffff",
    },
  };
}

export function getP0rygonComponentId(element: {
  customData?: Record<string, unknown>;
}): string | undefined {
  const p0rygonData = element.customData?.["p0rygon"] as
    | P0rygonCustomData["p0rygon"]
    | undefined;
  return p0rygonData?.componentId;
}

export function getP0rygonStatsOverride(element: {
  customData?: Record<string, unknown>;
}): ComponentStats | undefined {
  const p0rygonData = element.customData?.["p0rygon"] as
    | P0rygonCustomData["p0rygon"]
    | undefined;
  return p0rygonData?.statsOverride;
}

/**
 * Returns a new customData object with the component's stats override set,
 * preserving its componentId. Used to apply an edit made in the Inspector
 * back onto the underlying Excalidraw element.
 */
export function withP0rygonStatsOverride(
  element: { customData?: Record<string, unknown> },
  stats: ComponentStats,
): Record<string, unknown> {
  const componentId = getP0rygonComponentId(element);
  const customData: P0rygonCustomData = {
    p0rygon: { componentId: componentId ?? "", statsOverride: stats },
  };
  return { ...customData };
}

export const P0RYGON_DRAG_MIME_TYPE = "application/x-p0rygon-component";
