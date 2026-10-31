import { expect, test, type Page } from "@playwright/test";

interface Box {
  x: number;
  y: number;
}

/**
 * Drags a sidebar chip onto the canvas at a scene-relative offset, using
 * Playwright's native drag gesture (see phase2-component-library.spec.ts for
 * why this, and not a synthetic DragEvent, is required).
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
  // dragTo only waits for the browser's drag gesture, not for our drop
  // handler's api.updateScene() to flush — see phase2's helper for detail.
  await page.waitForTimeout(150);
}

/**
 * Draws an arrow by dragging from inside one node to inside another with
 * the Arrow tool active. Starting/ending the drag directly over a shape (not
 * just near its edge) is what makes Excalidraw bind the arrow's start/end to
 * that shape, regardless of the path between.
 */
async function drawBoundArrow(
  page: Page,
  canvasBox: Box,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Promise<void> {
  // Deselect first: starting a new drag exactly on a point an earlier
  // arrow already bound to (the shared node) can grab that arrow's
  // endpoint handle instead of starting a fresh one.
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Arrow" }).click({ force: true });
  await page.mouse.move(canvasBox.x + fromX, canvasBox.y + fromY);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + (fromX + toX) / 2, canvasBox.y + (fromY + toY) / 2, {
    steps: 10,
  });
  await page.mouse.move(canvasBox.x + toX, canvasBox.y + toY, { steps: 10 });
  await page.mouse.up();
  // Excalidraw resolves the final binding (and fires onChange with it)
  // slightly after the mouseup event itself; 150ms wasn't always enough
  // margin before immediately reading the extracted graph afterward.
  await page.waitForTimeout(400);
}

test.describe("graph extraction & debug panel", () => {
  test("Client -> LB -> Server -> DB produces a correct extracted graph, and a disconnected node triggers a warning", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    // x stays clear of Excalidraw's own tool-options panel, which floats
    // over the canvas's left edge (roughly x:14-220) whenever a drawing
    // tool like Arrow is active — a mousedown there hits the panel, not
    // the canvas, and silently draws nothing.
    const client = { x: 260, y: 150 };
    const lb = { x: 500, y: 150 };
    const server = { x: 260, y: 400 };
    const db = { x: 500, y: 400 };

    await dragComponentOntoCanvas(page, "client", box, client.x, client.y);
    await dragComponentOntoCanvas(page, "load-balancer", box, lb.x, lb.y);
    await dragComponentOntoCanvas(page, "server-vm", box, server.x, server.y);
    await dragComponentOntoCanvas(page, "postgresql", box, db.x, db.y);

    // Each arrow starts/ends a little off the previous arrow's exact
    // endpoint (still well inside the target node) so a new drag doesn't
    // grab an existing arrow's point handle instead of creating a fresh one.
    await drawBoundArrow(page, box, client.x - 20, client.y, lb.x - 20, lb.y);
    await drawBoundArrow(page, box, lb.x + 20, lb.y, server.x + 20, server.y);
    await drawBoundArrow(page, box, server.x - 20, server.y, db.x - 20, db.y);

    await page.getByTestId("debug-panel-toggle").click();
    const debugPanel = page.getByTestId("debug-panel");
    await expect(debugPanel).toBeVisible();

    await expect(page.getByTestId("debug-node-count")).toHaveText("4");

    const edgeItems = page.getByTestId("debug-edge-list").locator("li");
    await expect(edgeItems).toHaveCount(3);
    await expect(edgeItems.nth(0)).toHaveText("Client → Load Balancer");
    await expect(edgeItems.nth(1)).toHaveText("Load Balancer → Server / VM");
    await expect(edgeItems.nth(2)).toHaveText("Server / VM → PostgreSQL");

    await expect(page.getByTestId("debug-warnings")).toHaveCount(0);

    // close the panel so it doesn't overlap the drop point, then add an
    // isolated node with no arrows touching it
    await page.getByTestId("debug-panel-toggle").click();
    await dragComponentOntoCanvas(page, "mongodb", box, 650, 600);

    await page.getByTestId("debug-panel-toggle").click();
    await expect(page.getByTestId("debug-node-count")).toHaveText("5");
    await expect(page.getByTestId("debug-warning-disconnected-node")).toHaveText(
      '"MongoDB" has no connections.',
    );
  });
});
