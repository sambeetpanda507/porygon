import { expect, test, type Page } from "@playwright/test";

const SCENE_KEY = "porygon-scene";

async function readStoredElementCount(page: Page): Promise<number> {
  return page.evaluate(async (key: string) => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open("porygon", 1);
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void => reject(request.error);
    });
    const value: { elements?: unknown[] } | undefined = await new Promise((resolve, reject) => {
      const tx: IDBTransaction = db.transaction("kv", "readonly");
      const req: IDBRequest = tx.objectStore("kv").get(key);
      req.onsuccess = (): void => resolve(req.result);
      req.onerror = (): void => reject(req.error);
    });
    return value?.elements?.length ?? 0;
  }, SCENE_KEY);
}

async function drawRectangle(page: Page): Promise<void> {
  const canvas = page.locator("canvas.excalidraw__canvas").first();
  await canvas.waitFor({ state: "visible" });
  // force: true — the tool icon's inner <path> intercepts pointer events over
  // the actual (visually hidden) radio input, which is how Excalidraw's
  // toolbar is built; a real click works fine, Playwright's actionability
  // check just doesn't like the overlap.
  await page.getByRole("radio", { name: "Rectangle" }).click({ force: true });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  // draw well clear of the left properties panel and top toolbar overlays
  await page.mouse.move(box.x + 500, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 650, box.y + 400, { steps: 10 });
  await page.mouse.move(box.x + 800, box.y + 500, { steps: 10 });
  await page.mouse.up();
}

test("drawing persists across reload via IndexedDB, with no network calls for diagram data", async ({
  page,
}) => {
  const diagramNetworkRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" || request.method() === "PUT") {
      diagramNetworkRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/design");
  await drawRectangle(page);

  // wait past the save debounce
  await page.waitForTimeout(600);
  const countBeforeReload: number = await readStoredElementCount(page);
  expect(countBeforeReload).toBeGreaterThan(0);

  await page.reload();
  await page.locator("canvas.excalidraw__canvas").first().waitFor({ state: "visible" });
  await page.waitForTimeout(300);

  const countAfterReload: number = await readStoredElementCount(page);
  expect(countAfterReload).toBe(countBeforeReload);

  expect(diagramNetworkRequests).toEqual([]);
});
