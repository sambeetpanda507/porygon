// packages/canvas — a handful of hand-designed, well-known system-design
// diagrams a learner can load straight onto the canvas to study (and
// simulate) rather than building every reference architecture from scratch.
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { getComponentById } from "@p0rygon/icons";
import { createComponentSkeleton } from "./componentElement";

export interface PresetNode {
  /** Local to this preset only — used to wire edges below, nothing else. */
  localId: string;
  componentId: string;
  x: number;
  y: number;
}

export interface PresetEdge {
  from: string;
  to: string;
}

export interface SystemDesignPreset {
  id: string;
  label: string;
  description: string;
  nodes: readonly PresetNode[];
  edges: readonly PresetEdge[];
}

export const SYSTEM_DESIGN_PRESETS: readonly SystemDesignPreset[] = [
  {
    id: "url-shortener",
    label: "URL Shortener",
    description: "Client → API Gateway → app server, with a cache in front of the database for hot lookups.",
    nodes: [
      { localId: "client", componentId: "client", x: 100, y: 120 },
      { localId: "gateway", componentId: "api-gateway", x: 360, y: 120 },
      { localId: "app", componentId: "server-vm", x: 620, y: 120 },
      { localId: "cache", componentId: "redis-cache", x: 620, y: 320 },
      { localId: "db", componentId: "primary-db", x: 880, y: 120 },
    ],
    edges: [
      { from: "client", to: "gateway" },
      { from: "gateway", to: "app" },
      { from: "app", to: "cache" },
      { from: "app", to: "db" },
    ],
  },
  {
    id: "rate-limited-api",
    label: "Rate-Limited Public API",
    description: "WAF and an API gateway in front of the app, with a shared cache used as the rate-limit counter store.",
    nodes: [
      { localId: "client", componentId: "client", x: 100, y: 120 },
      { localId: "waf", componentId: "waf", x: 360, y: 120 },
      { localId: "gateway", componentId: "api-gateway", x: 620, y: 120 },
      { localId: "counter", componentId: "redis-cache", x: 620, y: 320 },
      { localId: "app", componentId: "server-vm", x: 880, y: 120 },
    ],
    edges: [
      { from: "client", to: "waf" },
      { from: "waf", to: "gateway" },
      { from: "gateway", to: "counter" },
      { from: "gateway", to: "app" },
    ],
  },
  {
    id: "realtime-chat",
    label: "Real-Time Chat",
    description: "Load-balanced WebSocket servers, a cache for online presence, and a topic fanning messages out to a worker that persists them.",
    nodes: [
      { localId: "client", componentId: "client", x: 100, y: 120 },
      { localId: "lb", componentId: "load-balancer", x: 360, y: 120 },
      { localId: "ws", componentId: "server-vm", x: 620, y: 120 },
      { localId: "presence", componentId: "redis-cache", x: 620, y: 320 },
      { localId: "topic", componentId: "topic-kafka-style", x: 880, y: 120 },
      { localId: "worker", componentId: "worker", x: 1140, y: 120 },
      { localId: "db", componentId: "primary-db", x: 1140, y: 320 },
    ],
    edges: [
      { from: "client", to: "lb" },
      { from: "lb", to: "ws" },
      { from: "ws", to: "presence" },
      { from: "ws", to: "topic" },
      { from: "topic", to: "worker" },
      { from: "worker", to: "db" },
    ],
  },
  {
    id: "ecommerce-order-processing",
    label: "E-Commerce Order Processing",
    description: "A synchronous checkout path plus an async queue that hands order fulfillment off to a background worker.",
    nodes: [
      { localId: "client", componentId: "client", x: 100, y: 120 },
      { localId: "gateway", componentId: "api-gateway", x: 360, y: 120 },
      { localId: "app", componentId: "server-vm", x: 620, y: 120 },
      { localId: "db", componentId: "primary-db", x: 620, y: 320 },
      { localId: "queue", componentId: "queue-sqs-style", x: 880, y: 120 },
      { localId: "worker", componentId: "worker", x: 1140, y: 120 },
      { localId: "invoices", componentId: "object-storage", x: 1140, y: 320 },
    ],
    edges: [
      { from: "client", to: "gateway" },
      { from: "gateway", to: "app" },
      { from: "app", to: "db" },
      { from: "app", to: "queue" },
      { from: "queue", to: "worker" },
      { from: "worker", to: "invoices" },
    ],
  },
  {
    id: "video-streaming",
    label: "Video Streaming / CDN",
    description: "Video files served straight from a CDN backed by object storage, with a separate API path for metadata.",
    nodes: [
      { localId: "client", componentId: "client", x: 100, y: 120 },
      { localId: "cdn", componentId: "cdn-edge", x: 360, y: 120 },
      { localId: "storage", componentId: "object-storage", x: 620, y: 120 },
      { localId: "gateway", componentId: "api-gateway", x: 360, y: 320 },
      { localId: "app", componentId: "server-vm", x: 620, y: 320 },
      { localId: "db", componentId: "primary-db", x: 880, y: 320 },
    ],
    edges: [
      { from: "client", to: "cdn" },
      { from: "cdn", to: "storage" },
      { from: "client", to: "gateway" },
      { from: "gateway", to: "app" },
      { from: "app", to: "db" },
    ],
  },
  {
    id: "social-media-feed",
    label: "Social Media Feed",
    description: "A cached, read-heavy feed read path (with a replica for scale) alongside an async fan-out write path.",
    nodes: [
      { localId: "client", componentId: "client", x: 100, y: 120 },
      { localId: "lb", componentId: "load-balancer", x: 360, y: 120 },
      { localId: "app", componentId: "server-vm", x: 620, y: 120 },
      { localId: "cache", componentId: "redis-cache", x: 620, y: 320 },
      { localId: "db", componentId: "primary-db", x: 880, y: 120 },
      { localId: "replica", componentId: "read-replica", x: 880, y: 320 },
      { localId: "topic", componentId: "topic-kafka-style", x: 1140, y: 120 },
      { localId: "worker", componentId: "worker", x: 1400, y: 120 },
    ],
    edges: [
      { from: "client", to: "lb" },
      { from: "lb", to: "app" },
      { from: "app", to: "cache" },
      { from: "app", to: "db" },
      { from: "db", to: "replica" },
      { from: "app", to: "topic" },
      { from: "topic", to: "worker" },
    ],
  },
];

