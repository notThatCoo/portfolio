import { expect, type Page } from "@playwright/test";

/** Navigate and wait until the shell has hydrated (global shortcuts and handlers are live). */
export async function gotoReady(page: Page, url: string) {
  const res = await page.goto(url);
  await expect(page.locator("html[data-ready]")).toBeAttached();
  return res;
}
