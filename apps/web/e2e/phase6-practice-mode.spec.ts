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

test.describe("practice mode", () => {
  test("picking a prompt starts a timer, renders its checklist, syncs the scenario, and explain mode shows a canned explanation", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.goto("/design");
    const canvas = page.locator("canvas.excalidraw__canvas").first();
    await canvas.waitFor({ state: "visible" });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    await page.getByTestId("practice-panel-toggle").click();

    // Before picking a prompt, there's no timer/checklist yet.
    await expect(page.getByTestId("practice-timer")).toHaveCount(0);

    await page.getByTestId("prompt-select").selectOption("rate-limiter");

    await expect(page.getByTestId("practice-timer")).toHaveText("0:00");
    await expect(page.getByTestId("practice-checklist").locator("li")).toHaveCount(4);

    // Picking a prompt syncs the simulation scenario to its traffic profile
    // — "rate-limiter" is wired to "black-friday-spike" in content/prompts.ts.
    await expect(page.getByTestId("scenario-select")).toHaveValue("black-friday-spike");

    // The timer counts up once a second.
    await expect(page.getByTestId("practice-timer")).toHaveText("0:01", { timeout: 5_000 });

    await page.getByTestId("explain-mode-toggle").click();
    await expect(page.getByTestId("explain-mode-toggle")).toHaveText("Explain mode: on");

    const client = { x: 300, y: 300 };
    await dragComponentOntoCanvas(page, "client", box, client.x, client.y);
    await page.mouse.click(box.x + client.x, box.y + client.y);

    await expect(page.getByTestId("inspector-label")).toHaveText("Client");
    await expect(page.getByTestId("inspector-explanation")).toContainText(
      "Where traffic originates",
    );

    // Build+simulate the rest of the design, then run it against the
    // prompt's synced scenario end-to-end.
    const server = { x: 300, y: 500 };
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
  });
});