/**
 * Builds a preset's nodes + bound arrows as one Excalidraw element-skeleton
 * batch, ready for convertToExcalidrawElements. Node ids are regenerated
 * fresh on every call (not the preset's own localIds) so loading the same
 * preset twice — or loading it after the canvas already has elements —
 * never collides with existing element ids; arrows reference the freshly
 * generated id for whichever localId they connect.
 */
export function buildPresetSkeleton(preset: SystemDesignPreset): ExcalidrawElementSkeleton[] {
  const elementIdByLocalId = new Map<string, string>();
  for (const node of preset.nodes) {
    elementIdByLocalId.set(
      node.localId,
      `${preset.id}-${node.localId}-${Math.random().toString(36).slice(2, 10)}`,
    );
  }

  const skeleton: ExcalidrawElementSkeleton[] = [];
  for (const node of preset.nodes) {
    const component = getComponentById(node.componentId);
    if (!component) {
      continue;
    }
    const elementId = elementIdByLocalId.get(node.localId);
    skeleton.push(createComponentSkeleton(component, node.x, node.y, elementId));
  }

  for (const edge of preset.edges) {
    const startId = elementIdByLocalId.get(edge.from);
    const endId = elementIdByLocalId.get(edge.to);
    if (!startId || !endId) {
      continue;
    }
    const fromNode = preset.nodes.find((candidate) => candidate.localId === edge.from);
    const toNode = preset.nodes.find((candidate) => candidate.localId === edge.to);
    skeleton.push({
      type: "arrow",
      x: fromNode?.x ?? 0,
      y: fromNode?.y ?? 0,
      start: { type: "rectangle", id: startId },
      end: { type: "rectangle", id: endId },
      startArrowhead: null,
      endArrowhead: "arrow",
    });
  }

  return skeleton;
}
