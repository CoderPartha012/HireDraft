import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`${theme} public pages fit phone, tablet and desktop widths`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.addInitScript(
      (value) => localStorage.setItem("hiredraft.theme", value),
      theme,
    );
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [320, 390, 640, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
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
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll("main, header, footer")]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.left < -1 || rect.right > innerWidth + 1;
            })
            .map((el) => el.tagName),
        }));
        expect(
          overflow.document,
          `${theme} ${route} at ${width}px`,
        ).toBeLessThanOrEqual(width);
        expect(overflow.elements, `${theme} ${route} at ${width}px`).toEqual(
          [],
        );
        if (
          [320, 768, 1440].includes(width) &&
          ["/", "/analyze-job"].includes(route)
        ) {
          await page.screenshot({
            path: `test-results/review-${theme}-${route === "/" ? "home" : "workspace"}-${width}.png`,
            fullPage: true,
            animations: "disabled",
          });
        }
      }
    }
    expect(errors).toEqual([]);
  });
}
