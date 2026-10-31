import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { getComponentById, type ComponentDef } from "@p0rygon/icons";
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
    body: "Export a .p0rygon file or copy a read-only share link — no sign-up, no server-side account, nothing to lose if you clear your browser except what you export.",
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

// Positions are percentages of the canvas region's own box (the flex
// sibling of the rail, viewBox-matched by the SVG arrows below at 6.5x/3x
// scale — 650x300 local units). The cursor/ghost/ripple elements live in
// this same box (see below), so their landing.css keyframes use the same
// percentages as the Client/Cache node positions here.
const RICH_NODES: ReadonlyArray<{
  componentId: string;
  sub: string;
  leftPct: number;
  topPct: number;
  extraClass?: string;
}> = [
  { componentId: "client", sub: "12k rps", leftPct: 10, topPct: 44.3 },
  { componentId: "cdn-edge", sub: "96% hit", leftPct: 30, topPct: 10 },
  {
    componentId: "load-balancer",
    sub: "92% cap",
    leftPct: 30,
    topPct: 78.7,
    extraClass: "landing-rich-node-lb",
  },
  {
    componentId: "server-vm",
    sub: "4 nodes",
    leftPct: 50,
    topPct: 44.3,
    extraClass: "landing-rich-node-servers",
  },
  {
    componentId: "redis-cache",
    sub: "reads",
    leftPct: 70,
    topPct: 44.3,
    extraClass: "landing-rich-node-dropped",
  },
  { componentId: "postgresql", sub: "6ms avg", leftPct: 90, topPct: 44.3 },
];

const RICH_PACKETS: ReadonlyArray<{ sx: number; sy: number; ex: number; ey: number; delay: number }> = [
  { sx: 10, sy: 44.3, ex: 30, ey: 10, delay: 0 },
  { sx: 10, sy: 44.3, ex: 30, ey: 78.7, delay: 0.15 },
  { sx: 30, sy: 78.7, ex: 50, ey: 44.3, delay: 0.3 },
  { sx: 50, sy: 44.3, ex: 70, ey: 44.3, delay: 0.45 },
  { sx: 70, sy: 44.3, ex: 90, ey: 44.3, delay: 0.6 },
];

const RICH_RAIL_COLORS: readonly string[] = ["#4D7CFE", "#6B7280", "#16A34A", "#F59E0B"];

