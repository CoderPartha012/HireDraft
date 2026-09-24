import test from "node:test";
import assert from "node:assert/strict";
import { jobProfile, candidateProfile } from "./relevance-fixtures.js";
import {
  matchProfiles,
  confirmRelevanceProfile,
} from "../src/relevance-engine.js";
import {
  buildGenerationContext,
  generateEmail,
  validateEmail,
} from "../src/server/email-generation.js";
import { requestAI, providerAvailability } from "../src/server/ai-provider.js";
import { createEmailController } from "./legacy/src/email-ui.js";
import { createAppServer } from "./legacy/server.js";

function request(
  text = "Required Skills: Selenium, Appium\nPreferred Skills: Cypress",
) {
  const requirements = jobProfile(text),
    candidate = candidateProfile();
  return {
    job: requirements.source.confirmedJobProfile,
    requirements,
    candidate,
    relevance: confirmRelevanceProfile(
      matchProfiles(requirements, candidate),
      requirements,
      candidate,
    ),
    provider: "bynara",
  };
}
const draft = {
  subject: "Application for QA Automation Engineer — Jane Doe",
  body: "Hello,\n\nI am applying for the QA Automation Engineer role. My Selenium and Java experience is relevant to your requirements. I would welcome a conversation.\n\nJane Doe",
};
test("revision feedback stays separate from candidate evidence and still receives an audit", async () => {
  const r = {
    ...request(),
    feedback: "More metrics",
    previousDraft: {
      subject: "Old draft",
      body: "I increased revenue by 200%.",
      extra: "discard",
    },
  };
  const context = buildGenerationContext(r);
  assert.equal(context.revision.feedback, "More metrics");
  assert.equal(context.revision.draft.extra, undefined);
  assert.match(context.revision.rule, /Never invent/);
  assert.throws(
    () => buildGenerationContext({ ...r, feedback: "x".repeat(1001) }),
    (error) => error.code === "invalid_request",
  );
  assert.throws(
    () => buildGenerationContext({ ...r, previousDraft: { body: 3 } }),
    (error) => error.code === "invalid_request",
  );
  let audited = false;
  await generateEmail(r, {
    ai: async ({ schema, data, system }) => {
      assert.equal(data.context.revision.feedback, "More metrics");
      if (schema.properties.supported) {
        audited = true;
        return { value: { supported: true, issues: [] }, model: "test" };
      }
      assert.match(system, /never factual evidence/);
      return { value: draft, model: "test" };
    },
  });
  assert.equal(audited, true);
});
test("context rebuilds verified highlights, separates partial matches, excludes raw documents and ignores injected grounding", () => {
  const r = request();
  r.relevance.emailGroundingContext = { invented: "5 years of Appium" };
  const c = buildGenerationContext(r);
  assert.ok(c.partialMatches.length);
  assert.ok(c.prohibitedClaims.some((x) => /Appium/.test(x.requirement)));
  assert.ok(!JSON.stringify(c).includes("originalResumeText"));
  assert.ok(!JSON.stringify(c).includes("5 years of Appium"));
  r.job.companyName = "Changed";
  assert.throws(() => buildGenerationContext(r), /confirm/);
});
test("required CTC blocks before AI; user-provided value is labeled and unused extra keys are excluded", async () => {
  const r = request("Send resume with Expected CTC and current location.");
  await assert.rejects(
    generateEmail(r, { ai: () => assert.fail("must not call AI") }),
    /Additional Information Needed/,
  );
  r.additionalInformation = {
    expectedCTC: "12 LPA",
    ignored: "invented claim",
  };
  const c = buildGenerationContext(r);
  assert.equal(
    c.applicationInformation.find((x) => x.key === "expectedCTC").source,
    "user_provided",
  );
  assert.ok(!JSON.stringify(c).includes("invented claim"));
});
test("generation verifies independently; deterministic gaps trigger exactly one repair", async () => {
  let calls = 0;
  const result = await generateEmail(request(), {
    ai: async ({ schema }) => {
      calls++;
      return {
        model: "test-model",
        value:
          calls === 1
            ? { ...draft, body: draft.body + " I use Appium." }
            : schema.properties.supported
              ? { supported: true, issues: [] }
              : draft,
      };
    },
  });
  assert.equal(calls, 3);
  assert.equal(result.metadata.validation.repairAttempts, 1);
  assert.equal(result.metadata.status, "verified");
});
test("semantic audit rejects invented tenure and fails closed after one repair", async () => {
  let calls = 0;
  await assert.rejects(
    generateEmail(request(), {
      ai: async ({ schema }) => {
        calls++;
        return {
          model: "test",
          value: schema.properties.supported
            ? {
                supported: false,
                issues: [
                  "Unsupported experience claim: three years of Selenium.",
                ],
              }
            : {
                ...draft,
                body:
                  draft.body + " I have three years of Selenium experience.",
              },
        };
      },
    }),
    /one repair/,
  );
  assert.equal(calls, 4);
});
test("malformed output is rejected", () => {
  for (const value of [
    null,
    {},
    { ...draft, subject: "a\nb" },
    { ...draft, body: "Internal server error" },
    { ...draft, body: "" },
  ])
    assert.ok(validateEmail(value).length);
});
function harness() {
  const elements = {},
    element = () => ({
      value: "",
      children: [],
      listeners: {},
      append(...x) {
        this.children.push(...x);
      },
      replaceChildren() {
        this.children = [];
      },
      setAttribute() {},
      addEventListener(k, f) {
        this.listeners[k] = f;
      },
    }),
    get = (id) => (elements[id] ||= element());
  const r = request(),
    state = {
      confirmedJobProfile: r.job,
      confirmedRequirementsProfile: r.requirements,
      confirmedCandidateProfile: r.candidate,
      confirmedRelevanceProfile: r.relevance,
    };
  const pending = [],
    copied = [];
  const ui = createEmailController(
    state,
    { querySelector: (s) => get(s.slice(1)), createElement: element },
    {
      clipboard: { writeText: async (t) => copied.push(t) },
      fetchImpl: async (url, options) =>
        url.endsWith("ai-providers")
          ? {
              ok: true,
              json: async () => ({
                providers: [{ id: "bynara", label: "Bynara", available: true }],
              }),
            }
          : new Promise((resolve) => pending.push({ resolve, options })),
    },
  );
  return { state, ui, get, pending, copied };
}
test("editing/copying preserve original and count; source change aborts and ignores stale generation", async () => {
  const h = harness();
  await h.ui.onConfirmed();
  h.get("email-provider").value = "bynara";
  h.get("email-tone").value = "professional";
  h.get("email-length").value = "standard";
  const run = h.get("email-generate").listeners.click();
  h.get("email-generate").listeners.click();
  assert.equal(h.pending.length, 1);
  h.pending[0].resolve({
    ok: true,
    json: async () => ({ ...draft, metadata: { status: "verified" } }),
  });
  await run;
  h.get("email-body").value = "Hello, edited";
  h.get("email-body").listeners.input();
  assert.equal(h.state.originalEmail.body, draft.body);
  assert.equal(h.state.generationCount, 1);
  for (const id of ["email-copy-subject", "email-copy-body", "email-copy-all"])
    await h.get(id).listeners.click();
  assert.deepEqual(h.copied, [
    draft.subject,
    "Hello, edited",
    `Subject: ${draft.subject}\n\nHello, edited`,
  ]);
  const second = h.get("email-generate").listeners.click();
  h.state.confirmedCandidateProfile = null;
  h.ui.invalidate();
  assert.equal(h.pending[1].options.signal.aborted, true);
  h.pending[1].resolve({
    ok: true,
    json: async () => ({
      ...draft,
      body: "stale",
      metadata: { status: "verified" },
    }),
  });
  await second;
  assert.equal(h.state.generationCount, 1);
  assert.equal(h.state.emailStatus, "outdated");
  assert.equal(h.state.editedEmail.body, "Hello, edited");
});
test("email HTTP endpoints enforce content type, origin and size, serve UI but never server modules", async (t) => {
  let calls = 0;
  const server = createAppServer({
    availability: () => providerAvailability({}),
    generate: async () => {
      calls++;
      return { ...draft, metadata: { status: "verified" } };
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (body, headers = { "Content-Type": "application/json" }) =>
    fetch(base + "/api/generate-email", { method: "POST", headers, body });
  assert.equal((await fetch(base + "/src/email-ui.js")).status, 200);
  assert.equal((await fetch(base + "/src/server/ai-provider.js")).status, 404);
  assert.ok(
    (await (await fetch(base + "/api/ai-providers")).json()).providers.every(
      (x) => !x.available,
    ),
  );
  assert.equal((await fetch(base + "/api/generate-email")).status, 405);
  assert.equal(
    (await send("{}", { "Content-Type": "text/plain" })).status,
    415,
  );
  assert.equal(
    (
      await send("{}", {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      })
    ).status,
    403,
  );
  assert.equal((await send("invalid")).status, 400);
  assert.equal(
    (await send(JSON.stringify({ value: "x".repeat(1500001) }))).status,
    413,
  );
  assert.equal(calls, 0);
  const response = await send(JSON.stringify(request()));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls, 1);
});

test("schema echo triggers one re-audit and aggregates usage without approving malformed output", async () => {
  let calls = 0;
  const result = await generateEmail(request(), {
    ai: async ({ schema }) => {
      calls++;
      return {
        model: "test",
        value:
          calls === 1
            ? draft
            : calls === 2
              ? schema
              : { supported: true, issues: [] },
        usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
      };
    },
  });
  assert.equal(calls, 3);
  assert.deepEqual(result.metadata.usage, {
    inputTokens: 300,
    outputTokens: 60,
    totalTokens: 360,
    reportedCalls: 3,
    providerCalls: 3,
    complete: true,
  });
});
test("repeated malformed audits fail closed and missing usage is not claimed complete", async () => {
  let calls = 0;
  await assert.rejects(
    generateEmail(request(), {
      ai: async ({ schema }) => {
        calls++;
        return { model: "test", value: calls === 1 ? draft : schema };
      },
    }),
    (error) => error.code === "invalid_response",
  );
  assert.equal(calls, 3);
  const result = await generateEmail(request(), {
    ai: async ({ schema }) => ({
      model: "test",
      value: schema.properties.supported
        ? { supported: true, issues: [] }
        : draft,
    }),
  });
  assert.equal(result.metadata.usage.complete, false);
  assert.equal(result.metadata.usage.reportedCalls, 0);
});
