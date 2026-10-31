import type { ReactNode } from "react";
import Link from "next/link";
import { getComponentById, type ComponentDef } from "@porygon/icons";
import "./landing.css";

const FEATURES: ReadonlyArray<{ color: string; glyph: string; title: string; body: string }> = [
  {
    color: "#4D7CFE",
    glyph: "✎",
    title: "Full Excalidraw canvas",
    body: "Infinite canvas, freehand drawing, bound arrows, and instant export — the whole drawing toolkit you already know, local-first: your diagrams never leave your browser.",
  },
  {
    color: "#16A34A",
    glyph: "▣",
    title: "Real system-design icons",
    body: "Load balancers, SQL & NoSQL databases, caches, queues, CDNs, and named AWS/GCP/Azure services — a complete component library you drag straight onto the canvas.",
  },
  {
    color: "#DC2626",
    glyph: "⚡",
    title: "Traffic & failure simulation",
    body: "Inject traffic spikes, kill a node, cool a cache, fill a queue, or cut a connection — then watch latency and load ripple through your design in real time.",
  },
  {
    color: "#8B5CF6",
    glyph: "▤",
    title: "Guided practice scenarios",
    body: "A library of real interview prompts — URL shortener, rate limiter, chat app, news feed, ride-sharing dispatch — each with a self-review checklist and a timer.",
  },
  {
    color: "#F59E0B",
    glyph: "◷",
    title: "Live health scoring",
    body: "Every node gets a health state — healthy, strained, overloaded — plus automatic single-point-of-failure detection as your design runs under load.",
  },
  {
    color: "#0EA5E9",
    glyph: "⇄",
    title: "Share without an account",
    body: "Export a .porygon file or copy a read-only share link — no sign-up, no server-side account, nothing to lose if you clear your browser except what you export.",
  },
];

const SHOWCASE_COMPONENT_IDS: readonly string[] = [
  "load-balancer",
  "server-vm",
  "postgresql",
  "mongodb",
  "redis-cache",
  "queue-sqs-style",
  "cdn-edge",
  "object-storage",
  "api-gateway",
  "client",
];

const PREVIEW_NODES: ReadonlyArray<{
  componentId: string;
  sub: string;
  pulse?: "healthy" | "strained";
}> = [
  { componentId: "client", sub: "12k rps" },
  { componentId: "load-balancer", sub: "92% cap", pulse: "strained" },
  { componentId: "server-vm", sub: "4 nodes", pulse: "healthy" },
  { componentId: "postgresql", sub: "6ms avg" },
];

export default function HomePage(): ReactNode {
  const showcaseComponents: ComponentDef[] = SHOWCASE_COMPONENT_IDS.map(
    (id) => getComponentById(id),
  ).filter((component): component is ComponentDef => component !== undefined);

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-badge">P</div>
          Porygon
        </div>
        <div className="landing-nav-spacer" />
        <Link href="/design" className="landing-btn-primary">
          Open the whiteboard — free, no sign-up
        </Link>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-eyebrow">⚡ Forked from Excalidraw, built for systems</div>
          <h1>
            Design systems on a whiteboard.
            <br />
            Then <span>watch them break.</span>
          </h1>
          <p>
            Porygon is a drag-and-drop whiteboard for system design — draw your architecture with
            load balancers, databases, caches and queues, then simulate real traffic, spikes and
            failures to see exactly what happens.
          </p>
          <div className="landing-hero-ctas">
            <Link href="/design" className="landing-btn-large-primary">
              ▶ Start a free design
            </Link>
            <a href="#features" className="landing-btn-large-ghost">
              See how it works
            </a>
          </div>

          <div className="landing-preview-wrap" aria-hidden="true">
            <div className="landing-preview-top">
              <div className="landing-preview-dot" style={{ background: "#FF5F57" }} />
              <div className="landing-preview-dot" style={{ background: "#FEBC2E" }} />
              <div className="landing-preview-dot" style={{ background: "#28C840" }} />
            </div>
            <div className="landing-preview-body">
              <div className="landing-preview-nodes">
                {PREVIEW_NODES.map((previewNode, index) => {
                  const component = getComponentById(previewNode.componentId);
                  if (!component) {
                    return null;
                  }
                  const pulseClass =
                    previewNode.pulse === "healthy"
                      ? " landing-node-pulse-healthy"
                      : previewNode.pulse === "strained"
                        ? " landing-node-pulse-strained"
                        : "";
                  return (
                    <div key={component.id} style={{ display: "contents" }}>
                      {index > 0 && <span className="landing-preview-arrow">→</span>}
                      <div className={`landing-preview-node${pulseClass}`}>
                        <div
                          className="landing-preview-node-icon"
                          style={{ background: component.color }}
                        >
                          {component.glyph}
                        </div>
                        <div className="landing-preview-node-label">{component.label}</div>
                        <div className="landing-preview-node-sub">{previewNode.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="landing-preview-panel">
                <div className="landing-preview-panel-title">Live metrics</div>
                <div className="landing-preview-metric">
                  <div className="landing-preview-metric-label">Throughput</div>
                  <div className="landing-preview-metric-value">12.4k rps</div>
                </div>
                <div className="landing-preview-metric">
                  <div className="landing-preview-metric-label">P99 latency</div>
                  <div className="landing-preview-metric-value">140 ms</div>
                </div>
                <div className="landing-preview-metric">
                  <div className="landing-preview-metric-label">Error rate</div>
                  <div className="landing-preview-metric-value">0.2%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features" style={{ background: "#FAFAFB" }}>
          <div className="landing-section-eyebrow">Why Porygon</div>
          <h2 className="landing-section-title">Everything a whiteboard needs — plus a pulse</h2>
          <p className="landing-section-sub">
            All the free-form drawing of Excalidraw, with a simulation layer that turns a static
            diagram into a living system you can stress-test.
          </p>

          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="landing-feature-card">
                <div className="landing-feature-icon" style={{ background: feature.color }}>
                  {feature.glyph}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>

          <div className="landing-icon-showcase">
            <h3>A component for every layer of your stack</h3>
            <p>Drag, drop, connect — simulate.</p>
            <div className="landing-icon-row">
              {showcaseComponents.map((component) => (
                <div key={component.id} className="landing-icon-tile">
                  <div className="landing-icon-tile-glyph" style={{ background: component.color }}>
                    {component.glyph}
                  </div>
                  <div className="landing-icon-tile-label">{component.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta-band">
          <h2>Stop guessing what happens under load.</h2>
          <p>
            Draw your architecture, press simulate, and find the single point of failure before an
            interviewer — or production — does.
          </p>
          <Link href="/design" className="landing-btn-large-primary">
            ▶ Start designing for free
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        Porygon is local-first — no accounts, nothing stored on a server unless you export it.
      </footer>
    </div>
  );
}
