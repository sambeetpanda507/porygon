# Porygon — System Design Practice Whiteboard

> Codename: **Porygon**. Porygon is a Pokémon literally made of pure digital code that lives inside computer systems — a fitting mascot for a tool where people draw and simulate the digital systems they design.

## 1. One-liner

A Next.js web app, forked from Excalidraw, where engineers practice, simulate, and reason about system designs — dragging in architecture components (load balancers, servers, databases, caches, queues, CDNs, cloud services), wiring them together with arrows, and then **running traffic simulations** on top of the static diagram to see what breaks, where bottlenecks form, and how the system behaves under failure or load spikes.

## 2. Problem this solves

System design interviews and real architecture reviews are usually validated only by talking — a candidate/engineer draws boxes and arrows, and everyone *imagines* what happens under load. Porygon makes the diagram executable: once you've drawn the architecture, you can press play and watch simulated requests flow through it, see latency/throughput/error numbers per component, and intentionally break things (kill a node, saturate a queue, spike traffic 10x) to learn what *actually* happens.

## 3. Target users

- Engineers prepping for system design interviews (practice + self-grading against failure scenarios)
- Interviewers who want a shared canvas with "stress test" built in
- Teams doing architecture/design reviews who want to pressure-test a proposed design
- Students / bootcamp learners building intuition for distributed systems concepts (CAP theorem, backpressure, cache invalidation, etc.)

## 4. Core foundation (Excalidraw fork)

Keep everything Excalidraw already does well, as the base canvas layer:
- Infinite canvas, pan/zoom
- Draw/drag/resize shapes, freehand drawing, text
- Arrows & connectors (bound to shapes, routed, labeled)
- Export (PNG/SVG/JSON), local-first storage, undo/redo
- Libraries (custom shape libraries) — this is the extension point for our icon sets

On top of that base, Next.js is the app shell (routing, API routes, SSR for landing/docs pages, server-side simulation endpoints or edge functions), while the canvas itself can still run as a client-side Excalidraw-based component.

**V1 scope note:** Excalidraw's live multiplayer/collaboration (the realtime room server) is deliberately **stripped out for v1**. Sharing in v1 is a static, read-only link (diagram encoded into the URL, same as Excalidraw's shareable-link export) — not a live co-editing session. Live collaboration is deferred to v2+ (see §10).

## 5. New capabilities we add

**Product stance:** No accounts, no sign-in, no pricing/paywall. Porygon is local-first — every diagram, component library, and simulation run lives entirely in the browser's own storage (`localStorage` / IndexedDB), the same model Excalidraw already uses. Nothing is sent to a server unless the user explicitly exports or shares a design.

### 5.1 System-design component library (icon set)
A first-class shape library of architecture components, each a typed node (not just a styled rectangle) carrying semantic metadata (capacity, latency profile, failure modes) used later by the simulator.

