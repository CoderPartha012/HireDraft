import Link from "next/link";
import InfoPage from "../../components/info-page";
export const metadata = { title: "Privacy Policy" };
export default function Privacy() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="How this version of HireDraft handles the information you bring to your application."
    >
      <section>
        <h2>Information you provide</h2>
        <p>
          HireDraft processes the job link or description, resume, corrections,
          additional application details, and writing preferences you choose to
          provide. A job link is fetched from its source website; uploaded
          resumes are sent to this app’s server for text extraction.
        </p>
      </section>
      <section>
        <h2>Your workspace and files</h2>
        <p>
          Workspace information is held in the current browser session’s memory.
          Refreshing or starting a new application clears unsaved information.
          If you choose Save to History, the selected email subject and body,
          body format, generation number, edited status, and save date are retained in this
          browser’s local storage. Up to 30 saved emails remain until you delete
          them in Saved History or clear this site’s browser data. They are not
          synced across devices; anyone using this browser profile may access
          them. Job profiles and resume files are not included in saved history.
          Uploaded resumes are processed in server memory rather than saved as
          files. Copies you download, copy, or send outside HireDraft remain
          under your control.
        </p>
      </section>
      <section>
        <h2>Email generation and third parties</h2>
        <p>
          When you request an email, relevant confirmed job and candidate
          information, application details, and writing preferences are sent to
          the AI provider you select. Drafts may also be sent for factual checks
          and repair. The provider processes that information under its own
          policies; HireDraft does not control the provider’s retention.
          Visiting a linked website is subject to that website’s policies.
        </p>
      </section>
      <section>
        <h2>Hosting and technical records</h2>
        <p>
          This version has no built-in advertising or analytics trackers. The
          hosting service and external providers may process technical
          information, such as IP addresses and request logs, according to their
          own configuration and policies. Clearing your workspace does not
          delete records held by those services.
        </p>
      </section>
      <section>
        <h2>Your choices and questions</h2>
        <p>
          Only include information needed for your application. You can correct
          details before confirming them, cancel requests, or clear the
          workspace. For questions about the deployment you use or its service
          providers, see <Link href="/contact">Contact</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
