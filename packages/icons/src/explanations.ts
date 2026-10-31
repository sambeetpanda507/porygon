// packages/icons — canned "explain mode" copy for Phase 6's practice mode.
// Keyed by category rather than the individual component: within a
// category every component plays broadly the same architectural role, so
// one well-written sentence per category covers all ~70 components without
// needing bespoke text for each one.
import type { CategoryId, ComponentDef } from "./catalog";

export const CATEGORY_EXPLANATIONS: Record<CategoryId, string> = {
  "client-edge":
    "Where traffic originates, or the first stop it makes on the way in — a browser, app, or edge service like a CDN or firewall.",
  networking:
    "Routes and distributes requests before they reach your compute layer — load balancers, gateways, and proxies exist to spread load and hide backend topology.",
  compute:
    "Where your application code actually runs and does work. Its capacity (max RPS) is the ceiling on how much traffic it can process before requests start queueing or failing.",
  sql:
    "A relational database — strong consistency and structured queries, at the cost of being harder to scale horizontally than most NoSQL stores.",
  nosql:
    "A non-relational database built for horizontal scale and flexible schemas, usually trading some consistency guarantees for throughput.",
  caching:
    "Sits in front of a slower resource (usually a database) and serves hot reads from memory. A cold cache barely helps at all — see the 'Cold cache' failure.",
  messaging:
    "Decouples producers from consumers with an async buffer — a spike in traffic fills the queue instead of overwhelming whatever's downstream.",
  storage:
    "Durable storage for files or blobs, separate from your database — built for capacity and durability rather than low-latency queries.",
  observability:
    "Collects metrics, logs, or traces from the rest of the system so you can tell what's actually happening under load.",
  security:
    "Enforces access control or inspects traffic for abuse — firewalls, WAFs, and identity services protect the rest of the system rather than serving requests themselves.",
  aws: "A managed AWS service standing in for the equivalent generic component, with the operational tradeoffs of using a specific cloud provider.",
  gcp: "A managed Google Cloud service standing in for the equivalent generic component, with the operational tradeoffs of using a specific cloud provider.",
  azure:
    "A managed Azure service standing in for the equivalent generic component, with the operational tradeoffs of using a specific cloud provider.",
};

export function getComponentExplanation(component: ComponentDef): string {
  return CATEGORY_EXPLANATIONS[component.categoryId];
}
