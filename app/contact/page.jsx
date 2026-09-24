import Link from "next/link";
import InfoPage from "../../components/info-page";
export const metadata = { title: "Contact" };
export const dynamic = "force-dynamic";
export default function Contact() {
  const configured = process.env.HIREDRAFT_CONTACT_EMAIL?.trim();
  const email =
    configured &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(configured)
      ? configured
      : null;
  return (
    <InfoPage
      title="How can we help?"
      intro="Get help with a job link, your resume, or an email draft."
    >
      <section className="rounded-xl border border-lime/20 bg-lime/[.03] p-6">
        <h2>Contact support</h2>
        {email ? (
          <p>
            Email{" "}
            <a href={`mailto:${email}?subject=HireDraft%20support`}>{email}</a>.
            Include the step you were on, the error message, and your browser.
            Please leave out API keys and private resume details.
          </p>
        ) : (
          <p>
            For direct help, contact the person or team who provided your
            HireDraft workspace. A public support email has not been listed for
            this installation. Include the step you were on, the error message,
            and your browser; leave out API keys and private resume details.
          </p>
        )}
      </section>
      <section>
        <h2>Job link not loading?</h2>
        <p>
          Some LinkedIn pages require sign-in or block automated access. Choose
          “Enter details manually” in the workspace and paste the original job
          description instead.
        </p>
      </section>
      <section>
        <h2>Resume or email generation issue?</h2>
        <p>
          Use a readable PDF or DOCX under 5 MB, or enter your experience
          manually. For generation errors, follow the message shown in the
          workspace. Provider access or quota issues need to be resolved by the
          person managing the configured AI account.
        </p>
      </section>
      <section>
        <h2>More answers</h2>
        <p>
          Read the <Link href="/#questions">frequently asked questions</Link>,
          check the <Link href="/privacy">Privacy Policy</Link>, or{" "}
          <Link href="/analyze-job">return to your workspace</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
