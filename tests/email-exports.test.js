import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  emailText,
  emailMarkdown,
  gmailComposeUrl,
  emailDocx,
} from "../src/email-export.js";
import { HISTORY_KEY, readHistory, saveHistory } from "../src/email-history.js";
import { markdownToText, plainToMarkdown } from "../src/markdown.js";
const email = {
  subject: "QA & Testing \u2014 r\u00e9sum\u00e9",
  body: "Hello,\n\nI use Selenium & Java.\nLiteral *text* <sample>\n\nThanks,\nZo\u00eb",
  metadata: { generation: 2, secret: "must not be saved" },
};
test("Markdown survives copying and history, while text and Gmail omit formatting syntax", async () => {
  const source =
    "## Experience\n\n**Selenium** and *Java*\n\n- Testing\n- [Portfolio](https://example.com)\n\n<script>alert(1)</script>\n\n![portrait](https://example.com/image.png)";
  const formatted = { ...email, body: source, bodyFormat: "markdown" };
  const plain = markdownToText(source);
  assert.ok(plain.includes("Selenium and Java"));
  assert.ok(plain.includes("Portfolio (https://example.com)"));
  assert.ok(!plain.includes("script"));
  assert.ok(!plain.includes("image.png"));
  assert.ok(emailMarkdown(formatted).endsWith(source));
  assert.equal(
    new URL(gmailComposeUrl(formatted)).searchParams.get("body"),
    plain,
  );
  assert.equal(
    markdownToText(plainToMarkdown("Use *literal* & <text>\nNext line")),
    "Use *literal* & <text>\nNext line",
  );
  const zip = await JSZip.loadAsync(
    await (await emailDocx(formatted)).arrayBuffer(),
  );
  const xml = await zip.file("word/document.xml").async("string");
  assert.ok(xml.includes("Heading2"));
  assert.ok(xml.includes("<w:b/>"));
  assert.ok(xml.includes("<w:i/>"));
  assert.ok(!xml.includes("alert(1)"));
  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
  saveHistory(storage, formatted, true);
  assert.equal(readHistory(storage)[0].bodyFormat, "markdown");
  assert.equal(readHistory(storage)[0].body, source);
});
test("text, markdown and Gmail preserve content without sending a message", () => {
  assert.equal(emailText(email), `Subject: ${email.subject}\n\n${email.body}`);
  assert.ok(emailMarkdown(email).includes("\\*text\\* &lt;sample&gt;"));
  const url = new URL(gmailComposeUrl(email));
  assert.equal(url.origin, "https://mail.google.com");
  assert.equal(url.searchParams.get("su"), email.subject);
  assert.equal(url.searchParams.get("body"), email.body);
  assert.equal(url.searchParams.has("to"), false);
});
test("Word export is a real DOCX with Unicode and escaped text", async () => {
  const blob = await emailDocx(email);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.ok(zip.file("[Content_Types].xml"));
  const xml = await zip.file("word/document.xml").async("string");
  assert.ok(xml.includes("QA &amp; Testing \u2014 r\u00e9sum\u00e9"));
  assert.ok(xml.includes("Zo\u00eb"));
  assert.ok(xml.includes("&lt;sample&gt;"));
  assert.ok(xml.includes("Selenium &amp; Java"));
});
test("history persists only email fields, deduplicates and validates stored entries", () => {
  const map = new Map();
  const storage = {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
  };
  const saved = saveHistory(storage, email, true);
  assert.equal(saved.length, 1);
  assert.equal(readHistory(storage)[0].edited, true);
  assert.ok(!map.get(HISTORY_KEY).includes("must not be saved"));
  assert.equal(saveHistory(storage, email, false).length, 1);
  storage.setItem(
    HISTORY_KEY,
    JSON.stringify([
      { ...saved[0], metadata: { generation: { bad: true } } },
      { subject: 3, body: null },
    ]),
  );
  assert.equal(readHistory(storage).length, 1);
  assert.equal(readHistory(storage)[0].metadata.generation, 1);
  storage.setItem(HISTORY_KEY, "malformed");
  assert.throws(() => readHistory(storage));
});
