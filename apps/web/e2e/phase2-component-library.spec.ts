import { expect, test, type Page } from "@playwright/test";

/**
 * Drags a sidebar chip onto the canvas using Playwright's native drag
 * gesture (`locator.dragTo`), which drives real CDP-level input — this is
 * what actually triggers Chromium's native HTML5 drag-and-drop. A
 * mouse down/move/up sequence, or manually dispatched DragEvents with a
 * hand-built DataTransfer, do not: Chromium only grants readable
 * `DataTransfer.getData()` inside a handler for a *genuine* drag session.
 *
 * The drop target must be Excalidraw's top `interactive` canvas layer, not
 * its `static` content canvas underneath — the interactive one is what
 * actually receives pointer/drag events.
 */
async function dragComponentOntoCanvas(
  page: Page,
  componentId: string,
  dropClientX: number,
  dropClientY: number,
): Promise<void> {
  const canvas = page.locator("canvas.excalidraw__canvas.interactive").first();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("interactive canvas has no bounding box");

  const chip = page.getByTestId(`component-chip-${componentId}`);
  await chip.scrollIntoViewIfNeeded();
  await chip.dragTo(canvas, {
    targetPosition: {
      x: dropClientX - canvasBox.x,
      y: dropClientY - canvasBox.y,
    },
    timeout: 8_000,
  });

  // Our drop handler calls the Excalidraw imperative API's updateScene(),
  // which schedules a React state update rather than applying synchronously.
  // dragTo() only waits for the browser's drag gesture to finish, not for
  // that update to flush — clicking immediately after can race Excalidraw's
  // own hit-testing data for the just-added element.
  await page.waitForTimeout(150);
}

test.describe("component library: search, drag onto canvas, inspect", () => {
  test("searching filters the sidebar to matching components only", async ({ page }) => {
    await page.goto("/design");
    await page.getByTestId("component-search").fill("lambda");

    await expect(page.getByTestId("component-chip-aws-lambda")).toBeVisible();
    await expect(page.getByTestId("component-chip-load-balancer")).toHaveCount(0);
  });

  test("dragging a known component onto the canvas creates an inspectable node", async ({
    page,
  }) => {
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    const dropX = box.x + 600;
    const dropY = box.y + 300;

    await dragComponentOntoCanvas(page, "load-balancer", dropX, dropY);
    await page.mouse.click(dropX, dropY);

    await expect(page.getByTestId("inspector-label")).toHaveText("Load Balancer");
    await expect(page.getByTestId("inspector-max-rps")).toHaveText("50,000");
  });

  test("one representative component per category drags, selects, and inspects correctly", async ({
    page,
  }) => {
    // 13 categories x a real drag gesture + settle wait each comfortably
    // exceeds the default 30s test timeout.
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    // one representative {id, label} per category, read straight off the
    // rendered sidebar rather than importing the catalog package
    const representatives: Array<{ categoryLabel: string; id: string; label: string }> =
      await page.evaluate(() => {
        const categoryEls = Array.from(document.querySelectorAll(".category"));
        return categoryEls.map((categoryEl) => {
          const categoryLabel = categoryEl.querySelector(".category-label")?.textContent ?? "";
          const chip = categoryEl.querySelector("[data-testid^='component-chip-']");
          const id = chip?.getAttribute("data-testid")?.replace("component-chip-", "") ?? "";
          const label = chip?.querySelector(".icon-label")?.textContent ?? "";
          return { categoryLabel, id, label };
        });
      });

    expect(representatives.length).toBeGreaterThanOrEqual(13);

    // 4x4 grid of drop points, kept well within the ~748px-wide canvas
    // (sidebar + inspector eat most of a 1280px test viewport) so dragTo's
    // target position never lands outside the interactive canvas element.
    // Clicking an empty spot on the canvas's right edge, vertically
    // centered, deselects the previous node reliably — Escape alone was
    // observed to leave Excalidraw's floating properties panel open (it
    // covers the top-left), and the bottom-right corner overlaps
    // Excalidraw's own zoom/stats controls (clicking there opened a modal).
    const deselectX = box.x + box.width - 40;
    const deselectY = box.y + box.height / 2;

    let index = 0;
    for (const rep of representatives) {
      if (!rep.id) continue;

      const dropX = box.x + 100 + (index % 4) * 160;
      const dropY = box.y + 100 + Math.floor(index / 4) * 90;
      index += 1;

      await page.mouse.click(deselectX, deselectY);
      await page.keyboard.press("Escape");
      await dragComponentOntoCanvas(page, rep.id, dropX, dropY);
      await page.mouse.click(dropX, dropY);

      await expect(page.getByTestId("inspector-label"), rep.categoryLabel).toHaveText(rep.label);
    }
  });
});
