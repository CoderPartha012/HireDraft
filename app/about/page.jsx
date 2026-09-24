import Link from "next/link";
import InfoPage from "../../components/info-page";
export const metadata = { title: "About" };
export default function About() {
  return (
    <InfoPage
      title="A more personal introduction."
      intro="HireDraft turns a job opportunity and your real experience into an application email you can make your own."
    >
      <section>
        <h2>Start with the facts</h2>
        <p>
          Bring a public LinkedIn job or hiring post, or paste the description.
          Add your resume and any relevant details. Review the extracted
          information before asking HireDraft to draft your email.
        </p>
      </section>
      <section>
        <h2>Connect experience to the role</h2>
        <p>
          The draft draws on confirmed skills, projects, and experience that
          relate to the opportunity. Factual checks help flag unsupported
          claims. Your review remains part of the process.
        </p>
      </section>
      <section>
        <h2>You make the final call</h2>
        <p>
          Choose a tone, edit the draft, and copy it when you are ready.
          HireDraft never sends it for you.{" "}
          <Link href="/#examples">Explore the example applications</Link> or{" "}
          <Link href="/analyze-job">start your own</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
