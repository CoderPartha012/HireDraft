import Link from "next/link";
import InfoPage from "../../components/info-page";
export const metadata = { title: "Terms of Service" };
export default function Terms() {
  return (
    <InfoPage
      title="Terms of Service"
      intro="The basics of using HireDraft to prepare your own application emails."
    >
      <section>
        <h2>What HireDraft does</h2>
        <p>
          HireDraft helps you review job details, organize resume information,
          and draft application emails. You decide what to copy, attach, and
          send. The app does not submit applications or contact employers on
          your behalf.
        </p>
      </section>
      <section>
        <h2>Review your information and draft</h2>
        <p>
          Provide accurate information that you have permission to use.
          Extraction and AI generation can make mistakes, even after factual
          checks. Review the subject, body, recipient, and attachments before
          sending. HireDraft does not guarantee an interview, an offer, or any
          hiring outcome.
        </p>
      </section>
      <section>
        <h2>Responsible use</h2>
        <p>
          Do not use the app to impersonate someone, fabricate credentials, send
          spam, access restricted content without permission, or interfere with
          the service. Respect the rules of the job sources and AI providers you
          use.
        </p>
      </section>
      <section>
        <h2>Availability and limits</h2>
        <p>
          Features depend on source availability, hosting, and the configured AI
          provider. Requests may fail or be subject to provider quotas and
          charges. The current interface allows an initial successful email
          generation and up to two successful regenerations per application
          session. Save any draft you want to keep before refreshing.
        </p>
      </section>
      <section>
        <h2>Privacy and support</h2>
        <p>
          Read the <Link href="/privacy">Privacy Policy</Link> for data handling
          details. For help with the version of HireDraft you are using, visit{" "}
          <Link href="/contact">Contact</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
