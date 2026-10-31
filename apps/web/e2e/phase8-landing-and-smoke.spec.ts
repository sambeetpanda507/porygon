import { expect, test, type Page } from "@playwright/test";

interface Box {
  x: number;
  y: number;
}

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

test.describe("landing page & full happy-path smoke test", () => {
  test("landing page renders and links to the whiteboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Design systems");
    await expect(page.getByTestId("onboarding-tooltip")).toHaveCount(0);

    const openWhiteboard = page.getByRole("link", { name: /open the whiteboard/i });
    await expect(openWhiteboard).toBeVisible();
    await openWhiteboard.click();
    await page.waitForURL(/\/design/);
    await page.locator("canvas.excalidraw__canvas").first().waitFor({ state: "visible" });
  });

  test("landing page has no horizontal overflow at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    const openWhiteboard = page.getByRole("link", { name: /open the whiteboard/i });
    await expect(openWhiteboard).toBeVisible();
    const box = await openWhiteboard.boundingBox();
    expect(box).not.toBeNull();
    // The CTA must stay inside the viewport, not clipped off the right edge.
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  });

  test("new canvas shows an onboarding hint that dismisses once you start building", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    await expect(page.getByTestId("onboarding-tooltip")).toBeVisible();

    await dragComponentOntoCanvas(page, "client", box, 300, 300);
    await expect(page.getByTestId("onboarding-tooltip")).toHaveCount(0);

    // It stays dismissed across a reload, too.
    await page.reload();
    await canvas.waitFor({ state: "visible" });
    await expect(page.getByTestId("onboarding-tooltip")).toHaveCount(0);
  });

  test("full happy path: drag components, connect them, simulate, and share", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/");
    await page.getByRole("link", { name: /open the whiteboard/i }).click();
    await page.waitForURL(/\/design/);
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    const client = { x: 300, y: 300 };
    const server = { x: 300, y: 500 };
    await dragComponentOntoCanvas(page, "client", box, client.x, client.y);
    await dragComponentOntoCanvas(page, "server-vm", box, server.x, server.y);

    await page.keyboard.press("Escape");
    await page.getByRole("radio", { name: "Arrow" }).click({ force: true });
    await page.mouse.move(box.x + client.x, box.y + client.y);
    await page.mouse.down();
    await page.mouse.move(box.x + client.x, box.y + (client.y + server.y) / 2, { steps: 10 });
    await page.mouse.move(box.x + server.x, box.y + server.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    await page.getByTestId("sim-play").click();
    await expect(page.getByTestId("simulation-status")).toHaveText("Simulation: running");
    const serverRps = page
      .getByTestId("simulation-node-list")
      .locator("li")
      .filter({ hasText: "Server / VM" })
      .locator('[data-testid$="-rps"]');
    await expect(serverRps).not.toHaveText("0 rps", { timeout: 15_000 });
    await page.getByTestId("sim-reset").click();

    await page.evaluate(() => {
      (window as unknown as { __copiedText?: string }).__copiedText = undefined;
      navigator.clipboard.writeText = async (text: string): Promise<void> => {
        (window as unknown as { __copiedText?: string }).__copiedText = text;
      };
    });
    await page.getByTestId("sharing-panel-toggle").click();
    await page.getByTestId("copy-share-link").click();
    const shareUrl: string | undefined = await page.evaluate(
      () => (window as unknown as { __copiedText?: string }).__copiedText,
    );
    expect(shareUrl).toContain("/design?share=");
  });
});
