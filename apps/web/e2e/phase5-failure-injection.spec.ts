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
 * Draws an arrow bound to two nodes. See phase3-graph-extraction.spec.ts
 * for why each draw deselects first, uses points offset from any earlier
 * arrow's exact endpoint, and waits after mouseup for the binding to settle.
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

async function selectPoint(page: Page, canvasBox: Box, x: number, y: number): Promise<void> {
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Selection" }).click({ force: true });
  await page.mouse.click(canvasBox.x + x, canvasBox.y + y);
  await page.waitForTimeout(150);
}

test.describe("failure injection & scenario presets", () => {
  test("the Black Friday Spike scenario multiplies traffic 10x", async ({ page }) => {
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
    await drawBoundArrow(page, box, client.x, client.y, server.x, server.y);

    await page.getByTestId("scenario-select").selectOption("black-friday-spike");
    await page.getByTestId("sim-play").click();

    // Base target is 2,000 rps; the spike scenario is a 10x multiplier, so
    // the client (the traffic source, unconstrained by any capacity below
    // it) should settle at 20,000 rps once fully ramped.
    const clientRps = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Client" })
      .locator('[data-testid$="-rps"]');
    await expect(clientRps).toHaveText("20,000 rps", { timeout: 15_000 });
  });

  test("kill-node turns a node dead with no downstream traffic, and cut-edge stops traffic across it", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    const client = { x: 260, y: 150 };
    const lb = { x: 500, y: 150 };
    const server = { x: 260, y: 400 };

    await dragComponentOntoCanvas(page, "client", box, client.x, client.y);
    await dragComponentOntoCanvas(page, "load-balancer", box, lb.x, lb.y);
    await dragComponentOntoCanvas(page, "server-vm", box, server.x, server.y);

    await drawBoundArrow(page, box, client.x - 20, client.y, lb.x - 20, lb.y);
    await drawBoundArrow(page, box, lb.x + 20, lb.y, server.x + 20, server.y);

    // Select the Load Balancer node and kill it.
    await selectPoint(page, box, lb.x, lb.y);
    await expect(page.getByTestId("inspector-label")).toHaveText("Load Balancer");
    await page.getByTestId("failure-kill-node").click();
    await expect(page.getByTestId("failure-kill-node")).toHaveText("Kill node (active)");

    await page.getByTestId("sim-play").click();

    const lbRow = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Load Balancer" });
    await expect(lbRow.locator('[data-testid$="-status"]')).toHaveText("dead", { timeout: 15_000 });
    await expect(lbRow.locator('[data-testid$="-rps"]')).toHaveText("0 rps");

    // Server / VM is only reachable through the dead Load Balancer, so it
    // never receives any traffic either.
    const serverRps = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Server / VM" })
      .locator('[data-testid$="-rps"]');
    await expect(serverRps).toHaveText("0 rps");

    // Reset clears every active failure, so the Load Balancer is no longer
    // killed — confirm that, then cut the LB -> Server edge instead.
    await page.getByTestId("sim-reset").click();
    await expect(page.getByTestId("simulation-status")).toHaveText("Simulation: idle");
    await selectPoint(page, box, lb.x, lb.y);
    await expect(page.getByTestId("failure-kill-node")).toHaveText("Kill node");

    await selectPoint(page, box, (lb.x + 20 + server.x + 20) / 2, (lb.y + server.y) / 2);
    await expect(page.getByTestId("inspector")).toContainText("Connection selected.");
    await page.getByTestId("failure-cut-edge").click();
    await expect(page.getByTestId("failure-cut-edge")).toHaveText("Cut edge (active)");

    await page.getByTestId("sim-play").click();

    const lbRpsAfterCut = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Load Balancer" })
      .locator('[data-testid$="-rps"]');
    await expect(lbRpsAfterCut).not.toHaveText("0 rps", { timeout: 15_000 });

    const serverRpsAfterCut = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Server / VM" })
      .locator('[data-testid$="-rps"]');
    await expect(serverRpsAfterCut).toHaveText("0 rps");
  });

  test("a node's own Max RPS caps what it forwards downstream (real backpressure)", async ({ page }) => {
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
    // Offset from each node's exact center (as in the kill-node test above)
    // so the arrow doesn't sit directly on top of either node and can't be
    // mistakenly selected instead of the node itself.
    await drawBoundArrow(page, box, client.x - 20, client.y, server.x - 20, server.y);

    // Cap the client's own Max RPS well below the default scenario's
    // target rate, so it can only ever forward a fraction of what it's
    // offered.
    await selectPoint(page, box, client.x, client.y);
    await expect(page.getByTestId("inspector-label")).toHaveText("Client");
    const maxRpsInput = page.getByTestId("inspector-edit-max-rps");
    await maxRpsInput.fill("200");
    await maxRpsInput.blur();
    await expect(page.getByTestId("inspector-max-rps")).toHaveText("200");

    await page.getByTestId("sim-play").click();

    // Client is genuinely offered the full target rate, so it legitimately
    // shows as overloaded at 10x its own capacity.
    const clientRow = page.getByTestId("simulation-node-list").locator("li").filter({ hasText: "Client" });
    await expect(clientRow.locator('[data-testid$="-status"]')).toHaveText("overloaded", { timeout: 15_000 });

    // Server / VM should only ever receive what Client could actually
    // forward (200 rps, its capped capacity) — not the full upstream
    // demand — and so should be healthy, not falsely overloaded.
    const serverRow = page.getByTestId("simulation-node-list").locator("li").filter({ hasText: "Server / VM" });
    await expect(serverRow.locator('[data-testid$="-rps"]')).toHaveText("200 rps", { timeout: 15_000 });
    await expect(serverRow.locator('[data-testid$="-status"]')).toHaveText("healthy");
  });
});
