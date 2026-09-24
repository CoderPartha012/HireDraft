import { test, expect } from "@playwright/test";
import { resumePdf } from "./fixtures.js";

for (const [provider, label] of [
  ["bynara", "Bynara (agnes-2.5-flash)"],
  ["apinex", "APInex (gpt/5.6-sol)"],
]) {
  test(`${provider} can be selected and generates an editable email through the workspace`, async ({
    page,
  }) => {
    await page.route("**/api/ai-providers", (route) =>
      route.fulfill({
        json: { providers: [{ id: provider, label, available: true }] },
      }),
    );
    let received;
    await page.route("**/api/generate-email", (route) => {
      received = route.request().postDataJSON();
      return route.fulfill({
        json: {
          subject: `Application using ${provider}`,
          body: "Hello, my Selenium and Java experience is relevant to this role. I would welcome a conversation. Best, Jane.",
          metadata: { status: "verified", provider },
        },
      });
    });
    await manualToEmail(page);
    await page
      .getByLabel("AI provider", { exact: true })
      .selectOption(provider);
    await page
      .getByRole("button", { name: "Generate application email", exact: true })
      .click();
    await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
      `Application using ${provider}`,
    );
    expect(received.provider).toBe(provider);
    await expect(
      page.getByRole("button", { name: "Copy email", exact: true }),
    ).toBeEnabled();
  });
}

const jobText =
  "Required Skills: Selenium, Java\nPreferred Skills: Playwright\nResponsibilities: Design and execute test cases.\nLocation: Remote";
const candidateText =
  "Jane Doe\nQA Engineer\njane@example.com\n\nSkills\nSelenium, Java, Playwright\n\nExperience\nQA Engineer | Example Company\nJanuary 2023 - January 2025\nFull-time\n- Design and execute test cases using Selenium and Java.\n\nEducation\nBachelor of Computer Science";
async function manualToEmail(page) {
  await page.goto("/analyze-job");
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page
    .getByLabel("Job Title (required)", { exact: true })
    .fill("QA Engineer");
  await page
    .getByLabel("Company Name", { exact: true })
    .fill("Example Company");
  await page
    .getByLabel("Job description or hiring post (required)", { exact: true })
    .fill(jobText);
  await page
    .getByRole("button", { name: "Confirm job details", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Read between the requirements." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm requirements", exact: true })
    .click();
  await page
    .getByText("Enter your information manually", { exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your experience", exact: true })
    .fill(candidateText);
  await page
    .getByRole("button", { name: "Build my profile", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm my profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Make your first words count.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Your profile alignment", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirm match & continue" }),
  ).toHaveCount(0);
}

test("Markdown editing, preview, exports, history and popup notifications stay consistent", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.copiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copiedText = text;
        },
      },
    });
  });
  await page.route("**/api/ai-providers", (route) =>
    route.fulfill({
      json: { providers: [{ id: "bynara", label: "Bynara", available: true }] },
    }),
  );
  await page.route("**/api/generate-email", (route) =>
    route.fulfill({
      json: {
        subject: "QA Application",
        body: "Hello, my Selenium and Java experience is relevant to this role. Best, Jane.",
        metadata: { status: "verified" },
      },
    }),
  );
  await manualToEmail(page);
  await page.getByLabel("AI provider", { exact: true }).selectOption("bynara");
  await page
    .getByRole("button", { name: "Generate application email", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use Markdown editor", exact: true })
    .click();
  const body = page.getByLabel("Email body", { exact: true });
  await body.fill("Selenium");
  await body.evaluate((element) => element.select());
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(body).toHaveValue("**Selenium**");
  await expect(
    page.getByLabel("Markdown preview").locator("strong"),
  ).toHaveText("Selenium");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body).toHaveValue("Selenium");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(body).toHaveValue("**Selenium**");
  await page
    .getByRole("button", { name: "Use plain text", exact: true })
    .click();
  await expect(body).toHaveValue("Selenium");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body).toHaveValue("**Selenium**");
  const source =
    "## Experience\n\n**Selenium** and *Java*\n\n- Testing\n- [Portfolio](https://example.com)\n\n<script>window.pwned=true</script>\n\n![test](https://example.com/tracker.png)";
  await body.fill(source);
  const preview = page.getByLabel("Markdown preview");
  await expect(
    preview.getByRole("heading", { name: "Experience" }),
  ).toBeVisible();
  await expect(preview.locator("script,img")).toHaveCount(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  await page
    .getByRole("button", { name: "Copy as Markdown", exact: true })
    .click();
  await expect(page.locator(".toast-popup")).toContainText("Markdown copied.");
  expect(await page.evaluate(() => window.copiedText)).toContain(source);
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.locator(".toast-popup")).toHaveCount(0);
  await page.getByRole("button", { name: "Copy email", exact: true }).click();
  expect(await page.evaluate(() => window.copiedText)).toContain(
    "Selenium and Java",
  );
  expect(await page.evaluate(() => window.copiedText)).not.toContain("**");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download as .md", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  await page
    .getByRole("button", { name: "Save to History", exact: true })
    .click();
  await expect(page.locator(".toast-popup")).toContainText("Saved to History");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/markdown-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByText("Saved History (1)", { exact: true }).click();
  const saved = page.getByLabel("Saved email history");
  await saved
    .locator("summary")
    .filter({ hasText: "Generation 1 — QA Application" })
    .click();
  await expect(saved.locator("strong")).toHaveText("Selenium");
});

