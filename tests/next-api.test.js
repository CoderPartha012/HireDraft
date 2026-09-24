import test from "node:test";
import assert from "node:assert/strict";
import { POST as extract } from "../app/api/extract-job/route.js";
import { POST as resume } from "../app/api/read-resume/route.js";
import { POST as generate } from "../app/api/generate-email/route.js";
import { GET as providers } from "../app/api/ai-providers/route.js";

const request = (path, body, headers = {}) =>
  new Request(`https://hiredraft.example/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
test("Next extraction route preserves JSON, origin, size, and URL boundaries", async () => {
  assert.equal(
    (await extract(request("extract-job", { url: "https://example.com" })))
      .status,
    400,
  );
  assert.equal(
    (await extract(request("extract-job", { url: "x", extra: true }))).status,
    400,
  );
  assert.equal((await extract(request("extract-job", "broken"))).status, 400);
  assert.equal(
    (
      await extract(
        request("extract-job", { url: "x" }, { "Content-Type": "text/plain" }),
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await extract(
        request(
          "extract-job",
          { url: "x" },
          { Origin: "https://evil.example" },
        ),
      )
    ).status,
    403,
  );
  const sameOrigin = await extract(
    request(
      "extract-job",
      { url: "x" },
      { Origin: "https://hiredraft.example" },
    ),
  );
  assert.equal(sameOrigin.status, 400);
  assert.equal(sameOrigin.headers.get("cache-control"), "no-store");
  assert.equal(
    (await extract(request("extract-job", { url: "x".repeat(9000) }))).status,
    413,
  );
});
test("Next upload route rejects malformed names and invalid documents safely", async () => {
  assert.equal(
    (await resume(request("read-resume", "x", { "X-Resume-Name": "%broken" })))
      .status,
    400,
  );
  assert.equal(
    (
      await resume(
        request("read-resume", "x", {
          "X-Resume-Name": "resume.pdf",
          "Content-Type": "application/pdf",
        }),
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await resume(
        request("read-resume", "x", { Origin: "https://evil.example" }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await resume(
        request("read-resume", "x", {
          "Content-Length": String(5 * 1024 * 1024),
        }),
      )
    ).status,
    413,
  );
});

test("origin checks use the browser host across Next bind-host and HTTPS proxy differences", async () => {
  const browser = request(
    "extract-job",
    { url: "invalid" },
    {
      Host: "127.0.0.1:3100",
      Origin: "http://127.0.0.1:3100",
      "X-Forwarded-Proto": "http",
    },
  );
  assert.equal((await extract(browser)).status, 400);
  const proxy = request(
    "extract-job",
    { url: "invalid" },
    {
      Host: "app.example",
      Origin: "https://app.example",
      "X-Forwarded-Proto": "https",
    },
  );
  assert.equal((await extract(proxy)).status, 400);
  const spoof = request(
    "extract-job",
    { url: "invalid" },
    {
      Host: "app.example",
      Origin: "https://evil.example",
      "X-Forwarded-Host": "evil.example",
    },
  );
  assert.equal((await extract(spoof)).status, 403);
});
test("Next generation validates requests and provider listing exposes availability only", async () => {
  assert.equal((await generate(request("generate-email", {}))).status, 400);
  assert.equal(
    (
      await generate(
        request("generate-email", {}, { Origin: "https://evil.example" }),
      )
    ).status,
    403,
  );
  const response = providers();
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  for (const provider of body.providers) {
    assert.equal(typeof provider.available, "boolean");
    assert.deepEqual(Object.keys(provider).sort(), [
      "available",
      "id",
      "label",
    ]);
  }
});
