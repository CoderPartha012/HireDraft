# ✉️ HireDraft

**From job description to your first draft.**

HireDraft turns a job opportunity and your resume into an application email you can review, edit, and export. A four-step workspace brings together job requirements, your experience, and writing preferences.

Built with **Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui**.

[Run locally](#-run-locally) | [Explore the workflow](#-the-four-step-workflow) | [UI component sources](docs/UI_COMPONENTS.md)

## Project documentation

| Document                                      | Contents                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Technical Requirement Document](TRD.md)      | Architecture, functional requirements, data contracts, APIs, providers and system limits. |
| [App Flow](App_Flow.md)                       | User journey, confirmation gates, generation checks, revisions and recovery flows.        |
| [Implementation Plan](Implementation_Plan.md) | Delivered baseline, proposed phases, acceptance criteria and release workflow.            |
| [Testing Guide](TESTING.md)                   | Test commands, coverage map, responsive checks, manual scenarios and troubleshooting.     |

## Minimal SaaS interface

HireDraft uses locally loaded Geist Sans with neutral light and dark themes, simple navigation, and consistent form controls. The sun/moon icon in the header switches themes and remembers your choice across pages and visits. On your first visit, the site opens in dark mode. Your chosen theme is remembered. The homepage explains the workflow with a static email preview, switchable examples, supported sources, and an accessible FAQ accordion.

The application workspace, editor, saved history, and information pages use the same visual language. Demo videos, the animated background, decorative text effects, and their unused assets have been removed.

Components are built with **shadcn/ui (Radix Nova)**. The FAQ uses a **ReUI accordion discovered on 21st.dev**, adapted from its public upstream source. See [component sources and attribution](docs/UI_COMPONENTS.md).

## ✨ Latest updates

| Area                   | What changed                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎥 Homepage preview    | Replaced the video section with a static, readable email preview.                                                                              |
| 🧭 Simpler workflow    | Profile confirmation leads directly to email generation. Experience matching happens within the workflow, without a separate alignment screen. |
| ✍️ Drafting experience | Generated text appears with a typing effect, with an instant reveal for reduced-motion preferences.                                            |
| 🔄 Draft revisions     | Switch between Generation 1–3, preserve edits, and refine drafts with feedback or quick suggestions.                                           |
| 📝 Markdown editor     | Write, Preview, and Split views with formatting icons, undo/redo, shortcuts, and word counts.                                                  |
| 📤 Export options      | Copy the subject or body, download text, Word, or Markdown, and open a Gmail compose window.                                                   |
| 🗂️ Saved History       | Save up to 30 email snapshots in the current browser and reopen or delete them later.                                                          |
| 💡 Status feedback     | Compact loading indicators, generation progress, and dismissible notifications for copy, export, and history actions.                          |
| 🎨 Landing page        | Responsive neutral styling, clear sections, three switchable application examples, supported-source guidance, FAQs, and informational pages.   |

## 🧭 The four-step workflow

| Step                        | What you do                                                                                                                    | What you review                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 🔗 **1. The opportunity**   | Paste a public LinkedIn job or hiring-post URL, or enter the details manually. Select a role when a post contains several.     | Job title, company, and source details.                                              |
| 🔎 **2. The requirements**  | Review the extracted requirements and make corrections where needed.                                                           | Skills, responsibilities, experience expectations, and supporting source text.       |
| 📄 **3. Your experience**   | Upload a PDF or DOCX smaller than 5 MB, or enter candidate information manually. Add optional context and writing preferences. | Identity, employment, projects, skills, education, certifications, and achievements. |
| ✉️ **4. Your introduction** | Choose an available provider, tone, and length, then generate your email.                                                      | The subject and body, which you can edit, revise, copy, export, or save.             |

Changing an earlier step clears dependent results so the draft reflects the latest confirmed information. Starting a new application or refreshing clears the unsaved workspace; explicitly saved emails remain in **Saved History** until deleted or browser site data is cleared.

Gmail opens a compose window for your final review. Add the recipient and any attachments, then send the message yourself.

## ✍️ Draft, refine, and export

### Writing controls

- **Tone:** Professional, Concise, or Confident.
- **Length:** Standard or Short.
- **Context:** Optional application details, writing preferences, and a previous email to guide the style.
- **Revisions:** One initial successful generation and up to two successful regenerations per application session. Failed attempts do not use a regeneration.
- **Feedback:** Add your own instructions or choose **More metrics**, **Shorter**, or **Stronger opening**. Metrics must come from the confirmed experience.
- **Version history:** Switch between generated versions while preserving manual edits.
- **Usage display:** See reported token usage and the number of generation calls when available.

The provider selector includes **Byanara AI**, **APInex**, and **Ollama · local test**. **Byanara AI is selected by default** and uses the existing Bynara gateway (`bynara`, model `agnes-2.5-flash`). Actual availability depends on the configured server credentials and the selected service; generation remains disabled when the selected provider is unavailable.

### Markdown editing

Select **Use Markdown editor** to switch between **Write**, **Preview**, and **Split** views. The toolbar includes bold, italic, headings, numbered and bulleted lists, links, quotes, inline code, and undo/redo. The editor supports keyboard shortcuts, word counts, and a 10,000-character body limit.

The preview supports GitHub-flavored Markdown, including tables and task lists. Saved drafts retain their body format.