test("exports, feedback, versions and saved history work together", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.copiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copiedText = text;
        },
      },
    });
  });
  await page.route("**/api/ai-providers", (route) =>
    route.fulfill({
      json: { providers: [{ id: "bynara", label: "Bynara", available: true }] },
    }),
  );
  const requests = [];
  await page.route("**/api/generate-email", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        subject: `QA Application ${requests.length}`,
        body: `Hello,\n\nI use Selenium and Java. This is draft ${requests.length}.\n\nBest,\nJane`,
        metadata: { status: "verified" },
      },
    });
  });
  await manualToEmail(page);
  await page.getByLabel("AI provider", { exact: true }).selectOption("bynara");
  await page
    .getByRole("button", { name: "Generate application email", exact: true })
    .click();
  await expect(page.getByLabel("Version History", { exact: true })).toHaveValue(
    "1",
  );
  const edited = "Hello,\n\nMy edited Selenium draft.\n\nBest, Jane";
  await page.getByLabel("Email body", { exact: true }).fill(edited);
  const txtPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download as .txt", exact: true })
    .click();
  const txt = await txtPromise;
  expect(txt.suggestedFilename()).toBe("HireDraft-generation-1.txt");
  const fs = await import("node:fs/promises");
  expect(await fs.readFile(await txt.path(), "utf8")).toContain(edited);
  const docPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download as .docx", exact: true })
    .click();
  const doc = await docPromise;
  expect(doc.suggestedFilename()).toBe("HireDraft-generation-1.docx");
  expect((await fs.readFile(await doc.path())).subarray(0, 2).toString()).toBe(
    "PK",
  );
  await page
    .getByRole("button", { name: "Copy as Markdown", exact: true })
    .click();
  expect(await page.evaluate(() => window.copiedText)).toContain(
    "**Subject:** QA Application 1",
  );
  const gmail = new URL(
    await page
      .getByRole("link", { name: "Open in Gmail", exact: true })
      .getAttribute("href"),
  );
  expect(gmail.searchParams.get("body")).toBe(edited);
  await page.getByLabel("Tone", { exact: true }).selectOption("confident");
  await expect(page.getByLabel("Email body", { exact: true })).toHaveValue(
    edited,
  );
  await expect(page.getByLabel("Version History", { exact: true })).toHaveValue(
    "1",
  );
  await page
    .getByRole("button", { name: "Save to History", exact: true })
    .click();
  await expect(
    page.getByText("Saved History (1)", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Regeneration feedback", { exact: true })
    .fill("Make it shorter");
  await page
    .getByRole("button", { name: "Regenerate with feedback", exact: true })
    .click();
  await expect(page.getByLabel("Version History", { exact: true })).toHaveValue(
    "2",
  );
  expect(requests[1].feedback).toBe("Make it shorter");
  expect(requests[1].previousDraft.body).toBe(edited);
  await page.getByLabel("Version History", { exact: true }).selectOption("1");
  await expect(page.getByLabel("Email body", { exact: true })).toHaveValue(
    edited,
  );
  await page.getByRole("button", { name: "More metrics", exact: true }).click();
  await expect(page.getByLabel("Version History", { exact: true })).toHaveValue(
    "3",
  );
  expect(requests[2].feedback).toContain("Never invent");
  await expect(
    page.getByRole("button", { name: "Shorter", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByText("Saved History (1)", { exact: true }).click();
  const saved = page.getByLabel("Saved email history");
  await saved
    .locator("summary")
    .filter({ hasText: "Generation 1 — QA Application 1" })
    .click();
  await expect(saved).toContainText("My edited Selenium draft.");
  await expect(saved).toContainText("Manually edited");
  await saved.getByRole("button", { name: "Delete saved email" }).click();
  await expect(
    page.getByText("Saved History (0)", { exact: true }),
  ).toBeVisible();
  expect(requests.length).toBe(3);
});

test("landing and mobile workspace render without overflow or client errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your experience.",
  );
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Draft my application email" }).click();
  await expect(
    page.getByRole("heading", { name: "Start with the right opportunity." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("full React workflow sends confirmed evidence, edits draft, and invalidates downstream state", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/ai-providers", (route) =>
    route.fulfill({
      json: { providers: [{ id: "bynara", label: "Bynara", available: true }] },
    }),
  );
  let payload;
  await page.route("**/api/generate-email", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      json: {
        subject: "QA Engineer application",
        body: "Hello,\n\nMy Selenium and Java experience connects with your QA Engineer role. I would welcome the opportunity to discuss my testing work.\n\nBest,\nJane",
        metadata: { status: "verified" },
      },
    });
  });
  await manualToEmail(page);
  await page.getByLabel("AI provider", { exact: true }).selectOption("bynara");
  await page
    .getByRole("button", { name: "Generate application email", exact: true })
    .click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "QA Engineer application",
  );
  for (const key of ["job", "requirements", "candidate", "relevance"])
    expect(payload[key].confirmed).toBe(true);
  await page.getByLabel("Subject", { exact: true }).fill("Updated subject");
  await expect(
    page.getByText("Manually edited. Your changes have not been checked."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore original draft" }).click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "QA Engineer application",
  );
  await page.screenshot({
    path: "test-results/email-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "The opportunity", exact: true })
    .click();
  await page
    .getByLabel("Job Title (required)", { exact: true })
    .fill("Senior QA Engineer");
  await expect(
    page.getByRole("button", { name: "Your introduction", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Your introduction", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("invalid URL, extraction failure, retry and new application remain usable", async ({
  page,
}) => {
  await page.route("**/api/extract-job", (route) =>
    route.fulfill({
      status: 422,
      json: { error: { message: "This job page is restricted." } },
    }),
  );
  await page.goto("/analyze-job");
  await page
    .getByLabel("LinkedIn job or hiring post URL")
    .fill("https://example.com");
  await page.getByRole("button", { name: "Analyze opportunity" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page
    .getByLabel("LinkedIn job or hiring post URL")
    .fill("https://www.linkedin.com/jobs/view/1234567890");
  await page.getByRole("button", { name: "Analyze opportunity" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "restricted",
  );
  await expect(
    page.getByRole("button", { name: "Analyze opportunity" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page
    .getByLabel("Job Title (required)", { exact: true })
    .fill("Old role");
  await page.getByRole("button", { name: "New application" }).click();
  await expect(page.getByLabel("LinkedIn job or hiring post URL")).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Job Title (required)", { exact: true }),
  ).toHaveCount(0);
});

test("React analysis corrections and structured profile edits preserve the confirmation flow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await manualToEmail(page);
  await page
    .getByRole("button", { name: "The requirements", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit analysis", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Your experience", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Required Skills", { exact: true })
    .fill("Selenium\nJava\nSQL");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm requirements", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jane Smith");
  await page
    .getByRole("button", { name: "Save profile changes", exact: true })
    .click();
  await expect(page.getByText("Jane Smith", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm my profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Make your first words count.",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/match-mobile.png",
    fullPage: true,
  });
});

test("production Next.js resume route runs its worker and the React upload can be reviewed", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/read-resume", {
    headers: {
      "Content-Type": "application/pdf",
      "X-Resume-Name": "resume.pdf",
    },
    data: resumePdf(),
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).text).toContain("Selenium");
  await manualToEmail(page);
  await page
    .getByRole("button", { name: "Your experience", exact: true })
    .click();
  await page.getByLabel("Resume file").setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: resumePdf(),
  });
  await page.getByRole("button", { name: "Read resume", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your profile, in your words" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm my profile", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Your introduction", exact: true }),
  ).toBeDisabled();
});

test("multiple-role extraction requires a selection and cancellation ignores stale responses", async ({
  page,
}) => {
  const sourceUrl = "https://www.linkedin.com/jobs/view/1234567890";
  let release;
  const delayed = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/extract-job", async (route) => {
    await delayed;
    try {
      await route.fulfill({
        json: {
          job: {
            sourceUrl,
            sourceType: "linkedin_post",
            extractionStatus: "success",
            jobDescription: "We are hiring two roles.",
            roles: [
              { id: "qa", jobTitle: "QA Engineer", content: jobText },
              {
                id: "dev",
                jobTitle: "Java Engineer",
                content: "Required Skills: Java",
              },
            ],
          },
        },
      });
    } catch {}
  });
  await page.goto("/analyze-job");
  await page.getByLabel("LinkedIn job or hiring post URL").fill(sourceUrl);
  await page.getByRole("button", { name: "Analyze opportunity" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
  release();
  await expect(page.getByLabel("LinkedIn job or hiring post URL")).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("heading", { name: "Review the opportunity", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("LinkedIn job or hiring post URL").fill(sourceUrl);
  await page.getByRole("button", { name: "Analyze opportunity" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm job details", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Choose a role from this hiring post")
    .selectOption("qa");
  await expect(
    page.getByLabel("Job Title (required)", { exact: true }),
  ).toHaveValue("QA Engineer");
  await page
    .getByLabel("Choose a role from this hiring post")
    .selectOption("dev");
  await expect(
    page.getByLabel("Job Title (required)", { exact: true }),
  ).toHaveValue("Java Engineer");
  await page
    .getByRole("button", { name: "Confirm job details", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Read between the requirements." }),
  ).toBeVisible();
});

test("loading animation is accessible, cancellable and respects reduced motion", async ({
  page,
}) => {
  let release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/extract-job", async (route) => {
    await wait;
    await route
      .fulfill({ json: { error: { message: "Cancelled request" } } })
      .catch(() => {});
  });
  await page.goto("/analyze-job");
  await page
    .getByLabel("LinkedIn job or hiring post URL")
    .fill("https://www.linkedin.com/jobs/view/1234567890");
  await page
    .getByRole("button", { name: "Analyze opportunity", exact: true })
    .click();
  const loading = page.locator(".processing-state");
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute("role", "status");
  await page.screenshot({
    path: "test-results/processing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/processing-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".document-scan")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  // Loading remains in document flow rather than floating over the form on scroll.
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const documentTop = await loading.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );
    for (const top of [600, 0, 300]) {
      await page.evaluate(
        (y) => window.scrollTo({ top: y, behavior: "instant" }),
        top,
      );
      const bounds = await loading.evaluate((el) => ({
        documentTop: el.getBoundingClientRect().top + window.scrollY,
        bottom: el.getBoundingClientRect().bottom,
        nextTop: el.nextElementSibling.getBoundingClientRect().top,
      }));
      expect(Math.abs(bounds.documentTop - documentTop)).toBeLessThan(2);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.nextTop);
    }
  }
  await loading.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(loading).toHaveCount(0);
  release();
  await page.goto("/");
  await expect(page.getByText(/Bynara|APInex|Mastra/)).toHaveCount(0);
});

test("rapid generate clicks send one request and display actual usage", async ({
  page,
}) => {
  await page.route("**/api/ai-providers", (route) =>
    route.fulfill({
      json: { providers: [{ id: "bynara", label: "Bynara", available: true }] },
    }),
  );
  let calls = 0;
  await page.route("**/api/generate-email", async (route) => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      json: {
        subject: "Application",
        body: "Hello, my Selenium experience is relevant to your role. Best, Jane.",
        metadata: {
          status: "verified",
          provider: "bynara",
          usage: {
            totalTokens: 1234,
            providerCalls: 2,
            reportedCalls: 2,
            complete: true,
          },
        },
      },
    });
  });
  await manualToEmail(page);
  await page.getByLabel("AI provider", { exact: true }).selectOption("bynara");
  await page
    .getByRole("button", { name: "Generate application email", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(page.getByLabel("Generation usage")).toContainText(
    "1,234 tokens used",
  );
  await expect(page.getByLabel("Generation usage")).toContainText("2 AI calls");
  await expect(
    page.getByRole("link", { name: "open Bynara usage dashboard" }),
  ).toHaveAttribute("href", "https://router.bynara.id/usage");
  expect(calls).toBe(1);
});

test("subject and body type before actions appear, copy works, and only two successful regenerations are allowed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.copiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copiedText = text;
        },
      },
    });
  });
  await page.route("**/api/ai-providers", (route) =>
    route.fulfill({
      json: { providers: [{ id: "bynara", label: "Bynara", available: true }] },
    }),
  );
  let calls = 0;
  const subject =
    "Application for the Quality Assurance Engineer position at Example";
  const body =
    "Hello, my Selenium and Java experience is relevant to this opportunity. Best, Jane.";
  await page.route("**/api/generate-email", async (route) => {
    calls++;
    if (calls === 2)
      return route.fulfill({
        status: 503,
        json: { error: { message: "Provider temporarily unavailable" } },
      });
    return route.fulfill({
      json: { subject, body, metadata: { status: "verified" } },
    });
  });
  await manualToEmail(page);
  await page.getByLabel("AI provider", { exact: true }).selectOption("bynara");
  await page
    .getByRole("button", { name: "Generate application email", exact: true })
    .click();
  const input = page.getByLabel("Subject", { exact: true });
  await expect(input).toHaveAttribute("aria-busy", "true");
  await expect
    .poll(async () => (await input.inputValue()).length)
    .toBeGreaterThan(0);
  expect((await input.inputValue()).length).toBeLessThan(subject.length);
  const bodyInput = page.getByLabel("Email body", { exact: true });
  await expect(bodyInput).toHaveAttribute("aria-busy", "true");
  await expect
    .poll(async () => (await bodyInput.inputValue()).length)
    .toBeGreaterThan(0);
  expect((await bodyInput.inputValue()).length).toBeLessThan(body.length);
  await expect(
    page.getByRole("button", { name: "Copy subject", exact: true }),
  ).toHaveCount(0);
  await expect(input).toHaveValue(subject);
  await expect(bodyInput).toHaveValue(body);
  await expect(
    page.getByRole("button", { name: "Generate again (0/2)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy subject", exact: true }).click();
  expect(await page.evaluate(() => window.copiedText)).toBe(subject);
  await page.getByRole("button", { name: "Copy email", exact: true }).click();
  expect(await page.evaluate(() => window.copiedText)).toBe(body);
  await page
    .getByRole("button", { name: "Generate again (0/2)", exact: true })
    .click();
  await expect(
    page.getByText("Provider temporarily unavailable"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate again (0/2)", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Generate again (0/2)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate again (1/2)", exact: true })
    .click();
  const limited = page.getByRole("button", {
    name: "Generate again (2/2)",
    exact: true,
  });
  await expect(limited).toBeDisabled();
  await expect(page.locator("#regeneration-limit")).toHaveText(
    "You have reached the maximum limit of regenerations (2/2).",
  );
  await limited.evaluate((button) => button.click());
  expect(calls).toBe(4);
  await page.screenshot({
    path: "test-results/email-actions-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(limited).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/email-actions-mobile.png",
    fullPage: true,
  });
});

test("reduced motion reveals subject and body without animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/ai-providers", (route) =>
    route.fulfill({
      json: { providers: [{ id: "bynara", label: "Bynara", available: true }] },
    }),
  );
  await page.route("**/api/generate-email", (route) =>
    route.fulfill({
      json: {
        subject: "Application for QA Engineer",
        body: "Hello, my testing experience is relevant to this role. Best, Jane.",
        metadata: { status: "verified" },
      },
    }),
  );
  await manualToEmail(page);
  await page.getByLabel("AI provider", { exact: true }).selectOption("bynara");
  await page
    .getByRole("button", { name: "Generate application email", exact: true })
    .click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Application for QA Engineer",
  );
  await expect(page.getByLabel("Subject", { exact: true })).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.getByLabel("Email body", { exact: true })).toHaveValue(
    "Hello, my testing experience is relevant to this role. Best, Jane.",
  );
  await expect(page.getByLabel("Email body", { exact: true })).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(
    page.getByRole("button", { name: "Copy email", exact: true }),
  ).toBeVisible();
});
