# HireDraft — Day 6

A job analysis page for LinkedIn job listings and hiring posts, with server-side
retrieval, deterministic extraction, manual fallback, review/edit, confirmation,
and evidence-backed structured requirements analysis. Day 5 adds PDF/DOCX resume
reading, candidate facts with source evidence, editable records, and separate
Candidate Profile confirmation.
Day 6 compares the two confirmed profiles, ranks relevant evidence, and creates
a separate relevance profile with selected highlights and email grounding context.

## Run

With Node.js 22.13 or newer installed (Node.js 24 recommended):

```sh
npm install
npm start
```

Open http://localhost:3000/analyze-job. Run validation tests with `npm test`.
On Windows PowerShell, use `npm.cmd start` and `npm.cmd test` if script execution
policy blocks the `npm` wrapper.

To restart after changing server code, stop your previous server with Ctrl+C
and run `npm.cmd start` again. There is no `npm run dev` script. If port 3000 is
occupied, the server prints instructions instead of an unhandled error stack.
Use `$env:PORT = "3001"` before starting to choose a different port, then open
http://localhost:3001/analyze-job.

The form trims input, checks HTTP(S) URL format, allows only `linkedin.com` and
`www.linkedin.com`, and recognizes:

- `/jobs/view/1234567890` (or a descriptive slug ending in the job ID): `linkedin_job`.
- `/feed/update/urn:li:activity:7505130007300575232/`: `linkedin_post`.
- `/posts/author_hiring-activity-7505130007300575232-Ab12` (also share permalinks): `linkedin_post`.

Post permalinks must include an activity/share ID. Profiles, company pages,
generic feed/search/messaging pages, and malformed permalinks remain unsupported.
Include `https://` when pasting a link.
Query parameters and fragments are supported. Format validation does not verify
that the job exists or is still open.

`validateLinkedInUrl` in `src/validate-job-url.js` is the shared pure validator
and source detector. The strict Day 1 `validateJobUrl` export remains available
for job-only callers. After validation,
the browser sends only `{ "url": "..." }` to `POST /api/extract-job`. The server
independently validates the URL before retrieval. No browser-side scraping occurs.

