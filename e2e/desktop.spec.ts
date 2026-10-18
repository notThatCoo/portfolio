import { gotoReady } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

test.skip(({ isMobile }) => isMobile, "desktop shell only");

/** A window by app id (stable even when its title changes). */
const win = (page: Page, app: string) => page.locator(`section.wm-window[data-app="${app}"]`);

test("opening an app from the dock updates the URL, and Back closes it", async ({ page }) => {
  await gotoReady(page, "/");
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "Notes" })
    .click();
  await expect(page).toHaveURL("/notes/about-me");
  await expect(page).toHaveTitle(/About me · Notes/);
  await expect(win(page, "notes")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.locator("section.wm-window")).toHaveCount(0);
});

test("deep links open the right window and in-app navigation is shareable", async ({ page }) => {
  await gotoReady(page, "/finder/streamline-etl");
  const finder = win(page, "finder");
  await expect(finder.getByRole("heading", { level: 1, name: "streamline-etl" })).toBeVisible();

  await finder
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Projects" })
    .click();
  await expect(page).toHaveURL("/finder");
  await finder.getByRole("link", { name: /MobileNetV2/ }).click();
  await expect(page).toHaveURL("/finder/mobilenetv2-image-classifier");

  await page.goBack();
  await expect(page).toHaveURL("/finder");
  await page.goBack();
  await expect(page).toHaveURL("/finder/streamline-etl");
});

test("windows can be dragged by the title bar and keep focus order", async ({ page }) => {
  await gotoReady(page, "/notes/about-me");
  const notes = win(page, "notes");
  const before = (await notes.boundingBox())!;
  const bar = notes.locator(".wm-titlebar");
  const box = (await bar.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  const after = (await notes.boundingBox())!;
  // ±2px: positions are rounded to whole pixels when committed.
  expect(Math.abs(after.x - before.x - 120)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.y - before.y - 60)).toBeLessThanOrEqual(2);

  // Open a second window, then click the first: it should come back to the front and own the URL.
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "Music" })
    .click();
  await expect(page).toHaveURL("/music");
  // Click the part of Notes that Music doesn't cover (the left edge of its sidebar).
  await notes.click({ position: { x: 20, y: 300 } });
  await expect(page).toHaveURL("/notes/about-me");
  await expect(page.getByRole("banner").getByText("Notes", { exact: true })).toBeVisible();
});

test("close and minimize buttons work", async ({ page }) => {
  await gotoReady(page, "/music");
  await page.getByRole("button", { name: "Minimize Music" }).click();
  await expect(win(page, "music")).toBeHidden();
  await expect(page).toHaveURL("/");
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: /Music/ })
    .click();
  await expect(win(page, "music")).toBeVisible();
  await page.getByRole("button", { name: "Close Music" }).click();
  await expect(page.locator("section.wm-window")).toHaveCount(0);
});

test("command palette opens projects with the keyboard", async ({ page }) => {
  await gotoReady(page, "/");
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  await page.keyboard.type("darkside");
  await page.keyboard.press("Enter");
  await expect(palette).toBeHidden();
  await expect(page).toHaveURL("/finder/darkside-20k-surrogate");
});

test("terminal runs commands, completes paths, and opens windows", async ({ page }) => {
  await gotoReady(page, "/terminal");
  const input = page.getByRole("textbox", { name: "Terminal command" });
  await input.fill("whoami");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("Tolu Adeleye");

  await input.fill("cat notes/res");
  await input.press("Tab");
  await expect(input).toHaveValue("cat notes/resume.md ");

  await input.fill("open streamline-etl");
  await input.press("Enter");
  await expect(page).toHaveURL("/finder/streamline-etl");
});

test("detector runs the ONNX model in the browser", async ({ page }) => {
  await gotoReady(page, "/detector");
  await expect(page.getByText("Toy model · synthetic data")).toBeVisible();
  const inference = page.locator("dt", { hasText: "Inference" }).locator("+ dd");
  await expect(inference).toHaveText(/\d+(\.\d+)? ms/, { timeout: 20_000 });
  await page.getByLabel("ρ/R").fill("0.9");
  await expect(page.locator("output").first()).toHaveText("0.90");
});

test("unknown documents return a real 404", async ({ page }) => {
  const res = await page.goto("/notes/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("That file doesn’t exist")).toBeVisible();
});
