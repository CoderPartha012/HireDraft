export class GenerationError extends Error {
  constructor(code, message, httpStatus = 422) {
    super(message);
    Object.assign(this, { code, httpStatus });
  }
}
const providers = {
  ollama: {
    label: "Ollama · local test",
    key: "OLLAMA_GATEWAY_API_KEY",
    model: "qwen2.5:0.5b",
    endpoint: "http://127.0.0.1:8000/v1/chat/completions",
  },
  bynara: {
    label: "Bynara",
    key: "BYNARA_API_KEY",
    model: "agnes-2.5-flash",
    endpoint: "https://router.bynara.id/v1/chat/completions",
  },
  apinex: {
    label: "APInex",
    key: "APINEX_API_KEY",
    model: "gpt/5.6-sol",
    endpoint: "https://api.apinex.bond/v1/chat/completions",
  },
};
export const supportedProviderIds = Object.freeze(Object.keys(providers));
export function providerAvailability(env = process.env) {
  return Object.entries(providers).map(([id, p]) => ({
    id,
    label: p.label + " (" + p.model + ")",
    available: Boolean(env[p.key]?.trim()),
  }));
}
export async function requestAI(
  { provider, system, data, schema, signal },
  {
    env = process.env,
    fetchImpl = fetch,
    timeout = provider === "ollama" ? 125000 : 55000,
  } = {},
) {
  const config = providers[provider];
  if (!config || !env[config.key]?.trim())
    throw new GenerationError(
      "unavailable",
      "This AI provider is currently unavailable. Configure its API key and restart the server.",
      503,
    );
  const deadline = AbortSignal.timeout(timeout);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    let response;
    try {
      response = await fetchImpl(config.endpoint, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env[config.key].trim(),
          "Content-Type": "application/json",
        },
        // Standard parameters work on gateways that do not implement native JSON schemas.
        body: JSON.stringify({
          model: config.model,
          ...(provider === "ollama"
            ? {
                max_tokens: 1024,
                temperature: 0.2,
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "hiredraft",
                    schema: schema || { type: "object" },
                  },
                },
              }
            : {}),
          messages: [
            {
              role: "system",
              content:
                (system || "") +
                "\nReturn a JSON INSTANCE satisfying the JSON schema below. Do NOT return the schema itself. Populate the fields with your actual answer, without markdown or commentary. Schema: " +
                JSON.stringify(schema || {}) +
                (schema?.properties?.supported
                  ? '\nYour answer must contain exactly supported (a boolean) and issues (an array of strings). Passing shape: {"supported":true,"issues":[]}. Failing shape: {"supported":false,"issues":["Describe the unsupported claim"]}. Perform the audit before choosing either outcome.'
                  : ""),
            },
            { role: "user", content: JSON.stringify(data || {}) },
          ],
        }),
        signal: requestSignal,
      });
    } catch (error) {
      if (requestSignal.aborted) throw error;
      throw new GenerationError(
        "unavailable",
        provider === "ollama"
          ? "The local gateway is not reachable. Run npm.cmd run llm in a second terminal, keep Ollama running, and try again."
          : config.label +
              " could not be reached. Please try again or select the other provider.",
        503,
      );
    }
    if (!response.ok) {
      if (provider === "ollama") {
        const messages = {
          401: "The local gateway key is invalid or expired. Check OLLAMA_GATEWAY_API_KEY.",
          403: "Local LLM access is disabled or this model is not allowed. Enable the hiredraft-local gateway user.",
          422: "This application context exceeds the local test model's input limits. Try a shorter resume or job description.",
          503: "Start Ollama and install qwen2.5:0.5b, then try again.",
          504: "The local model timed out. Try a shorter resume or job description.",
        };
        if (messages[response.status])
          throw new GenerationError(
            "local_gateway_error",
            messages[response.status],
            response.status === 504 ? 504 : 503,
          );
      }
      if (provider === "bynara" && response.status === 403) {
        let failure;
        try {
          failure = await response.json();
        } catch {
          /* Keep generic safe handling. */
        }
        if (failure?.error?.message?.startsWith("telegram_required:"))
          throw new GenerationError(
            "account_setup_required",
            "Bynara requires you to link your Telegram account at router.bynara.id/settings before generating emails. Complete that step and try again, or select APInex.",
            503,
          );
      }
      if ([401, 403].includes(response.status))
        throw new GenerationError(
          "authentication_failed",
          config.label +
            " rejected the API key or access to this model. Check the server API key and account permissions.",
          503,
        );
      if (response.status === 402)
        throw new GenerationError(
          "credits_required",
          config.label +
            " requires credits. Add credits or select the other provider.",
          503,
        );
      if (response.status === 429)
        throw new GenerationError(
          "rate_limit",
          config.label +
            " is temporarily busy or its quota is exhausted. Try again shortly or select the other provider.",
          429,
        );
      throw new GenerationError(
        "unavailable",
        config.label +
          " is currently unavailable. Try again or select the other provider.",
        503,
      );
    }
    const result = await response.json();
    const choice = result.choices?.[0],
      content = choice?.message?.content;
    if (
      choice?.finish_reason !== "stop" ||
      choice.message?.refusal ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 30000
    )
      throw new Error("invalid");
    const fence = String.fromCharCode(96).repeat(3);
    let text = content.trim();
    if (text.startsWith(fence) && text.endsWith(fence))
      text = text
        .slice(3, -3)
        .replace(/^json\s*/i, "")
        .trim();
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("invalid");
    const u = result.usage;
    const validCount = (n) => Number.isSafeInteger(n) && n >= 0;
    const usage =
      u &&
      [u.prompt_tokens, u.completion_tokens, u.total_tokens].every(validCount)
        ? {
            inputTokens: u.prompt_tokens,
            outputTokens: u.completion_tokens,
            totalTokens: u.total_tokens,
          }
        : null;
    return { value, model: config.model, usage };
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    if (requestSignal.aborted)
      throw new GenerationError(
        "timeout",
        "Email generation took too long or was cancelled. Please try again.",
        504,
      );
    throw new GenerationError(
      "invalid_response",
      "The model returned an invalid response. Please try again or select the other provider.",
      502,
    );
  }
}
