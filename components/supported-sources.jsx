import { FileText, Link2, Mail, PenLine } from "@/components/ui/material-icons";
export default function SupportedSources() {
  const sources = [
    ["LinkedIn Job", "Public listing link", Link2],
    ["LinkedIn Hiring Post", "Public post link", Link2],
    ["Company Post", "Paste the description", FileText],
    ["Recruiter Post", "Paste text or a LinkedIn link", Mail],
    ["Job Description Text", "Enter details manually", PenLine],
  ];
  return (
    <section id="sources" className="section-shell">
      <div className="mb-8 max-w-xl">
        <p className="eyebrow">Works with your job search</p>
        <h2 className="section-title">Bring the opportunity from anywhere.</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Use a public LinkedIn link or paste the original job description. Add
          your resume as a PDF or Word document.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {sources.map(([name, text, Icon]) => (
          <div key={name} className="border-t pt-5">
            <Icon
              className="mb-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="text-sm font-medium">{name}</h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {text}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-7 text-xs leading-6 text-muted-foreground">
        If a link cannot be read, paste the job details manually to continue.
      </p>
    </section>
  );
}
