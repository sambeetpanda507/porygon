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

test.describe("sharing & local persistence", () => {
  test("export then import a .porygon file reconstructs the diagram", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    await dragComponentOntoCanvas(page, "client", box, 300, 300);
    await page.mouse.click(box.x + 300, box.y + 300);
    await expect(page.getByTestId("inspector-label")).toHaveText("Client");

    await page.getByTestId("sharing-panel-toggle").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-porygon").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("diagram.porygon");
    const filePath = await download.path();
    if (!filePath) throw new Error("download has no path");

    // Clear the saved scene and reload, so the import is the only thing
    // that can bring the diagram back. Deleting the whole database here
    // would get silently blocked forever — the app's own db helper opens a
    // fresh IndexedDB connection on every idbGet/idbSet call and never
    // closes any of them, and deleteDatabase stalls until every open
    // connection to that database closes. Opening our own short-lived
    // connection and explicitly closing it after the write avoids that.
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open("porygon", 1);
        openRequest.onsuccess = (): void => {
          const db = openRequest.result;
          const tx = db.transaction("kv", "readwrite");
          tx.objectStore("kv").delete("porygon-scene");
          tx.oncomplete = (): void => {
            db.close();
            resolve();
          };
          tx.onerror = (): void => {
            db.close();
            reject(tx.error);
          };
        };
        openRequest.onerror = (): void => reject(openRequest.error);
      });
    });
    await page.reload();
    await canvas.waitFor({ state: "visible" });
    await page.getByTestId("debug-panel-toggle").click();
    await expect(page.getByTestId("debug-node-count")).toHaveText("0");
    await page.getByTestId("debug-panel-toggle").click();

    await page.getByTestId("sharing-panel-toggle").click();
    await page.getByTestId("import-porygon-input").setInputFiles(filePath);
    await page.waitForTimeout(300);

    await page.getByTestId("debug-panel-toggle").click();
    await expect(page.getByTestId("debug-node-count")).toHaveText("1");
    await page.getByTestId("debug-panel-toggle").click();

    await page.mouse.click(box.x + 300, box.y + 300);
    await expect(page.getByTestId("inspector-label")).toHaveText("Client");
  });

  test("a copied share link opens as a read-only snapshot, and duplicating it makes an editable copy", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    // Stub the clipboard so the test doesn't depend on real OS clipboard
    // permissions — fully deterministic either way.
    await page.evaluate(() => {
      (window as unknown as { __copiedText?: string }).__copiedText = undefined;
      navigator.clipboard.writeText = async (text: string): Promise<void> => {
        (window as unknown as { __copiedText?: string }).__copiedText = text;
      };
    });

    await dragComponentOntoCanvas(page, "load-balancer", box, 300, 300);

    await page.getByTestId("sharing-panel-toggle").click();
    await page.getByTestId("copy-share-link").click();
    await expect(page.getByTestId("copy-share-link")).toHaveText("Link copied!");

    const shareUrl: string | undefined = await page.evaluate(
      () => (window as unknown as { __copiedText?: string }).__copiedText,
    );
    if (!shareUrl) throw new Error("no share link was copied");
    expect(shareUrl).toContain("/design#share=");

    await page.goto(shareUrl);
    await canvas.waitFor({ state: "visible" });

    await expect(page.getByTestId("share-banner")).toBeVisible();
    // A read-only view shows no editing panels at all.
    await expect(page.getByTestId("sharing-panel-toggle")).toHaveCount(0);
    await expect(page.getByTestId("debug-panel-toggle")).toHaveCount(0);

    await page.getByTestId("duplicate-to-edit").click();
    await page.waitForURL((url) => !url.hash.includes("share="));
    await canvas.waitFor({ state: "visible" });

    await expect(page.getByTestId("share-banner")).toHaveCount(0);
    await page.getByTestId("debug-panel-toggle").click();
    await expect(page.getByTestId("debug-node-count")).toHaveText("1");
  });

  test("a share link for a large diagram doesn't 431 — regression for putting the scene in a query param", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    // A dozen nodes is already enough to push a query-param-encoded scene
    // past Node's default 16KB max HTTP header size — the actual bug a
    // user hit (431 Request Header Fields Too Large) once a real diagram
    // grew past a handful of nodes.
    const componentIds = [
      "client",
      "mobile-app",
      "cdn-edge",
      "load-balancer",
      "api-gateway",
      "server-vm",
      "container",
      "postgresql",
      "mongodb",
      "redis-cache",
      "queue-sqs-style",
      "object-storage",
    ];
    for (const [index, componentId] of componentIds.entries()) {
      const dropX = 260 + (index % 4) * 160;
      const dropY = 150 + Math.floor(index / 4) * 150;
      await dragComponentOntoCanvas(page, componentId, box, dropX, dropY);
    }

    await page.getByTestId("debug-panel-toggle").click();
    await expect(page.getByTestId("debug-node-count")).toHaveText(String(componentIds.length));
    await page.getByTestId("debug-panel-toggle").click();

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
    if (!shareUrl) throw new Error("no share link was copied");
    expect(shareUrl).toContain("/design#share=");

    const responses: number[] = [];
    const freshPage = await context.newPage();
    freshPage.on("response", (response) => responses.push(response.status()));
    await freshPage.goto(shareUrl);
    await freshPage.locator("canvas.excalidraw__canvas").first().waitFor({ state: "visible" });

    expect(responses).not.toContain(431);
    await expect(freshPage.getByTestId("share-banner")).toBeVisible();
  });
});
