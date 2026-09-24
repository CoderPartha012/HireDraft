import { generateEmail } from "../../../src/server/email-generation.js";
import { readJson, json, failure } from "../../../src/server/http.js";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function POST(request) {
  try {
    const body = await readJson(request, 1500000);
    return json(await generateEmail(body, { signal: request.signal }));
  } catch (error) {
    return failure(error, "Email generation failed. Please try again.");
  }
}
