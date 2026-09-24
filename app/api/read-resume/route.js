import {
  readResume,
  MAX_RESUME_BYTES,
  ResumeError,
} from "../../../src/server/resume-reader.js";
import {
  checkOrigin,
  readBytes,
  json,
  failure,
} from "../../../src/server/http.js";
export const runtime = "nodejs";
export async function POST(request) {
  try {
    checkOrigin(request);
    let filename;
    try {
      filename = decodeURIComponent(request.headers.get("x-resume-name") || "");
    } catch {
      throw new ResumeError("invalid_request", "Invalid resume filename.", 400);
    }
    const buffer = await readBytes(request, MAX_RESUME_BYTES - 1);
    return json(
      await readResume(buffer, {
        filename,
        type: (request.headers.get("content-type") || "").split(";")[0],
        signal: request.signal,
      }),
    );
  } catch (error) {
    return failure(
      error,
      "The document could not be processed. Try another file or enter your information manually.",
    );
  }
}
