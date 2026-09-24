import { ExtractionError } from "./extract-job.js";

export const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export function checkOrigin(request) {
  const origin = request.headers.get("origin");
  // Next may construct request.url with its bind hostname (localhost), while
  // the browser uses 127.0.0.1 or the deployed domain. Host is authoritative;
  // do not accept an arbitrary forwarded-host header as an alternate origin.
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = ["http", "https"].includes(forwardedProtocol)
    ? `${forwardedProtocol}:`
    : url.protocol;
  if (origin && origin !== `${protocol}//${host}`)
    throw new ExtractionError("origin", "Request origin is not allowed.", 403);
}

export async function readBytes(request, limit) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new ExtractionError("too_large", "Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ExtractionError("too_large", "Request is too large.", 413);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function readJson(request, limit = 8192) {
  checkOrigin(request);
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new ExtractionError("invalid_request", "Use application/json.", 415);
  const bytes = await readBytes(request, limit);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new ExtractionError(
      "invalid_request",
      "Send a valid JSON object.",
      400,
    );
  }
}

export function failure(error, fallback, extra = {}) {
  const known =
    Number.isInteger(error.httpStatus) && typeof error.code === "string";
  return json(
    {
      ...extra,
      error: {
        code: known ? error.code : "internal",
        message: known ? error.message : fallback,
      },
    },
    known ? error.httpStatus : 500,
  );
}
