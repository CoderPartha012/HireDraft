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
  await expect(page.locator("video, canvas, iframe")).toHaveCount(0);
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
      await expect(page.locator("video, canvas, iframe")).toHaveCount(0);
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

test("FAQ accordion is keyboard accessible and the primary action opens the workspace", async ({
  page,
}) => {
  await page.goto("/");
  const question = page.getByRole("button", {
    name: "What do I need to create my first email?",
    exact: true,
  });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("Start with a job link or the full job description", {
      exact: false,
    }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("link", { name: "Create an application", exact: true })
    .click();
  await expect(page).toHaveURL(/analyze-job/);
  await expect(
    page.getByLabel("LinkedIn job or hiring post URL"),
  ).toBeVisible();
});

test("FAQ categories work with keyboard and brand returns to landing top", async ({
  page,
}) => {
  await page.goto("/#questions");
  const tabs = page.getByRole("tablist", { name: "FAQ categories" });
  await tabs.getByRole("tab", { name: "Getting started" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "Writing & sending" }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", {
      name: "How does the email stay true to my experience?",
    })
    .click();
  await expect(
    page.getByText("The draft uses the job details, resume information,", {
      exact: false,
    }),
  ).toBeVisible();
  await tabs.getByRole("tab", { name: "Your data & support" }).click();
  await expect(
    page.getByRole("button", {
      name: "What happens to my resume and saved emails?",
    }),
  ).toBeVisible();
  await page
    .locator("#questions")
    .screenshot({ path: "test-results/faq-tabs-desktop.png" });
  await page
    .getByRole("link", { name: "HireDraft home", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/#top$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goto("/about");
  await page
    .getByRole("link", { name: "HireDraft home", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/#top$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#questions");
  await tabs.getByRole("tab", { name: "Writing & sending" }).click();
  await page
    .getByRole("button", {
      name: "Can I edit, export, and send the finished email?",
    })
    .click();
  await page
    .locator("#questions")
    .screenshot({ path: "test-results/faq-tabs-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