`src/server/extract-job.js` uses Cheerio to parse JSON-LD JobPosting data first,
explicit job-specific metadata second, and recognized LinkedIn job elements last.
Structured field names follow [Schema.org JobPosting](https://schema.org/JobPosting).
Generic social-preview summaries are not used as full descriptions. Missing
values remain `null`; available fields are shown even when extraction is partial.
A complete result needs title, company, and a description containing at least
40 non-whitespace characters. This is a basic usability check, not proof that
the source supplied the entire posting.

Retrieval uses HTTPS, removes query/fragment tracking from the outgoing URL, and
follows at most three redirects, revalidating each one and requiring the same
resource ID and source type. Activity-to-public-post redirects for the same
post are allowed. Login, external, and insecure redirects are not followed. Authentication,
CAPTCHAs, and access restrictions are never bypassed. Retrieval has a 12-second
timeout (including response body), a 2 MiB page limit, and no automatic retries.
The browser adds a 15-second timeout. Network failures and timeouts offer Try Again.

`jobAnalysisState` exported from `src/app.js` retains:

- `status` and `validatedJobUrl`: the existing Day 1 validation handoff.
- `extractionStatus`: `idle`, `loading`, `success`, `partial`, or `failed`.
- `job`: source, source URL, title, company, readable raw description, extraction
  status, timestamp, original extracted values in `raw`, and field provenance.
- `extractionError`: a safe failure code/message.
- `manualJob`: separately captured manual title/company/description and timestamp.
- `sourceType`: detected LinkedIn resource type.
- `draftProfile`: normalized reviewable data, isolated from original extraction.
- `confirmedJobProfile`: a separate confirmed snapshot, or `null` until confirmation.
- `reviewStatus`: `idle`, `review`, `editing`, `manual`, or `confirmed`.
- `analysisStatus`: `raw`, `analyzing`, `analyzed`, `editing`, `confirmed`, or `analysis_failed`.
- `draftAnalysis`: reviewable structured requirements, or `null` before analysis.
- `confirmedRequirementsProfile`: independent confirmed Day 4 handoff, or `null`.
- `analysisError`: failure code, without changing the original confirmed job.

## Hiring posts and the common Job Profile

`src/server/extract-post.js` is a separate post strategy. It prefers matched
JSON-LD post body/text, then scoped LinkedIn main-post elements. Post field names
follow [Schema.org SocialMediaPosting](https://schema.org/SocialMediaPosting).
Related posts and comment text are not used as the main post. Generic social
preview descriptions are not assumed to contain the complete post.

Hiring intent checks require explicit hiring language with identifiable roles.
Career advice, hiring-trend commentary, hiring freezes, negated hiring statements,
and job-seeker requests are rejected with a manual fallback. Rules are intentionally
conservative and focus on English posts; unfamiliar wording may need manual entry.

The parser captures labeled title/company/location/experience/skills/employment
information, recognizable role names, explicitly mentioned technologies, email
addresses, contact numbers, and external links. Company detection uses explicit
company labels or a hiring-at statement; the author's employer is never substituted.
Unrecognized facts remain `null` and display as “Not specified.” External URLs are
captured only and never fetched. All discovered emails are retained separately;
an application or recruiter email is assigned only when labeled clearly.

`src/job-profile.js` normalizes both strategies into the same structure:
source platform/type/URL, title, company, location, experience, skills, employment
type, `jobSourceContent`, recruiter contacts, application links/emails, author
metadata, extraction status/time, and original full post content. The old
`jobDescription` field remains as a compatibility alias. The API returns both
the original `job` and normalized `profile`.

Multiple-role posts require selection. Only the selected role's section and
clearly shared preceding context enter the profile, including role-specific
experience, skills, and contacts. The confirmed profile contains only that role;
the complete source and original role list remain in `job`. When roles share a
single inseparable line, selecting a title does not invent per-role content:
use Edit Details to enter the relevant content before confirming.

Edit Details → Save Changes updates the draft and preserves original extraction.
Save Manual Details creates the same normalized draft through manual entry.
Both paths require a title and source content; company and recruiter/location
fields are optional. An entered recruiter email must have a valid email format.
Confirm Job Details creates `confirmedJobProfile` with a timestamp and independent
copies of nested data. Day 4 must consume only this confirmed handoff. Editing,
changing roles, starting another retrieval, or clearing the URL invalidates it.

Descriptions are rendered as text with paragraph breaks and bullets; source HTML
is never injected into the page. Manual fields appear for failed and partial
extraction and capture input without changing the original extracted job object.
Editing or clearing the URL aborts extraction, ignores late responses, clears
all extracted/manual information, and cancels validation. Data is held only in
memory; reloading loses it. There is no database.

## Structured requirements analysis

After **Confirm Job Details**, select **Analyze Job Requirements**. Day 4 reads
only `confirmedJobProfile`; it does not scrape LinkedIn again or make a network
request. Both jobs and posts use the same analysis code. Only selected-role
`jobSourceContent` is analyzed; the original full post stays available as context.

`src/requirements-analysis.js` uses deterministic English rules and a skill
alias dictionary to organize:

- Required/preferred skills, mentioned skills with unspecified priority, and
  explicit exclusions. Categories cover languages, automation, API testing,
  databases, CI/CD, testing practices, and other tools.
- Overall experience bounds, technology-specific tenure, and conflicting ranges.
  “2+ years” has no invented maximum; plain “3 years” also leaves the maximum open.
- Responsibilities, education/field/equivalent experience, domains, certifications,
  and soft skills.
- Employment type, explicit work mode, joining/notice preferences, and shifts.
  The confirmed location is preserved; new source locations are supplements.
- Recruiter/application context, email addresses/links, application methods,
  subject instructions, and requested CV/CTC/notice/location information.
- Deduplicated meaningful technology/testing/domain keywords.

Required/preferred headings and explicit wording drive classification. Unclear
mentions remain separately labeled and never become mandatory automatically.
Unfamiliar explicitly labeled skills are retained; absent skills, qualifications,
and numeric experience are not filled in. The rules are conservative and cannot
interpret every natural-language variation. Review results and correct unfamiliar
wording. Missing sections show **Not specified**; sparse posts are valid partial
analyses, not failures. Input above 200,000 characters produces a recoverable
analysis error rather than locking the page.

Each extracted item includes exact source evidence, offsets, section context,
and verification status. Evidence is checked against the confirmed content or
the confirmed Day 3 field before returning/confirming analysis. Source text is
rendered safely as text and remains intact when the analysis is edited.

**Edit Analysis → Save Analysis Changes** lets users add/remove/edit skills,
experience, responsibilities, education, location, work mode, domains, joining
requirements, and application instructions. List editors use one item per line.
Skills normalize aliases and cannot appear in multiple edited priority lists.
Corrections are recorded in `corrections`; new user items are `user_provided`
with no fabricated source evidence. Reclassified source items keep their original
evidence and carry a classification-correction flag. Original source facts and
user corrections remain distinguishable.

**Confirm Job Analysis** creates `confirmedRequirementsProfile` with an independent
source snapshot, identity, employment, technical, professional, application,
keywords, and verification sections. Items become `user_confirmed` while retaining
their prior extraction status. Day 5 must consume this confirmed profile only.
Editing analysis invalidates confirmation. Changing/reconfirming job details,
changing roles, retrieval, or Clear resets the entire Day 4 flow. A failed analysis
keeps Day 3 details intact and offers Try Again; missing content points users back
to Edit Details.

## Browser checks

- Empty or whitespace-only input keeps Analyze Job disabled.
- Random text shows a URL error; Google links show a domain error.
- LinkedIn profile, company, generic feed, malformed post, and messaging links show an unsupported-link error.
- Activity and public post permalinks are detected automatically, including tracking parameters.
- A valid job link shows validation, then retrieval; surrounding spaces are removed.
- Success displays title/company/description and asks the user to review them.
- Partial extraction displays available values, marks missing fields, and offers manual entry.
- Restricted/unavailable/unrecognized pages offer manual entry with a specific explanation.
- Network errors and timeouts restore controls and offer Try Again and manual entry.
- Invalid input stays visible so it can be corrected.
- Clear resets all input, feedback, accepted URL, results, and manual fields during either loading stage.
- Changing input during loading cancels validation/extraction and ignores stale results.
- Keyboard users can submit with Enter and see focus indicators; feedback is announced.
- Multiple-role posts require a choice; switching roles removes previous confirmation.
- Editing and manual entry validate required fields and retain saved corrections.
- Confirmation produces a reviewed profile; changes and Clear invalidate it.
- Confirmed job details unlock requirements analysis without another source request.
- Review evidence for required/preferred/mentioned skills and experience.
- Edit/save/confirm analysis creates the Day 5 requirements handoff.
- Clear or changes to Day 3 details reset analysis and cancel pending analysis.

## Verification

`npm test` includes preserved Day 1 checks, fixture-based extraction/failure tests,
HTTP endpoint integration, and simulated DOM lifecycle tests for cancellation,
timeout, retry, partial rendering, manual capture, role selection, editing, and
confirmation. HTML checks cover unique IDs and labeled fields. These DOM tests do not
replace visual browser QA.

Day 4 adds detailed/short-source analysis fixtures, priority and negation checks,
alias normalization, experience bounds/scoping, application instructions, exact
evidence verification, user corrections, confirmation, failure/retry, and complete
Day 3 → Day 4 state-flow coverage. Day 5 extends these with candidate and document tests.
Day 4 verification uses local fixtures and confirmed content; no new LinkedIn
scraping is needed to test requirements analysis.

On 2026-09-15, a real public [Cisco job posting](https://www.linkedin.com/jobs/view/senior-software-qa-engineer-ai-software-platform-team-hybrid-milpitas-ca-at-cisco-4454822033)
was retrieved successfully: title, company, and a 7,626-character description
were extracted from page content. Live LinkedIn availability varies by posting
and environment.

Day 3 retrieval of a public [Pragya Arora hiring post](https://www.linkedin.com/posts/pragya-arora-162377203_hiring-qaengineer-softwaretesting-activity-7486329517544775680-3zd1)
also returned the full 1,899-character post, author, QA Engineer role, and explicit
location. Extraction was correctly partial because the company was not reliably
recognized. No connected browser was available for visual QA.

Day 4 includes no AI, matching, authentication, database,
or email generation. The full product direction is in `docs/PRODUCT_SPEC.md`.

## Day 5 — Candidate Profile

After confirming Job Details and Job Analysis, choose **Add Your Profile**.
Upload a PDF or DOCX smaller than 5 MB, then choose **Read Resume**. Review the
Candidate Profile, use **Edit Profile** to correct or remove information, and
choose **Confirm Candidate Profile**. Manual information entry is available
when a document cannot be read. TXT is not supported in this milestone.

The review includes identity/contact links, original professional summary,
separate employment records, skills grouped by category, testing, projects,
education, certifications, achievements, and optional application context.
Employment, projects, education, and certifications have individual editable
fields and add/remove controls. Resume facts retain exact source-text evidence
and section names; corrections and additional application context are marked
`user_provided`. A previous email and writing preferences are stored only in
`writingContext` and never used to populate candidate facts.

Experience calculations preserve the original date range and count elapsed
calendar months. Dated overlapping intervals are counted once. Full-time,
internship, other/unspecified, and combined totals stay separate. Unspecified
employment types remain Other until corrected; projects and certifications are
excluded. Year-only, reversed, and future ranges produce review warnings rather
than guessed durations. The calculation date and underlying record IDs are
retained. Current roles support `Present`; dates support September 2024 or
2024-09. Missing totals mean zero **calculated** months, not proof of no experience.

`src/candidate-profile.js` contains pure source-only extraction, normalization,
corrections, verification, date calculations, and deep-snapshot confirmation.
It receives resume text only, with no dependency on the selected job or its
requirements. Extraction is deterministic and depends on recognizable headings
and layouts; review is required for ambiguous names, employers, dates, and other
fields. Multi-column PDFs can have imperfect reading order. OCR is not included.

`src/server/resume-reader.js` validates extension, MIME type, signature, and size.
`src/server/resume-worker.js` reads all PDF pages with PDF.js and reads DOCX XML
paragraphs (including table text, headers, footers, footnotes, and endnotes).
It extracts text only: scripts, macros, instructions, and links are not executed
or followed. DOCX archive counts and expanded sizes are bounded before inflation;
macro-containing, encrypted, malformed, or unsupported archives are rejected.
Processing runs in a memory-limited worker terminated after 12 seconds. The
frontend cancels after 15 seconds and discards stale responses.

`POST /api/read-resume` accepts raw file bytes with the document Content-Type
and an URI-encoded `X-Resume-Name` header. It returns extracted text, file
metadata, page count, extraction status, and warnings, or a recoverable error.
No uploaded file or text is saved to disk, logs, a database, or browser storage.
Text is rendered with `textContent`, never as document HTML. Partial PDFs retain
readable pages and report unreadable pages. Password-protected, image-only,
corrupted, oversized, empty, and unsupported files allow replacement or manual
entry. PDF parsing uses the installed [PDF.js package](https://www.npmjs.com/package/pdfjs-dist).

`src/candidate-ui.js` manages `resumeStatus` (`idle`, `uploading`, `extracting`,
`extracted`, `failed`) and `candidateStatus` (`idle`, `resume_uploaded`,
`extracting`, `reviewing`, `editing`, `confirmed`, `failed`). The shared
`jobAnalysisState` holds `resumeFile` metadata, `extractedResumeText`,
`draftCandidateProfile`, and `confirmedCandidateProfile` independently from
`confirmedRequirementsProfile`. The candidate object contains `identity`,
`professionalSummary`, `experience`, `skills`, `projects`, `education`,
`certifications`, `achievements`, `applicationContext`, `writingContext`,
`source`, `verification`, and correction history. Important facts carry
`value`, `source`, `evidence`, and `userConfirmed`.

Replacing a resume clears the previous candidate before processing; optional
user application/writing context remains. **Clear Candidate Data** clears all
candidate inputs and confirmation, while preserving confirmed job requirements.
Editing candidate facts or context invalidates candidate confirmation. Editing
or reanalyzing job requirements hides the candidate step and invalidates its
confirmation; existing candidate data can be reviewed after job reconfirmation.
Refreshing the page clears all in-memory job and candidate data.

Day 5 adds document, candidate, UI lifecycle, and integrated handoff tests.
No matching, ranking, missing-skill recommendations, AI, or email generation
is included. Visual browser QA remains unverified.

## Day 6 — Job-Candidate Matching and Relevance

Confirm Job Analysis and Candidate Profile, then choose **Check My Match**.
The page compares the confirmed profiles locally; it does not retrieve LinkedIn,
read the uploaded document, or parse the raw resume again. Review **Your Match**,
select the facts in **What Your Application Should Highlight**, optionally use
**Add Highlight** to select another verified fact, and choose
**Confirm Match & Continue**. This opens Day 7 application email generation.

`src/relevance-engine.js` exports the pure `matchProfiles` engine, conservative
skill normalization, a verified candidate-fact registry, highlight selection,
email grounding, and final confirmation. It creates a third independent object
and preserves deep snapshots of both confirmed inputs. Resume and user-provided
facts must have candidate confirmation; resume-derived facts must have source
text evidence. Previous-email claims are excluded from matching and highlights.
Existing source-evidence validators run before matching. No network or document
reader dependency is used by the matching engine.

Required, preferred, and unspecified skills are separate. Selenium and Selenium
WebDriver are equivalents. Explicit tool alternatives such as Selenium or
Playwright, and SQL / MySQL, are handled as one requirement. Related browser
automation tools and relational databases can receive partial matches; related
experience never becomes a claim of knowing the target tool. Appium is not
verified from Selenium, and MongoDB is not verified from MySQL. Testing, API,
database, and automation results are displayed separately. Actual employment
and project evidence ranks ahead of an isolated Skills entry.

Experience uses the confirmed Day 5 totals without recalculating document dates.
Full-time, internship, other/unspecified, and overlap-adjusted combined experience
remain separate. Minimum/range checks use dated full-time experience; missing or
ambiguous dates are unknown. Technology-specific tenure is compared only when a
confirmed structured fact explicitly gives years for the tool. Missing/conflicting
statements remain unknown; company duration is not assigned to every tool used.
Decimal years are preserved. These checks are alignment signals, not hiring or
eligibility decisions.

Education compares explicit degree levels and fields conservatively. Domain
synonyms support direct matches; LegalTech or banking SaaS context does not
become FinTech experience. Certification names require direct support.
Responsibility rules connect concrete activity concepts such as test-case
design, execution, regression, API validation, defect management, and performance
monitoring. Multiple supported activities within one employment/project record
can support a composite responsibility. This is a limited rule-based comparison,
not unrestricted semantic understanding; unfamiliar responsibilities may remain
partial or unverified. All results expose their job and candidate evidence.

Location, work mode, joining/notice period, and shifts are separate compatibility
signals. Explicit relocation, work-mode preferences, availability, and shifts
come from confirmed candidate context. Unknown preferences are not inferred.
The candidate section adds an optional **Work Mode Preferences** field.
Conflicting availability and notice period require review. Common city aliases
are recognized; an explicit different relocation destination is not treated as
compatible. Region, visa, timezone, and complex policy constraints are not inferred.

**Profile Match** is a weighted average of available requirement categories:
required skills 5; experience/responsibilities 4; preferred skills, education,
domain, and certifications 2; unspecified skills/soft skills 1. Strong matches
earn full credit, partial/above-range experience earn half credit, and unverified,
gap, or unknown results earn no verified credit. Unspecified job categories are
excluded. Logistics are not included in the number. Scores are labeled Excellent
(85+), Strong (70+), Moderate (45+), or Limited; no scored requirements yields
Not enough job information. This percentage is not an interview/hiring probability.

Employment, projects, and achievements are ranked with reasons and evidence;
low-relevance facts remain in the Candidate Profile. Highlight controls accept
only IDs from confirmed candidate facts, allow removal and re-addition, and
invalidate relevance confirmation after changes. The selected highlight list is
authoritative for later emphasis; excluded IDs are retained in grounding context.
Requested current/expected CTC, notice period, current location, and resume
availability are checked independently. Missing details are labeled
**User Input Required**. Manual information entry does not fabricate an attached
resume. Salary context is included in email grounding only when requested.

`src/relevance-ui.js` manages `matchStatus`: `profiles_ready`, `matching`,
`matched`, `reviewing`, `confirmed`, or `match_failed`. The shared
`jobAnalysisState` now holds `draftRelevanceProfile`, `confirmedRelevanceProfile`,
and `matchError`. Edits, context changes, resume replacement, candidate clear,
job edits/reanalysis, and new confirmations invalidate the previous match.
Scheduled results are cancelled or ignored after invalidation. Failures preserve
both source profiles and offer recalculation. Results use text-only DOM rendering.

The relevance object contains `target`, requirement-specific matches,
`overallAlignment`, `experience`, `compatibility`, ranked experience/projects/
achievements, application information, potential gaps, verified highlight
options and selected IDs, `unsupportedClaims`, input snapshots, and
`emailGroundingContext`. Grounding includes the target/recruiter/contact/subject,
strong and partial evidence, selected highlights, relevant records, separated
experience, requested logistics, missing fields, prohibited claims, and writing
context explicitly separated from candidate facts. Final confirmation checks
input snapshots and rebuilds results/highlight text from confirmed facts before
producing a deep independent handoff; stale inputs require recalculation.

Day 6 tests cover exact/normalized/related/missing skills, required/preferred
separation, all-page evidence reuse, experience gaps, internships, decimal tenure,
education/domain/logistics/certifications, responsibility evidence, project and
achievement ranking, requested/missing information, highlight selection,
unsupported claims, source immutability, failures, stale-result cancellation,
confirmation, and integrated Day 4 → Day 5 → Day 6 flow without new network calls.
No connected browser was available for visual QA. No AI/model APIs, email
creation, sending, authentication, payments, or application-history database
were added. All data remains in page memory and is cleared by refresh.

Current validation: 225 passing tests (`npm.cmd test`). New matching modules and
the page passed local HTTP checks, and syntax checks passed. No task server was
left running.


## Day 7 ? AI Application Email Generation

After confirming all four profiles, select OpenAI, Gemini, Claude or Groq, complete any
missing requested application information, choose tone/length, and generate.
The subject and body are editable with separate Copy Subject, Copy Email and
Copy All controls. Original generation and edited text remain separate in memory.
Source changes cancel pending requests and label existing drafts Outdated.

### Server configuration

Supply credentials through the server process environment or your secret manager.
Never commit credential values or place them in browser code. The server requires
both a credential and a model ID for each enabled provider:

| Provider | Credential variable | Model variable |
| --- | --- | --- |
| OpenAI | OPENAI_API_KEY | OPENAI_MODEL |
| Gemini | GEMINI_API_KEY | GEMINI_MODEL |
| Claude | ANTHROPIC_API_KEY | ANTHROPIC_MODEL |
| Groq | GROQ_API_KEY | GROQ_MODEL |

Groq uses its own API and appears as **Groq** in the selector. Configure a model
supporting strict JSON Schema output, such as `openai/gpt-oss-120b`. The model is
hosted by Groq and uses only the Groq credential. Generation and factual audits
use the same validation and one-repair pipeline as the other providers.
Groq uses the supplied example's 2,048-token output budget and medium reasoning,
with non-streaming structured JSON so drafts can be checked before display.
For a Groq 429 response with a Retry-After of at most 20 seconds, the backend
waits and retries once within the original request timeout. Longer limits still
return a retry message. This transport retry does not consume a generation.
See [Groq structured outputs](https://console.groq.com/docs/structured-outputs).

Claude can also use OpenRouter. Set `CLAUDE_GATEWAY=openrouter`, provide
`OPENROUTER_API_KEY`, and set `OPENROUTER_CLAUDE_MODEL` to a Claude model ID
(for example `anthropic/claude-sonnet-4.6`) in the private `.env` file.
The selector explicitly shows **Claude (via OpenRouter)**. Requests go through
OpenRouter, require structured-output support, and disable routing fallbacks.
Direct Anthropic configuration remains the default when the gateway is unset.
See [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

Choose a model that supports the provider's JSON Schema structured output API.
Model IDs are deliberately configured separately from providers; no model or
credential is silently substituted. Restart the server after configuration changes.
`npm start` loads the private local `.env` file when present. You can also inject
the environment before startup; existing process variables take precedence.
GET /api/ai-providers exposes availability only, never credentials or model setup.
POST /api/generate-email accepts confirmed profiles and preferences.

### Validation and limitations

The backend rebuilds relevance from confirmed snapshots, strips raw documents and
source offsets from the outbound context, and enforces missing application fields.
It validates JSON/length/technical content and conservatively rejects known missing
or partial-match target tools. A separate model request audits subject and body for
unsupported facts and application-instruction compliance. One repair is permitted,
followed by the same checks; failure returns no draft. There is no provider fallback.

Verified means these checks passed against supplied evidence. The semantic audit
is model-based and can miss errors; it is not a proof of factual truth. Users should
review the draft. Manual edits are explicitly unchecked. A normal generation uses
two provider calls; a repair can bring that to four. Each call has a 45-second timeout.
Successful user-requested generations increment an in-memory per-application count;
automatic repairs and edits do not. Persistent quotas and enforcement of the future
three-generation limit remain deferred. Refreshing clears state. Nothing sends email.

Run npm.cmd test on Windows. Provider contracts, safe failures, repair limits,
missing CTC, copying/editing, stale results and HTTP boundaries are tested with mocks.
Live provider calls require configured credentials and have not been validated here.

API references: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Gemini generateContent structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output),
[Claude Messages](https://platform.claude.com/docs/en/api/messages/create).