Initial icon/component set (inspired by eraser.io's icon library):
- **Compute**: server, VM/instance, container, serverless function, worker
- **Load balancing/Networking**: load balancer (L4/L7), API gateway, reverse proxy, DNS, firewall
- **Databases**: SQL database (Postgres/MySQL style), NoSQL database (Mongo/Dynamo style), data warehouse, replica/read-replica
- **Caching**: cache (Redis/Memcached style), CDN edge node
- **Messaging**: queue (SQS/RabbitMQ style), topic/pub-sub (Kafka style), event bus
- **Storage**: object storage (S3-style), block storage, file storage
- **Cloud/provider logos**: generic "cloud service" + AWS/GCP/Azure-flavored variants for common managed services (as a stretch, respecting trademark-safe generic iconography by default)
- **Client/edge**: client/browser, mobile client, CDN, third-party API
- **Observability**: monitoring/alerting, logging

Each component on the canvas has an inspector panel: name, configurable stats (e.g. max RPS, avg latency ms, error rate, storage size, replica count) that feed the simulator.

### 5.2 Traffic & failure simulation engine
The headline differentiator. Runs on top of the diagram graph (nodes + directed edges extracted from arrows):
- **Traffic simulation**: inject a request rate (constant, ramped, spiky, or a custom load pattern) at one or more "client" nodes and animate requests flowing along arrows toward their destinations, obeying routing/fan-out rules.
- **Capacity & bottleneck modeling**: each node has throughput/latency/concurrency limits; simulator computes queueing, backpressure, and highlights saturated nodes (color-coded: green/healthy, yellow/strained, red/overloaded).
- **Failure injection scenarios**: kill a node (server crash), degrade a node (slow disk/high latency), partition the network (cut an edge), exhaust a cache (cold cache), fill a queue, throttle a dependency — see cascading effects ripple through the diagram in real time.
- **Spike scenarios**: sudden traffic multiplier (e.g. "Black Friday", "viral tweet") to test autoscaling assumptions, or lack thereof, in the design.
- **Metrics dashboard**: live charts per node/edge — RPS, p50/p95/p99 latency, error rate, queue depth — plus an overall system health score.
- **Scenario presets**: a library of canned exercises ("design a URL shortener that survives a 10x spike", "make this payments system survive an AZ outage") with a scoring rubric.

### 5.3 Practice mode / guided exercises
- Prompt library of common system design interview questions (URL shortener, rate limiter, chat app, news feed, ride-sharing dispatch, etc.)
- A built-in timer + checklist of considerations (scalability, consistency, availability, cost) to self-review against
- "Explain mode": click any component/edge to get a plain-language note on what it's doing and why it matters under the current scenario
- Optional AI review: given the diagram + simulation results, generate feedback on bottlenecks, SPOFs (single points of failure), and missing considerations

### 5.4 Sharing & local versioning (v1 — no accounts, no live sessions)
- **Static share links only in v1**: the diagram is encoded into the link itself (optionally end-to-end encrypted), with no server-side account, login, or live-sync room — whoever opens the link gets a read-only snapshot they can duplicate into their own local copy, not a shared live canvas
- Local versioning/snapshots stored in the browser so you can compare "before" vs "after" a fix, plus manual export/import of a `.porygon` (or `.excalidraw`-compatible) file for backup or moving between devices
- Comments/annotations pinned to specific nodes, stored with the diagram itself (local, exported with the file — not realtime)
- *Live collaborative editing (multiple cursors, shared live canvas) is explicitly deferred to v2+ — see §10.*

### 5.5 Not yet scoped / open questions (flagged per your note #11)
- Cost estimation overlay (rough $/month based on chosen managed services)
- Multi-region / multi-AZ modeling (latency between regions, failover simulation)
- Import from existing cloud (e.g. parse a Terraform/CloudFormation file into a starter diagram)
- Grading/interview mode with a rubric and scorecard for mock interviews
- Plugin API so the community can add new component types/simulators
- Mobile/tablet support for the canvas

## 6. Tech approach (high level)

- **Framework**: Next.js (App Router), TypeScript throughout, no type inference, Keep the code simple and don't unnecessarily overcomplicate.
- **Canvas**: fork `@excalidraw/excalidraw`, extend its element types with custom "system design" element data (component type, stats, ports) via Excalidraw's custom element / library APIs rather than forking the renderer wholesale where possible
- **Simulation engine**: separate, framework-agnostic TS package (`packages/simulator`) that takes a graph (nodes + edges + per-node stats) and a traffic spec, and produces a time-series of per-node/edge metrics; runs client-side (Web Worker) for responsiveness, with an optional server-side runner for longer/heavier simulations
- **State**: diagram state stays in Excalidraw's own store; simulation state layered on top (keyed by element id) in a separate store (e.g. Zustand) so simulation can be paused/reset without touching the drawing
- **Backend (Next.js API routes / server actions)**: kept minimal and account-free. V1 needs no realtime relay at all, since sharing is a static encoded-link snapshot, not a live session — the backend's only job in v1 is serving the static scenario-prompt library (and optionally an edge function to shorten/host large share-link payloads). No auth, no billing, no websocket/collab server.
- **Persistence**: local-first. Diagrams, the component library, and simulation history live in the browser (`localStorage` for small state, IndexedDB for larger diagram/scenario data), exactly like Excalidraw today. No user database.
- **Icon assets**: SVG icon set for all component types, built as an Excalidraw "library" (importable .excalidrawlib) plus used as the Figma design system for marketing/UI
- **Testing**: Playwright for end-to-end tests, one suite per phase (see §9) — each phase ships with Playwright coverage for its own exit criteria before the next phase starts, no exceptions

## 7. Suggested project structure

```
porygon/
├── apps/
│   └── web/              # Next.js app (routes, API, pages)
├── packages/
│   ├── canvas/           # Excalidraw fork + system-design element types
│   ├── simulator/        # traffic/failure simulation engine
│   ├── icons/            # system design icon set (SVG + Excalidraw library format)
│   └── ui/                # shared design-system UI components
└── plan.md
```

## 8. Next steps (tl;dr)

1. Stand up the Next.js app shell with Excalidraw embedded (vanilla, unmodified) to validate the fork point.
2. Design the icon set + component metadata schema (this is what the Figma file in this plan covers first).
3. Prototype the simulation engine against a trivial 3-node graph (client → load balancer → server) before wiring it to the canvas.
4. Layer in failure/spike scenarios once basic traffic flow works.
5. Add practice-mode content (prompts, rubric) once the core loop (draw → simulate → observe) is solid.

See §9 for the detailed phase-by-phase breakdown.

## 9. Phase-wise implementation plan (v1)

Each phase has a concrete exit criterion — don't start the next phase until the current one's exit criterion is demonstrably true. Phases map onto the `packages/*` structure from §7. No phase in v1 touches auth, billing, or a live-collaboration server (see §10 for what's deliberately deferred).

### Phase 1 — Foundation & app shell
**Goal:** prove the fork point works before building anything custom on top of it.
- Scaffold the monorepo (`apps/web`, `packages/canvas`, `packages/simulator`, `packages/icons`, `packages/ui`)
- Next.js App Router shell: base layout, routing (`/` landing, `/design` or `/design/[id]` canvas)
- Embed **vanilla, unmodified** `@excalidraw/excalidraw` in `apps/web`
- Wire local persistence: diagram autosaves to IndexedDB (mirroring Excalidraw's own approach) — confirm nothing touches a server
- **Playwright e2e:** app loads, draw a shape, reload the page, assert the shape persisted; assert no network requests fire for diagram data
- **Exit criteria:** open the app, draw with stock Excalidraw, refresh the browser — diagram is still there. Zero accounts, zero network calls for diagram data.

### Phase 2 — Icon & component library
**Goal:** the ~70-icon gallery from the design mockup becomes real, draggable, typed components.
- Define the component metadata schema (type, category, stats: maxRPS, avgLatencyMs, failureModes, provider)
- Build the SVG icon set per §5.1 (Client/Edge, Networking, Compute, SQL/NoSQL, Caching, Messaging, Storage, Observability, Security, plus named AWS/GCP/Azure services)
- Package as an Excalidraw custom library (`.excalidrawlib`) and build the sidebar UI (`packages/ui`) matching `design/app-canvas.html` — scrollable categories, search, counts
- Wire drag-and-drop from the library onto the canvas, producing typed elements (custom element data attached to the underlying Excalidraw element)
- **Playwright e2e:** search the library for a known component, drag it onto the canvas, assert the node renders with correct icon/label and its metadata is readable in the inspector panel; repeat for one component per category
- **Exit criteria:** search and drag any of the ~70 components onto the canvas; each dropped node's metadata is inspectable in a side panel.

### Phase 3 — Diagram graph extraction
**Goal:** turn a drawing into data the simulator can run on.
- Build the graph-extraction layer: read the Excalidraw scene → typed nodes + directed edges (from bound arrows) → `packages/simulator` input format
- Node inspector panel: edit stats per node (capacity, latency profile) directly on canvas
- Validate the graph inline (disconnected nodes, cycles, multiple unlabeled sources) with warnings, not hard errors
- **Playwright e2e:** draw Client→LB→Server→DB with bound arrows, open the debug panel, assert the extracted graph has the correct node count and edge directions; draw a disconnected node and assert the inline warning appears
- **Exit criteria:** drawing Client→LB→Server→DB with arrows produces a correct internal graph object (visible via a debug panel).

### Phase 4 — Traffic simulation engine (core)
**Goal:** the headline feature — a diagram that reacts to traffic, live.
- `packages/simulator`: deterministic tick-based simulation; constant traffic injected at client nodes, propagated along edges respecting fan-out/routing
- Capacity & queueing model: per-node maxRPS/latency/concurrency, basic queueing math, saturation detection
- Runs in a Web Worker; streams tick results back to the canvas for live node coloring (healthy/strained/overloaded), matching the traffic-packet animation in the hero mockup
- Minimal "Simulate Traffic" control (play/pause/reset) in the top bar
- **Playwright e2e:** build a 3-node chain, click Simulate, assert node colors transition and the RPS/latency readout updates within N ticks; click Pause/Reset and assert state freezes/clears correctly
- **Exit criteria:** running simulate on a 3-node chain live-updates node colors and a basic RPS/latency readout.

### Phase 5 — Failure injection & scenario presets
**Goal:** the right-hand Simulation Panel from the mockup becomes fully functional.
- Failure actions as simulator-level perturbations: kill node, degrade node, cut edge, cold cache, fill queue, throttle dependency
- Scenario-preset data model + built-ins (steady baseline, 10x spike, gradual ramp)
- SPOF detection pass (graph analysis: any leaf reachable by only one path)
- Build the Simulation Panel UI pixel-for-pixel against `design/app-canvas.html`: scenario list, failure buttons, live metric cards, mini chart, system health bar
- **Playwright e2e:** select "Black Friday Spike (10x)", run it, assert metrics/node colors match expected degraded state; click each failure-injection button individually and assert its specific cascading effect (killed node turns dead, cut edge stops traffic downstream, SPOF gets flagged)
- **Exit criteria:** selecting "Black Friday Spike (10x)" and clicking Simulate reproduces the mockup's behavior end-to-end on a real, user-drawn diagram.

### Phase 6 — Practice mode & scenario prompts
**Goal:** the self-study loop (draw → simulate → review) is complete.
- Static scenario-prompt library (URL shortener, rate limiter, chat app, news feed, ride-dispatch, etc.) — content lives in-repo (JSON/MDX), no DB
- Timer + self-review checklist UI (scalability / consistency / availability / cost)
- "Explain mode": click a node/edge for a canned explanation keyed to component type + active scenario (static content in v1 — not AI-generated yet, see §10)
- **Playwright e2e:** pick a scenario prompt, assert the timer starts and the checklist renders; click a node in explain mode and assert the correct canned explanation appears; build and simulate a design against the prompt's traffic profile end-to-end
- **Exit criteria:** pick a prompt, get a timer + checklist, build a design, and simulate it against that scenario's traffic profile.

### Phase 7 — Sharing & local persistence polish (no live sessions)
**Goal:** get a diagram in front of someone else without any account or server-side room.
- Export/import a `.porygon` file (Excalidraw-compatible JSON + our component metadata)
- "Copy share link" encodes the diagram into a URL (Excalidraw-style shareable link) as a **static, read-only snapshot** — explicitly not a live co-editing room
- Local version snapshots: manual "save a version" in IndexedDB, compare before/after
- **Playwright e2e:** export a `.porygon` file, clear state, re-import it, assert the diagram matches; generate a share link, open it in a fresh browser context, assert the read-only snapshot renders correctly and is not editable/live-synced
- **Exit criteria:** export, re-import, and share a read-only link that reconstructs the diagram for the recipient — zero accounts, zero live sync.

### Phase 8 — Landing page, polish & launch prep
**Goal:** v1 is ready to show people.
- Ship `design/landing.html`'s animated hero as a real Next.js page
- Accessibility/contrast pass, responsive check, empty states, first-run onboarding tooltip on the canvas
- Perf pass on the simulation worker and large-diagram rendering
- **Playwright e2e:** full happy-path smoke test across the whole app (landing → open canvas → drag a component → connect it → simulate → share), plus a mobile/narrow-viewport visual check of the landing page; run the complete Playwright suite from every prior phase as a regression gate before launch
- **Exit criteria:** v1 is shareable publicly — local-first, no accounts, full icon gallery, working simulation + failure injection, static sharing.

## 10. Deferred to v2+ (explicitly out of v1)

- **Live collaborative sessions** (multiple cursors, shared live canvas, realtime sync) — per your call, v1 ships single-player only
- AI-generated design review / AI-powered "explain mode"
- Cost estimation overlay ($/month based on chosen managed services)
- Multi-region / multi-AZ modeling (cross-region latency, failover simulation)
- Cloud import (parse an existing Terraform/CloudFormation file into a starter diagram)
- Grading/interview mode with a scorecard for mock interviews
- Plugin API for community-contributed component/simulator types
- Mobile/tablet canvas support
