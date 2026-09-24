// Run against a local production preview: DEMO_BASE_URL=http://127.0.0.1:3101
// Records the real UI and live API calls. Never substitutes generated responses.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resumePdf } from "../e2e/fixtures.js";

await mkdir("public/demo", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: {
    dir: "test-results/demo-recording",
    size: { width: 1280, height: 900 },
  },
  reducedMotion: "reduce",
});
const start = Date.now();
const page = await context.newPage();
const chapters = [];
let completed = false;
const output = "test-results/demo-recording/publish";
await mkdir(output, { recursive: true });
async function chapter(title) {
  console.log(title);
  chapters.push({ time: (Date.now() - start) / 1000, title });
  await page.evaluate((text) => {
    let label = document.getElementById("demo-caption");
    if (!label) {
      label = document.createElement("div");
      label.id = "demo-caption";
      label.style.cssText =
        "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;padding:14px 24px;background:#101820f5;color:#fff;border:1px solid #a4f4fd55;border-radius:16px;font:500 16px system-ui;box-shadow:0 8px 30px #0008;pointer-events:none;max-width:90vw;text-align:center";
      document.body.append(label);
    }
    label.textContent = text;
  }, title);
  await page.waitForTimeout(1800);
}
try {
  await page.goto(
    new URL(
      "/analyze-job",
      process.env.DEMO_BASE_URL || "http://127.0.0.1:3101",
    ).href,
  );
  await page.addStyleTag({
    content:
      ".background-control{display:none!important} html{scroll-behavior:auto!important}",
  });
  await chapter(
    "HireDraft walkthrough · Fictional sample data, live AI generation",
  );
  await page.screenshot({ path: `${output}/hiredraft-live-demo-poster.png` });
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await chapter("1. Add the opportunity — paste a job description");
  await page
    .getByLabel("Job Title (required)", { exact: true })
    .fill("QA Engineer");
  await page.getByLabel("Company Name", { exact: true }).fill("Harbor Systems");
  await page
    .getByLabel("Job description or hiring post (required)", { exact: true })
    .fill(
      "Required Skills: Selenium, Java\nResponsibilities: Build automated regression tests and report defects clearly.\nLocation: Remote",
    );
  await page.waitForTimeout(2000);
  await page
    .getByRole("button", { name: "Confirm job details", exact: true })
    .click();
  await chapter("2. Review the role's requirements before continuing");
  await page
    .getByRole("button", { name: "Confirm requirements", exact: true })
    .click();
  await chapter("3. Upload your resume — PDF or DOCX");
  await page.getByLabel("Resume file").setInputFiles({
    name: "Jane-Doe-sample-resume.pdf",
    mimeType: "application/pdf",
    buffer: resumePdf(),
  });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Read resume", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm my profile", exact: true }),
  ).toBeEnabled({ timeout: 60000 });
  await chapter(
    "4. Review and confirm the experience extracted from your resume",
  );
  await page
    .getByRole("button", { name: "Confirm my profile", exact: true })
    .click();
  await chapter("5. Choose a provider and generate your application email");
  await page
    .getByLabel("AI provider", { exact: true })
    .selectOption(process.env.DEMO_PROVIDER || "bynara");
  const generated = page.waitForResponse(
    (response) => response.url().endsWith("/api/generate-email"),
    { timeout: 180000 },
  );
  await page
    .getByRole("button", { name: "Generate application email", exact: true })
    .click();
  const response = await generated;
  const result = await response.json();
  if (!response.ok() || !result.subject || !result.body)
    throw new Error(`Live generation failed: ${JSON.stringify(result)}`);
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    result.subject,
    { timeout: 30000 },
  );
  console.log("Live generation succeeded with", result.metadata?.provider);
  await page.getByLabel("Subject", { exact: true }).scrollIntoViewIfNeeded();
  await chapter("6. Review your subject and body — you can edit both");
  await expect(page.getByLabel("Email body", { exact: true })).toHaveValue(
    result.body,
    { timeout: 30000 },
  );
  await page.waitForTimeout(5000);
  await page
    .getByRole("button", { name: "Save to History", exact: true })
    .scrollIntoViewIfNeeded();
  await chapter("7. Copy, export, open in Gmail, or save this version");
  await page
    .getByRole("button", { name: "Save to History", exact: true })
    .click();
  await page.waitForTimeout(2000);
  await chapter(
    "Your application, ready for your final review. Nothing sends automatically.",
  );
  await page.waitForTimeout(2000);
  completed = true;
} catch (error) {
  await page.screenshot({ path: "test-results/demo-recording/failure.png" });
  console.error(await page.locator("main").innerText());
  throw error;
} finally {
  await context.close();
  if (completed)
    await page.video().saveAs(`${output}/hiredraft-live-demo.webm`);
  await browser.close();
}
const stamp = (seconds) => new Date(seconds * 1000).toISOString().slice(11, 23);
await writeFile(
  `${output}/hiredraft-live-demo.vtt`,
  "WEBVTT\n\n" +
    chapters
      .map(
        (chapter, i) =>
          `${i + 1}\n${stamp(chapter.time)} --> ${stamp(chapters[i + 1]?.time || (Date.now() - start) / 1000)}\n${chapter.title}\n`,
      )
      .join("\n"),
);
await writeFile(`${output}/chapters.json`, JSON.stringify(chapters, null, 2));
console.log("Recorded live demo and captions in", output);
