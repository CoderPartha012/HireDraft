import { test, expect } from "@playwright/test";

const themeButton = (page, next) =>
  page.getByRole("button", { name: `Switch to ${next} theme`, exact: true });

test("theme defaults to dark even on a light system, supports keyboard switching, and persists across navigation and reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await themeButton(page, "light").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(
    await page.evaluate(() => localStorage.getItem("hiredraft.theme")),
  ).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page
    .getByRole("link", { name: "Create an application", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/light/);
  const field = page.getByLabel("LinkedIn job or hiring post URL");
  await field.fill("https://www.linkedin.com/jobs/view/1234567890");
  await themeButton(page, "dark").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(field).toHaveValue(
    "https://www.linkedin.com/jobs/view/1234567890",
  );
  await page.goto("/about");
  await expect(themeButton(page, "light")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const theme of ["light", "dark"]) {
  test(`${theme} theme loads Geist and fits all pages on desktop and mobile`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("hiredraft.theme", value),
      theme,
    );
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        "/",
        "/analyze-job",
        "/about",
        "/contact",
        "/privacy",
        "/terms",
        "/not-a-page",
      ]) {
        await page.goto(route);
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        await expect(
          themeButton(page, theme === "dark" ? "light" : "dark"),
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(() => ({
          font: getComputedStyle(document.body).fontFamily,
          overflow: document.documentElement.scrollWidth > innerWidth,
          loaded: [...document.fonts].some(
            (f) =>
              f.family.toLowerCase().includes("geist") && f.status === "loaded",
          ),
        }));
        expect(result.font.toLowerCase()).toContain("geist");
        expect(result.loaded).toBe(true);
        expect(result.overflow).toBe(false);
        if (route === "/" || route === "/analyze-job")
          await page.screenshot({
            path: `test-results/theme-${theme}-${route === "/" ? "home" : "workspace"}-${width}.png`,
            fullPage: true,
          });
        if (route === "/analyze-job") {
          const input = page.getByLabel("LinkedIn job or hiring post URL");
          if (theme === "dark")
            expect(
              await input.evaluate(
                (el) => getComputedStyle(el).backgroundColor,
              ),
            ).not.toBe("rgb(255, 255, 255)");
        }
      }
    }
    expect(errors).toEqual([]);
  });
}
