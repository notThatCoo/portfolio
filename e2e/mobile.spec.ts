import { expect, test } from "@playwright/test";

test("phones get a home screen with full-screen apps", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tolu Adeleye", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dock", exact: true })).toBeHidden();

  await page.getByRole("list", { name: "Apps" }).getByRole("button", { name: "Notes" }).click();
  await expect(page).toHaveURL("/notes/about-me");
  const notes = page.locator("section.wm-window");
  // Full-screen once the open animation settles.
  await expect
    .poll(async () => (await notes.boundingBox())?.width)
    .toBe(page.viewportSize()!.width);

  await page.getByRole("button", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("section.wm-window")).toHaveCount(0);
});
