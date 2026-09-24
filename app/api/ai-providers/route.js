import { providerAvailability } from "../../../src/server/ai-provider.js";
import { json } from "../../../src/server/http.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return json({ providers: providerAvailability() });
}