export default function HomePage(): ReactNode {
  const showcaseComponents: ComponentDef[] = SHOWCASE_COMPONENT_IDS.map((id) => getComponentById(id)).filter(
    (component): component is ComponentDef => component !== undefined,
  );

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-badge">P</div>
          P0rygon
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
            P0rygon is a drag-and-drop whiteboard for system design — draw your architecture with load balancers, databases, caches and queues, then
            simulate real traffic, spikes and failures to see exactly what happens.
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
            {/* Mobile fallback: a simple, static row of nodes with a gentle
                color pulse — verified not to overflow at narrow widths. */}
            <div className="landing-preview-body landing-preview-simple">
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
                        <div className="landing-preview-node-icon" style={{ background: component.color }}>
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

            {/* Tablet width and up: the full animated demo — drag a Cache
                node in from the sidebar, watch it wire up, then Simulate
                fires a traffic spike. */}
            <div className="landing-preview-body landing-preview-rich">
              <div className="landing-preview-stage">
                <div className="landing-preview-rail">
                  {RICH_RAIL_COLORS.map((color) => (
                    <div key={color} className="landing-preview-rail-chip" style={{ background: color }} />
                  ))}
                </div>

                <div className="landing-preview-canvas">
                  <svg className="landing-rich-arrows" viewBox="0 0 650 300" preserveAspectRatio="none">
                    <defs>
                      <marker id="richArrowHead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                        <path d="M0,0 L7,3.5 L0,7 z" fill="#C7CAD1" />
                      </marker>
                    </defs>
                    <path d="M 65 132.9 L 195 30" stroke="#C7CAD1" strokeWidth="2" fill="none" markerEnd="url(#richArrowHead)" />
                    <path d="M 65 132.9 L 195 236.1" stroke="#C7CAD1" strokeWidth="2" fill="none" markerEnd="url(#richArrowHead)" />
                    <path d="M 195 236.1 L 325 132.9" stroke="#C7CAD1" strokeWidth="2" fill="none" markerEnd="url(#richArrowHead)" />
                    <path
                      className="landing-rich-arrow-pending"
                      d="M 325 132.9 L 455 132.9"
                      stroke="#C7CAD1"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#richArrowHead)"
                    />
                    <path
                      className="landing-rich-arrow-pending"
                      d="M 455 132.9 L 585 132.9"
                      stroke="#C7CAD1"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#richArrowHead)"
                    />
                  </svg>

                  {RICH_NODES.map((node) => {
                    const component = getComponentById(node.componentId);
                    if (!component) {
                      return null;
                    }
                    return (
                      <div
                        key={node.componentId}
                        className={`landing-rich-node${node.extraClass ? ` ${node.extraClass}` : ""}`}
                        style={{ left: `${node.leftPct}%`, top: `${node.topPct}%` }}
                      >
                        <div className="landing-preview-node-icon" style={{ background: component.color }}>
                          {component.glyph}
                        </div>
                        <div className="landing-preview-node-label">{component.label}</div>
                        <div className="landing-preview-node-sub">{node.sub}</div>
                      </div>
                    );
                  })}

                  <div className="landing-traffic-layer">
                    {RICH_PACKETS.map((packet, index) => (
                      <div
                        key={index}
                        className="landing-packet"
                        style={
                          {
                            "--sx": `${packet.sx}%`,
                            "--sy": `${packet.sy}%`,
                            "--ex": `${packet.ex}%`,
                            "--ey": `${packet.ey}%`,
                            "--delay": `${packet.delay}s`,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>

                  {/* Cursor/ripple/ghost share the canvas's own coordinate
                      space (not the rail+canvas stage) so they stay in sync
                      with the node positions above at every viewport width. */}
                  <div className="landing-demo-cursor">
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                      <path d="M1 1 L1 15 L4.6 11.6 L7 17 L9.4 16 L7 10.6 L12 10.6 Z" fill="#1B1B1F" stroke="white" strokeWidth="1" />
                    </svg>
                  </div>
                  <div className="landing-click-ripple" />
                  <div className="landing-ghost-node">
                    <div className="landing-preview-node-icon">⚡</div>
                    <div className="landing-preview-node-label">Cache</div>
                  </div>
                </div>
              </div>

              <div className="landing-preview-panel">
                <div className="landing-rich-status">
                  <span className="landing-v-calm" style={{ color: "#16A34A" }}>
                    Idle
                  </span>
                  <span className="landing-v-spike" style={{ color: "#DC2626" }}>
                    Simulating 10x spike
                  </span>
                </div>
                <div className="landing-sim-btn-demo">▶ Simulate traffic</div>
                <div className="landing-preview-panel-title" style={{ marginTop: 4 }}>
                  Live metrics
                </div>
                <div className="landing-preview-metric">
                  <div className="landing-preview-metric-label">Throughput</div>
                  <div className="landing-rich-metric-value">
                    <span className="landing-v-calm">12.4k rps</span>
                    <span className="landing-v-spike">38.2k rps</span>
                  </div>
                </div>
                <div className="landing-preview-metric">
                  <div className="landing-preview-metric-label">P99 latency</div>
                  <div className="landing-rich-metric-value">
                    <span className="landing-v-calm">140 ms</span>
                    <span className="landing-v-spike" style={{ color: "#DC2626" }}>
                      820 ms
                    </span>
                  </div>
                </div>
                <div className="landing-preview-metric">
                  <div className="landing-preview-metric-label">Error rate</div>
                  <div className="landing-rich-metric-value">
                    <span className="landing-v-calm" style={{ color: "#16A34A" }}>
                      0.2%
                    </span>
                    <span className="landing-v-spike" style={{ color: "#DC2626" }}>
                      4.7%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features" style={{ background: "#FAFAFB" }}>
          <div className="landing-section-eyebrow">Why P0rygon</div>
          <h2 className="landing-section-title">Everything a whiteboard needs — plus a pulse</h2>
          <p className="landing-section-sub">
            All the free-form drawing of Excalidraw, with a simulation layer that turns a static diagram into a living system you can stress-test.
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
          <p>Draw your architecture, press simulate, and find the single point of failure before an interviewer — or production — does.</p>
          <Link href="/design" className="landing-btn-large-primary">
            ▶ Start designing for free
          </Link>
        </section>
      </main>

      <footer className="landing-footer">P0rygon is local-first — no accounts, nothing stored on a server unless you export it.</footer>
    </div>
  );
}
