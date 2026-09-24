import { FileText, Link2, Mail, PenLine } from "lucide-react";

export default function SupportedSources() {
  return (
    <section id="sources" className="section-shell !pt-3">
      <p className="eyebrow">SUPPORTED SOURCES</p>
      <h2 className="section-title">Bring the opportunity from anywhere.</h2>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
        Use a public LinkedIn link, or paste the job description from a company
        or recruiter post. Review the details before moving on.
      </p>
      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [
            "LinkedIn Job",
            "Paste a public job listing URL.",
            "Link or text",
            Link2,
          ],
          [
            "LinkedIn Hiring Post",
            "Paste a public LinkedIn hiring post URL.",
            "Link or text",
            FileText,
          ],
          [
            "Company Post",
            "Copy the job details from a company website or social post.",
            "Paste text",
            FileText,
          ],
          [
            "Recruiter Post",
            "Copy a recruiter’s opportunity, or use its public LinkedIn URL.",
            "Text or LinkedIn link",
            Mail,
          ],
          [
            "Job Description Text",
            "Paste the full description directly into the workspace.",
            "Plain text",
            PenLine,
          ],
        ].map(([title, description, format, Icon]) => (
          <article
            key={title}
            className="motion-card rounded-xl border border-white/10 bg-panel/60 p-5"
          >
            <Icon size={21} className="mb-6 text-lime" aria-hidden="true" />
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="mb-5 mt-3 text-xs leading-6 text-muted">
              {description}
            </p>
            <span className="text-[10px] font-medium uppercase tracking-wider text-lime">
              {format}
            </span>
          </article>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-xs leading-6 text-muted">
        Link extraction supports public LinkedIn pages. For blocked links or
        other websites, choose “Enter details manually” and paste the text.
        Upload your resume separately as a PDF or DOCX.
      </p>
    </section>
  );
}