| Action                   | Result                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Copy subject / Copy body | Copy the current subject or readable email text.                                    |
| Copy as Markdown         | Copy the Markdown source for use in another editor.                                 |
| Download as `.txt`       | Export readable plain text.                                                         |
| Download as `.docx`      | Export a Word document with basic formatting and links; tables appear as text rows. |
| Download as `.md`        | Keep Markdown formatting in a file.                                                 |
| Open in Gmail            | Open a compose window with the current subject and body.                            |
| Save to History          | Keep a snapshot of the current edited draft in this browser.                        |

## 🎨 Pages and interface

The homepage includes a static email preview, three fictional application examples with their job requirements and resume evidence, four workflow steps, supported sources, and FAQs.

Public LinkedIn links support extraction. Content from other sources can be entered manually. The interface includes responsive layouts, keyboard focus states, accessible labels, and reduced-motion support.

| Page                  | Route          |
| --------------------- | -------------- |
| Homepage              | `/`            |
| Application workspace | `/analyze-job` |
| About                 | `/about`       |
| Contact               | `/contact`     |
| Terms                 | `/terms`       |
| Privacy               | `/privacy`     |

## 🚀 Run locally

Requires **Node.js 22.13 or newer** and npm.

```sh
npm install
```

Copy `.env.example` to `.env` and configure at least one AI provider before generating emails:

| Variable                  | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `BYNARA_API_KEY`          | Enables the default Byanara AI provider.          |
| `APINEX_API_KEY`          | Enables APInex as an alternative provider.        |
| `OLLAMA_GATEWAY_API_KEY`  | Enables the authenticated local Ollama gateway.   |
| `HIREDRAFT_CONTACT_EMAIL` | Optional support email shown on the Contact page. |

Keep provider credentials on the server. Restart the app after changing `.env`. If Bynara asks you to link Telegram, complete that step in its account settings before retrying. For Ollama setup, see [the local gateway guide](llm-gateway/README.md); `npm run llm` starts an already configured Windows gateway environment.

```sh
npm run dev
```

Open [the homepage](http://localhost:3000) or [the application workspace](http://localhost:3000/analyze-job).

To run a production build:

```sh
npm run build
npm start
```

On Windows PowerShell, use `npm.cmd` if the `npm` command is unavailable.

## Responsive review

Reviewed on **3 October 2026** against a production build in Google Chrome using Playwright viewport emulation.

Validation: `npm run build` succeeded and the full `npm run test:e2e` suite passed **25 tests**. The review includes automated overflow checks and visual inspection of representative mobile, tablet, and desktop screenshots.

| Area                             | Coverage                                                                                                                            | Result                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Public pages and workspace entry | Homepage, workspace, About, Contact, Privacy, Terms, and 404 at 320, 390, 640, 768, 1024, 1280, and 1440px in light and dark themes | No page-level horizontal overflow or client errors in the viewport matrix. |
| Application workflow             | All four steps, generated draft, Markdown editor, and saved-history controls at 320, 390, 768, 1024, and 1440px                     | Layouts fit the viewport, including long links and Markdown tables.        |
| Navigation and accessibility     | Mobile menu, Escape dismissal, keyboard links, FAQ tabs, example selection, theme persistence, and reduced-motion behavior          | Covered by browser regression tests.                                       |

Review screenshots are generated in `test-results/` and are not committed. The layout stacks on smaller screens, uses a sidebar on desktop, and wraps editor and export controls. No responsiveness fixes were needed in this review.

This review uses Chrome emulation rather than physical devices. Safari, Firefox, and real-device behavior have not been verified. Draft generation uses fixture responses in browser tests, so this review does not confirm live provider availability.

## 🛠️ Development

### Project structure

```text
app/                   Pages, layouts, styles, and route handlers
components/            Homepage, workspace, editors, exports, and history UI
src/                   Job parsing, requirements, profiles, and matching logic
src/server/            Job extraction, resume reading, and email generation
scripts/               Development and verification utilities
tests/                Domain and application regression tests
tests/legacy/         Original interface fixtures for regression coverage
e2e/                   Playwright browser tests and sample fixtures
llm-gateway/           Local model integration
docs/                  Archived project notes
```

The app uses the Next.js App Router, React state, and shared JavaScript modules, with TypeScript used in parts of the interface. PDF.js handles PDF reading, and `docx` supports Word exports.

### Useful commands

| Command             | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Start the development server.                       |
| `npm run build`     | Create a production build.                          |
| `npm start`         | Serve the production build.                         |
| `npm run typecheck` | Check TypeScript without emitting files.            |
| `npm test`          | Run the regression suite.                           |
| `npm run test:e2e`  | Run browser tests against the production build.     |
| `npm run format`    | Format the configured source directories and files. |

Browser tests use installed **Google Chrome** and start the production build on port **3100**. Build the app before running them. The tests use sample job and generation responses.

To repeat the responsive page matrix and workspace review:

```sh
npm run build
npm run test:e2e -- e2e/responsive.spec.js e2e/navigation.spec.js e2e/theme.spec.js
npm run test:e2e -- e2e/workspace.spec.js --grep "all workspace steps"
```

Use a Node.js-capable Next.js host when deploying; the application requires server-side processing for extraction, resume reading, and generation.
