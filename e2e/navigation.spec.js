import { test, expect } from "@playwright/test";
test("navbar links and mobile sheet support keyboard navigation and dismissal", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "Examples", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Switch to light theme", exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: "test-results/navbar-desktop.png" });
  const about = nav.getByRole("link", { name: "About", exact: true });
  await about.focus();
  await expect(about).toBeFocused();
  await about.press("Enter");
  await expect(page).toHaveURL(/\/about$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "HireDraft navigation" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/navbar-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Examples", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#examples$/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
