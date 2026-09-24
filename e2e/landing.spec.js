import { test, expect } from "@playwright/test";

test("landing explains inputs, switches all example roles and opens footer pages", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your experience.",
  );
  await page.getByRole("link", { name: "Explore example emails" }).click();
  for (const role of ["Frontend Engineer", "QA Engineer", "Content Marketer"]) {
    const button = page.getByRole("button", { name: role, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("article", { name: role + " example email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: role + " example email" }),
    ).toContainText("Application for " + role);
  }
  for (const source of [
    "LinkedIn Job",
    "LinkedIn Hiring Post",
    "Company Post",
    "Recruiter Post",
    "Job Description Text",
  ]) {
    await expect(
      page.getByRole("heading", { name: source, exact: true }),
    ).toBeVisible();
  }
  for (const [label, title] of [
    ["Privacy Policy", "Privacy Policy"],
    ["Terms of Service", "Terms of Service"],
    ["Contact", "How can we help?"],
    ["About", "A more personal introduction."],
  ]) {
    await page
      .getByRole("navigation", { name: "Footer navigation" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    expect(await page.title()).toContain(
      label === "Contact" ? "Contact" : label === "About" ? "About" : title,
    );
  }
  expect(errors).toEqual([]);
});

test("new landing and information pages fit mobile and support keyboard example selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/privacy", "/terms", "/contact", "/about"]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (path === "/") {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await expect(
        page.getByRole("navigation", { name: "Mobile navigation" }),
      ).toBeVisible();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Examples", exact: true })
        .click();
      await expect(
        page.getByRole("navigation", { name: "Mobile navigation" }),
      ).toHaveCount(0);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.locator(".cinematic-background video")).toBeHidden();
      await page
        .getByRole("button", { name: "QA Engineer", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("article", { name: "QA Engineer example email" }),
      ).toBeVisible();
      await page.screenshot({
        path: "test-results/new-landing-mobile.png",
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/new-landing-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/contact");
  await page.screenshot({
    path: "test-results/contact-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
});
