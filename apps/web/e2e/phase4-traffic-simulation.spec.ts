import { expect, test, type Page } from "@playwright/test";

interface Box {
  x: number;
  y: number;
}

/**
 * Drags a sidebar chip onto the canvas at a scene-relative offset. See
 * phase2-component-library.spec.ts for why Playwright's native dragTo (not
 * a synthetic DragEvent) is required here.
 */
async function dragComponentOntoCanvas(
  page: Page,
  componentId: string,
  canvasBox: Box,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  const canvas = page.locator("canvas.excalidraw__canvas.interactive").first();
  const chip = page.getByTestId(`component-chip-${componentId}`);
  await chip.scrollIntoViewIfNeeded();
  await chip.dragTo(canvas, {
    targetPosition: { x: offsetX, y: offsetY },
    timeout: 8_000,
  });
  await page.waitForTimeout(150);
}

/**
 * Draws an arrow bound to two nodes by dragging from inside one to inside
 * the other with the Arrow tool active. See phase3-graph-extraction.spec.ts
 * for why each draw deselects first and uses a point offset from any
 * earlier arrow's exact endpoint.
 */
async function drawBoundArrow(
  page: Page,
  canvasBox: Box,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Promise<void> {
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Arrow" }).click({ force: true });
  await page.mouse.move(canvasBox.x + fromX, canvasBox.y + fromY);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + (fromX + toX) / 2, canvasBox.y + (fromY + toY) / 2, {
    steps: 10,
  });
  await page.mouse.move(canvasBox.x + toX, canvasBox.y + toY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

test.describe("traffic simulation", () => {
  test("simulating a 3-node chain live-updates node status/RPS/latency, pause freezes it, reset clears it", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    // x stays clear of Excalidraw's own tool-options panel (see
    // phase3-graph-extraction.spec.ts for why).
    const client = { x: 260, y: 150 };
    const lb = { x: 500, y: 150 };
    const server = { x: 260, y: 400 };

    await dragComponentOntoCanvas(page, "client", box, client.x, client.y);
    await dragComponentOntoCanvas(page, "load-balancer", box, lb.x, lb.y);
    await dragComponentOntoCanvas(page, "server-vm", box, server.x, server.y);

    await drawBoundArrow(page, box, client.x - 20, client.y, lb.x - 20, lb.y);
    await drawBoundArrow(page, box, lb.x + 20, lb.y, server.x + 20, server.y);

    // Server / VM has the smallest capacity in this chain (2,000 max RPS
    // vs. the client's 5,000 and the load balancer's 50,000), so it's the
    // one guaranteed to escalate from healthy to overloaded as the
    // simulator ramps traffic up to its 2,000 RPS default target.
    const serverRow = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Server / VM" });

    await expect(page.getByTestId("simulation-overview")).toHaveCount(0);

    await page.getByTestId("sim-play").click();
    await expect(page.getByTestId("simulation-status")).toHaveText("Simulation: running");

    const serverStatus = serverRow.locator('[data-testid$="-status"]');
    await expect(serverStatus).toHaveText("overloaded", { timeout: 20_000 });

    const serverRps = serverRow.locator('[data-testid$="-rps"]');
    await expect(serverRps).not.toHaveText("0 rps");

    // The brief overview above the per-node list should match: Client and
    // Load Balancer stay well under capacity, only Server / VM tips over.
    const overview = page.getByTestId("simulation-overview");
    await expect(overview).toContainText("3 nodes");
    await expect(overview).toContainText("2 healthy, 0 strained, 1 overloaded");
    await expect(overview).toContainText("watch: Server / VM");

    await page.getByTestId("sim-pause").click();
    await expect(page.getByTestId("simulation-status")).toHaveText("Simulation: paused");
    const frozenStatus = await serverStatus.textContent();
    const frozenRps = await serverRps.textContent();
    await page.waitForTimeout(700);
    await expect(serverStatus).toHaveText(frozenStatus ?? "");
    await expect(serverRps).toHaveText(frozenRps ?? "");

    await page.getByTestId("sim-reset").click();
    await expect(page.getByTestId("simulation-status")).toHaveText("Simulation: idle");
    await expect(page.getByTestId("simulation-node-list")).toHaveCount(0);
    await expect(page.getByTestId("simulation-overview")).toHaveCount(0);
  });

  test("multiple client nodes are each treated as an independent traffic source", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    // Two separate client -> server chains, with no edge connecting them,
    // so each server's traffic can only have come from its own client.
    const clientA = { x: 260, y: 150 };
    const serverA = { x: 260, y: 400 };
    const clientB = { x: 550, y: 150 };
    const serverB = { x: 550, y: 400 };

    await dragComponentOntoCanvas(page, "client", box, clientA.x, clientA.y);
    await dragComponentOntoCanvas(page, "server-vm", box, serverA.x, serverA.y);
    await dragComponentOntoCanvas(page, "client", box, clientB.x, clientB.y);
    await dragComponentOntoCanvas(page, "postgresql", box, serverB.x, serverB.y);

    await drawBoundArrow(page, box, clientA.x, clientA.y, serverA.x, serverA.y);
    await drawBoundArrow(page, box, clientB.x, clientB.y, serverB.x, serverB.y);

    // Multiple "client" nodes are a deliberate, supported traffic setup —
    // the graph debug panel shouldn't flag them as ambiguous entry points.
    await page.getByTestId("debug-panel-toggle").click();
    await expect(page.getByTestId("debug-warning-ambiguous-sources")).toHaveCount(0);
    await page.getByTestId("debug-panel-toggle").click();

    const serverARps = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Server / VM" })
      .locator('[data-testid$="-rps"]');
    const serverBRps = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "PostgreSQL" })
      .locator('[data-testid$="-rps"]');

    await page.getByTestId("sim-play").click();

    // Before the fix, only the first client in scene order fed any traffic
    // downstream — the second client's chain stayed at "0 rps" forever.
    await expect(serverARps).not.toHaveText("0 rps", { timeout: 10_000 });
    await expect(serverBRps).not.toHaveText("0 rps", { timeout: 10_000 });
  });

  test("hovering a node while simulating shows its incoming/outgoing traffic and health as a tooltip", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    const client = { x: 260, y: 150 };
    const server = { x: 260, y: 400 };

    await dragComponentOntoCanvas(page, "client", box, client.x, client.y);
    await dragComponentOntoCanvas(page, "server-vm", box, server.x, server.y);
    await drawBoundArrow(page, box, client.x - 20, client.y, server.x - 20, server.y);

    // The arrow-drawing step above leaves the cursor sitting on the Server
    // node; move it somewhere empty first so "no tooltip" is a real check.
    await page.mouse.move(box.x + 450, box.y + 450, { steps: 5 });
    await expect(page.getByTestId("node-hover-tooltip")).toHaveCount(0);

    await page.getByTestId("sim-play").click();
    const serverStatus = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Server / VM" })
      .locator('[data-testid$="-status"]');
    await expect(serverStatus).toHaveText("overloaded", { timeout: 20_000 });

    await page.mouse.move(box.x + server.x, box.y + server.y, { steps: 5 });
    const tooltip = page.getByTestId("node-hover-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Server / VM");
    await expect(page.getByTestId("node-hover-tooltip-incoming")).toHaveText("2,000 rps");
    // Server / VM has no outgoing edges here, so nothing is forwarded
    // regardless of its own capacity.
    await expect(page.getByTestId("node-hover-tooltip-outgoing")).toHaveText("0 rps");
    await expect(page.getByTestId("node-hover-tooltip-health")).toHaveText("overloaded");

    // Moving off the node clears the tooltip.
    await page.mouse.move(box.x + 50, box.y + 50, { steps: 5 });
    await expect(page.getByTestId("node-hover-tooltip")).toHaveCount(0);
  });

  test("the chevron collapses and expands the simulation panel", async ({ page }) => {
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });

    const toggle = page.getByTestId("simulation-collapse-toggle");
    const scenarioField = page.getByTestId("scenario-select");

    // Expanded by default.
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(scenarioField).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(scenarioField).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(scenarioField).toBeVisible();
  });

  test("a Mobile App node is treated as a traffic source alongside Client", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    const client = { x: 260, y: 150 };
    const mobileApp = { x: 550, y: 150 };
    const server = { x: 400, y: 400 };

    await dragComponentOntoCanvas(page, "client", box, client.x, client.y);
    await dragComponentOntoCanvas(page, "mobile-app", box, mobileApp.x, mobileApp.y);
    await dragComponentOntoCanvas(page, "server-vm", box, server.x, server.y);

    await drawBoundArrow(page, box, client.x, client.y, server.x - 20, server.y);
    await drawBoundArrow(page, box, mobileApp.x, mobileApp.y, server.x + 20, server.y);

    await page.getByTestId("sim-play").click();

    // Before the fix, only componentId "client" counted as a source, so
    // Mobile App's own row stayed stuck at 0 rps forever despite having no
    // incoming edges of its own.
    const mobileAppRps = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Mobile App" })
      .locator('[data-testid$="-rps"]');
    await expect(mobileAppRps).not.toHaveText("0 rps", { timeout: 15_000 });
  });

  test("the simulation panel header stays pinned while the body scrolls, with no horizontal overflow", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    // A dozen nodes is more than enough to force the node list taller than
    // the panel's max-height, so its body actually has something to scroll.
    // Kept inside a tight grid near the canvas's own top-left — the canvas
    // viewport here is narrower than the full window, and a drop target off
    // its visible area lands under (and is blocked by) the Inspector panel.
    const positions = Array.from({ length: 12 }, (_, i) => ({
      x: 170 + (i % 3) * 170,
      y: 130 + Math.floor(i / 3) * 110,
    }));
    for (const pos of positions) {
      await dragComponentOntoCanvas(page, "client", box, pos.x, pos.y);
    }

    await page.getByTestId("sim-play").click();
    await expect(page.getByTestId("simulation-node-list").locator("li")).toHaveCount(12, {
      timeout: 15_000,
    });

    const panel = page.getByTestId("simulation-panel");
    const header = page.getByTestId("simulation-status");

    // No element inside the panel should be wider than the panel itself —
    // that's exactly what forces a horizontal scrollbar.
    const overflowsHorizontally = await panel.evaluate(
      (el: HTMLElement): boolean => el.scrollWidth > el.clientWidth,
    );
    expect(overflowsHorizontally).toBe(false);

    const headerTopBefore = (await header.boundingBox())?.y;
    await page.getByTestId("simulation-panel-body").evaluate((el: HTMLElement): void => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(100);
    const headerTopAfter = (await header.boundingBox())?.y;

    // The header's screen position shouldn't move at all once the body has
    // scrolled — before the fix, the whole panel (header included) was one
    // scroll container, so scrolling the list also scrolled the header out
    // of view.
    expect(headerTopAfter).toBe(headerTopBefore);
  });
});
