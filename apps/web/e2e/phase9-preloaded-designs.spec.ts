import { expect, test } from "@playwright/test";

test.describe("preloaded system-design templates", () => {
  test("the panel lists every preset and opening it closes Practice mode (shared flyout slot)", async ({
    page,
  }) => {
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });

    await page.getByTestId("practice-panel-toggle").click();
    await expect(page.getByTestId("practice-panel")).toBeVisible();

    await page.getByTestId("templates-panel-toggle").click();
    await expect(page.getByTestId("templates-panel")).toBeVisible();
    // Both flyouts render in the same top-left slot, so only one should be
    // open at a time — opening Templates should have closed Practice mode.
    await expect(page.getByTestId("practice-panel")).toHaveCount(0);

    const items = page.getByTestId("templates-list").locator("li");
    await expect(items).toHaveCount(6);
    for (const presetId of [
      "url-shortener",
      "rate-limited-api",
      "realtime-chat",
      "ecommerce-order-processing",
      "video-streaming",
      "social-media-feed",
    ]) {
      await expect(page.getByTestId(`template-${presetId}`)).toBeVisible();
    }
  });

  test("loading a preset builds a correctly wired, simulatable graph and replaces whatever was on the canvas", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });

    // Something already on the canvas, to prove loading a preset replaces
    // it rather than appending alongside it.
    const interactiveCanvas = page.locator("canvas.excalidraw__canvas.interactive").first();
    const chip = page.getByTestId("component-chip-client");
    await chip.dragTo(interactiveCanvas, { targetPosition: { x: 260, y: 150 }, timeout: 8_000 });
    await page.waitForTimeout(150);

    await page.getByTestId("templates-panel-toggle").click();
    await page.getByTestId("template-load-url-shortener").click();

    // The panel closes itself once a preset is loaded.
    await expect(page.getByTestId("templates-panel")).toHaveCount(0);

    await page.getByTestId("debug-panel-toggle").click();
    const edgeList = page.getByTestId("debug-panel");
    await expect(edgeList).toContainText("Client → API Gateway");
    await expect(edgeList).toContainText("API Gateway → Server / VM");
    await expect(edgeList).toContainText("Server / VM → Redis Cache");
    await expect(edgeList).toContainText("Server / VM → Primary DB");
    // Exactly the preset's 5 nodes — the pre-existing lone Client got
    // replaced, not kept alongside the preset's own Client.
    await expect(page.getByTestId("debug-node-count")).toHaveText("5");

    await page.getByTestId("sim-play").click();
    const serverRow = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Server / VM" });
    await expect(serverRow.locator('[data-testid$="-status"]')).toHaveText("overloaded", {
      timeout: 15_000,
    });
    // Server / VM's capacity (2,000) is split evenly across its two
    // outgoing edges (Redis Cache, Primary DB), so each gets half of
    // whatever Server / VM could actually forward.
    const cacheRps = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Redis Cache" })
      .locator('[data-testid$="-rps"]');
    await expect(cacheRps).toHaveText("1,000 rps");
  });
});
