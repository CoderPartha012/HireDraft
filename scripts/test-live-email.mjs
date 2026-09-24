// Explicit, paid opt-in smoke test using synthetic candidate facts only.
// Keys are loaded from .env by Node; never print credentials or raw provider errors.
import { jobProfile, candidateProfile } from "../tests/relevance-fixtures.js";
import {
  matchProfiles,
  confirmRelevanceProfile,
} from "../src/relevance-engine.js";
import { generateEmail } from "../src/server/email-generation.js";
const requirements = jobProfile(
  "Required Skills: Selenium, Java\nResponsibilities: Maintain automated tests.",
);
const candidate = candidateProfile(
  "Jane Doe\nQA Engineer\nSkills\nSelenium, Java\nProjects\nProject: Test Suite\nBuilt automated tests using Selenium and Java.",
);
const relevance = confirmRelevanceProfile(
  matchProfiles(requirements, candidate),
  requirements,
  candidate,
);
for (const provider of process.argv.slice(2)) {
  const started = Date.now();
  try {
    const payload = {
      job: requirements.source.confirmedJobProfile,
      requirements,
      candidate,
      relevance,
      provider,
      length: "short",
      tone: "professional",
    };
    let result;
    if (process.env.LIVE_TEST_BASE_URL) {
      const response = await fetch(
        `${process.env.LIVE_TEST_BASE_URL}/api/generate-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: process.env.LIVE_TEST_BASE_URL,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(235000),
        },
      );
      result = await response.json();
      if (!response.ok)
        throw Object.assign(new Error(result.error?.message), {
          code: result.error?.code,
          httpStatus: response.status,
        });
    } else result = await generateEmail(payload);
    console.log(
      JSON.stringify({
        provider,
        success: true,
        subject: result.subject,
        body: result.body,
        metadata: result.metadata,
      }),
    );
  } catch (error) {
    process.exitCode = 1;
    console.log(
      JSON.stringify({
        provider,
        success: false,
        code: error.code || error.name,
        status: error.httpStatus,
      }),
    );
  }
}
