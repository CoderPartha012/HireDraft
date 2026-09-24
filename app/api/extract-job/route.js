import {
  extractJob,
  ExtractionError,
} from "../../../src/server/extract-job.js";
import { readJson, json, failure } from "../../../src/server/http.js";
export const runtime = "nodejs";
export async function POST(request) {
  try {
    const body = await readJson(request);
    if (
      !body ||
      Array.isArray(body) ||
      typeof body !== "object" ||
      Object.keys(body).some((key) => key !== "url")
    )
      throw new ExtractionError(
        "invalid_request",
        "Send only the job URL.",
        400,
      );
    return json(await extractJob(body.url, { signal: request.signal }));
  } catch (error) {
    return failure(error, "Unable to retrieve job details. Please try again.", {
      job: null,
    });
  }
}
