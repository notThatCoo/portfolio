import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.skip(({ isMobile }) => isMobile, "covered on desktop");

for (const path of ["/", "/notes/about-me", "/finder", "/detector"]) {
  for (const scheme of ["dark", "light"] as const) {
    test(`no serious a11y violations on ${path} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        serious.map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => n.target.join(" "))
              .slice(0, 3)
              .join(", ")}`,
        ),
      ).toEqual([]);
    });
  }
}

test("keyboard-only: skip link, dock, and focus moving into opened windows", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to desktop" })).toBeFocused();
  const notesButton = page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "Notes" });
  await notesButton.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("navigation", { name: "Dock" }).getByRole("button", { name: "Terminal" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/notes/about-me");
  // Focus moved into the new window.
  await expect(page.locator("section.wm-window .wm-body")).toBeFocused();
  // Alt+W closes it.
  await page.keyboard.press("Alt+KeyW");
  await expect(page.locator("section.wm-window")).toHaveCount(0);
});
