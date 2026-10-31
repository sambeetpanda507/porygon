# Porygon

A drag-and-drop whiteboard for system design, forked from [Excalidraw](https://github.com/excalidraw/excalidraw) — draw your architecture with load balancers, servers, databases, caches, queues, and CDNs, then **simulate real traffic, spikes, and failures** to see exactly what happens.

Porygon is **local-first**: there are no accounts, no sign-up, and no server-side storage. Every diagram, component library, and simulation run lives entirely in your browser (IndexedDB / local storage). Nothing leaves your machine unless you explicitly export a file or copy a share link.

## What you can do with it

- **Draw on a full Excalidraw canvas** — infinite canvas, freehand drawing, shapes, bound arrows, undo/redo, PNG/SVG export.
- **Drag in real system-design components** — load balancer, server/VM, SQL & NoSQL databases, Redis-style cache, SQS-style queue, CDN edge, object storage, API gateway, client — from the component library sidebar.
- **Wire components together with arrows** to describe how traffic flows through your design; Porygon extracts a directed graph (nodes + edges) from what you've drawn.
- **Simulate traffic** on top of that graph — inject a request rate and watch requests flow along your arrows, with live per-node throughput, latency, and error-rate metrics.
- **Inject failures** — kill a node, degrade/slow a node, cut a connection, cool a cache, fill a queue — and watch the effects ripple through the system in real time.
- **Spike traffic** (e.g. a 10x surge) to stress-test autoscaling assumptions and find single points of failure.
- **Practice with guided scenarios** — a library of real interview-style prompts (URL shortener, rate limiter, chat app, news feed, ride-sharing dispatch, etc.), each with a self-review checklist and a timer.
- **Share or export your work without an account** — copy a read-only share link (the diagram is encoded directly into the URL) or export/import a `.porygon` JSON file.

## Using the app

1. Open the app and click **"Open the whiteboard"** (or go straight to `/design`) from the landing page.
2. Drag a component from the left-hand **component library** onto the canvas, or draw freehand with the standard Excalidraw tools.
3. Connect components with arrows to describe request flow (e.g. Client → Load Balancer → Servers → Cache → Database).
4. Select a node to open the **Inspector** panel and tune its stats (capacity, latency, etc.).
5. Open the **Simulation panel** and press **Simulate traffic** to run requests through your design and watch the live metrics panel (throughput, p99 latency, error rate) and per-node health coloring (healthy / strained / overloaded).
6. Use the **failure injection** controls to kill a node, cut a link, or spike traffic, and observe how the system responds.
7. Switch to **Practice mode** to work through a guided scenario prompt with a timer and checklist.
8. When you're done, use the **Sharing panel** to copy a read-only share link, or export a `.porygon` file to back up or move your diagram between devices. Import a previously exported `.porygon` file the same way.

Your diagram, versions, and onboarding state are saved automatically to your browser's local storage as you work — closing the tab won't lose your progress.

## Project structure

This is a pnpm monorepo:

```
porygon/
├── apps/
│   └── web/              # Next.js app — routes, landing page, the canvas UI, e2e tests
├── packages/
│   ├── canvas/           # Excalidraw integration + system-design element/graph extraction
│   ├── simulator/        # Traffic & failure simulation engine (framework-agnostic)
│   ├── icons/            # System-design component/icon catalog
│   └── ui/               # Shared UI panels (Inspector, Simulation, Practice, Sharing, etc.)
└── design/                # Static HTML mockups used as the visual reference
```

## Getting started

### Prerequisites

- Node.js
- [pnpm](https://pnpm.io/) 10.x (`packageManager` is pinned in [package.json](package.json))

### Install

```sh
pnpm install
```

### Run the app locally

```sh
pnpm dev
```

This starts the Next.js dev server for `@porygon/web` (default: http://localhost:3000).

### Build for production

```sh
pnpm build
```

### Run the end-to-end test suite

```sh
pnpm test:e2e
```

Tests live in [apps/web/e2e](apps/web/e2e), organized by implementation phase (foundation, component library, graph extraction, traffic simulation, failure injection, practice mode, sharing, landing page).

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Excalidraw** as the base canvas, extended with typed system-design elements
- A standalone **simulation engine** package that runs the traffic/failure model, executed off the main thread in a Web Worker
- **Playwright** for end-to-end testing

See [plan.md](plan.md) for the full product plan and phase-by-phase implementation roadmap.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get set up, the branch/PR workflow, and code style expectations.

## License

[MIT](LICENSE)
