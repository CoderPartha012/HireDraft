import test from "node:test";
import assert from "node:assert/strict";
import { requestAI, providerAvailability } from "../src/server/ai-provider.js";
import { generateEmail } from "../src/server/email-generation.js";
import { jobProfile, candidateProfile } from "./relevance-fixtures.js";
import {
  matchProfiles,
  confirmRelevanceProfile,
} from "../src/relevance-engine.js";
const draft = {
  subject: "QA Engineer application",
  body: "Hello, I am applying for the QA Engineer role. My Selenium and Java experience is relevant to your testing requirements. I would welcome a conversation. Best, Jane Doe",
};
const reply = (content, finish_reason = "stop") =>
  Response.json({ choices: [{ finish_reason, message: { content } }] });

test("Ollama uses the authenticated local gateway with structured output", async () => {
  const schema = {
    type: "object",
    properties: { subject: { type: "string" } },
  };
  const result = await requestAI(
    { provider: "ollama", schema, data: {} },
    {
      env: { OLLAMA_GATEWAY_API_KEY: "local-secret" },
      fetchImpl: async (url, init) => {
        assert.equal(url, "http://127.0.0.1:8000/v1/chat/completions");
        assert.equal(init.headers.Authorization, "Bearer local-secret");
        const body = JSON.parse(init.body);
        assert.equal(body.model, "qwen2.5:0.5b");
        assert.deepEqual(body.response_format.json_schema.schema, schema);
        assert.equal(body.max_tokens, 1024);
        return reply(JSON.stringify(draft));
      },
    },
  );
  assert.deepEqual(result.value, draft);
  assert.ok(
    !JSON.stringify(
      providerAvailability({ OLLAMA_GATEWAY_API_KEY: "local-secret" }),
    ).includes("local-secret"),
  );
});
test("only the new providers are exposed without credentials", () => {
  assert.deepEqual(
    providerAvailability({}).map((p) => p.id),
    ["ollama", "bynara", "apinex"],
  );
  assert.ok(providerAvailability({}).every((p) => !p.available));
  assert.ok(
    !JSON.stringify(
      providerAvailability({ BYNARA_API_KEY: "secret" }),
    ).includes("secret"),
  );
});
for (const [provider, key, model, host] of [
  ["bynara", "BYNARA_API_KEY", "agnes-2.5-flash", "router.bynara.id"],
  ["apinex", "APINEX_API_KEY", "gpt/5.6-sol", "api.apinex.bond"],
]) {
  const env = { [key]: "secret" },
    options = {
      provider,
      system: "Only confirmed facts.",
      data: { facts: [] },
      schema: { type: "object" },
    };
  test(
    provider +
      " sends the exact model, endpoint, isolated credential and JSON instructions",
    async () => {
      const result = await requestAI(options, {
        env,
        fetchImpl: async (url, init) => {
          assert.equal(url, "https://" + host + "/v1/chat/completions");
          assert.equal(init.headers.Authorization, "Bearer secret");
          const body = JSON.parse(init.body);
          assert.equal(body.model, model);
          assert.equal(body.response_format, undefined);
          assert.match(body.messages[0].content, /JSON schema/);
          assert.ok(!init.body.includes("secret"));
          return reply(JSON.stringify(draft));
        },
      });
      assert.deepEqual(result.value, draft);
      assert.equal(result.model, model);
    },
  );
  test(
    provider + " rejects invalid, truncated and refused responses",
    async () => {
      for (const payload of [
        reply("not JSON"),
        reply("{}", "length"),
        reply("[]"),
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { refusal: "no", content: "{}" },
            },
          ],
        }),
      ])
        await assert.rejects(
          requestAI(options, { env, fetchImpl: async () => payload }),
          (e) => e.code === "invalid_response",
        );
    },
  );
  test(provider + " reports safe actionable service errors", async () => {
    for (const [status, code] of [
      [401, "authentication_failed"],
      [403, "authentication_failed"],
      [402, "credits_required"],
      [429, "rate_limit"],
      [500, "unavailable"],
    ])
      await assert.rejects(
        requestAI(options, {
          env,
          fetchImpl: async () => Response.json({ error: "secret" }, { status }),
        }),
        (e) => e.code === code && !e.message.includes("secret"),
      );
    await assert.rejects(
      requestAI(
        { ...options, signal: AbortSignal.abort() },
        {
          env,
          fetchImpl: async () => {
            throw Error("secret");
          },
        },
      ),
      (e) => e.code === "timeout",
    );
    await assert.rejects(
      requestAI(options, {
        env,
        fetchImpl: async () => {
          throw Error("secret");
        },
      }),
      (e) => e.code === "unavailable",
    );
  });
  test(provider + " completes drafting and independent audit", async () => {
    const requirements = jobProfile(),
      candidate = candidateProfile(),
      relevance = confirmRelevanceProfile(
        matchProfiles(requirements, candidate),
        requirements,
        candidate,
      );
    let calls = 0;
    const result = await generateEmail(
      {
        provider,
        job: requirements.source.confirmedJobProfile,
        requirements,
        candidate,
        relevance,
      },
      {
        ai: (args) =>
          requestAI(args, {
            env,
            fetchImpl: async (url, init) => {
              calls++;
              const audit = JSON.parse(init.body).messages[0].content.includes(
                '"supported"',
              );
              return reply(
                JSON.stringify(audit ? { supported: true, issues: [] } : draft),
              );
            },
          }),
      },
    );
    assert.equal(calls, 2);
    assert.equal(result.metadata.status, "verified");
    assert.equal(result.metadata.model, model);
  });
}
test("removed providers cannot issue requests", async () => {
  for (const provider of [
    "openai",
    "gemini",
    "claude",
    "groq",
    "aimlapi",
    "bazaarlink",
    "puter",
    "ollama",
    "lmstudio",
  ])
    await assert.rejects(
      requestAI(
        { provider },
        { env: { OPENAI_API_KEY: "secret" }, fetchImpl: () => assert.fail() },
      ),
      (e) => e.code === "unavailable",
    );
});
test("a single JSON markdown fence is accepted", async () => {
  const fence = String.fromCharCode(96).repeat(3);
  const result = await requestAI(
    { provider: "bynara" },
    {
      env: { BYNARA_API_KEY: "secret" },
      fetchImpl: async () =>
        reply(fence + "json\n" + JSON.stringify(draft) + "\n" + fence),
    },
  );
  assert.deepEqual(result.value, draft);
});

test("Bynara Telegram requirement is actionable without leaking upstream details", async () => {
  await assert.rejects(
    requestAI(
      { provider: "bynara" },
      {
        env: { BYNARA_API_KEY: "secret" },
        fetchImpl: async () =>
          Response.json(
            { error: { message: "telegram_required: secret" } },
            { status: 403 },
          ),
      },
    ),
    (e) =>
      e.code === "account_setup_required" &&
      e.message.includes("Telegram") &&
      !e.message.includes("secret"),
  );
});

test("gateway exposes reported usage only when all token counts are valid", async () => {
  for (const [usage, expected] of [
    [
      { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    ],
    [undefined, null],
    [{ prompt_tokens: -1, completion_tokens: 20, total_tokens: 19 }, null],
  ]) {
    const result = await requestAI(
      { provider: "bynara", schema: { type: "object" }, data: {} },
      {
        env: { BYNARA_API_KEY: "test" },
        fetchImpl: async () =>
          Response.json({
            choices: [
              { finish_reason: "stop", message: { content: '{"ok":true}' } },
            ],
            usage,
          }),
      },
    );
    assert.deepEqual(result.usage, expected);
  }
});
