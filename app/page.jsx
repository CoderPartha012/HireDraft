import ApplicationFaq from "../components/application-faq";
import ProductDemo from "../components/product-demo";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Fingerprint,
  Link2,
  Mail,
  ScanLine,
  ShieldCheck,
  PenLine,
} from "lucide-react";
import CinematicHero from "../components/cinematic-hero";
import WorkflowCards from "../components/workflow-cards";
import ApplicationExamples from "../components/application-examples";
import SupportedSources from "../components/supported-sources";
import SiteFooter from "../components/site-footer";

const steps = [
  {
    icon: Link2,
    title: "Bring the opportunity.",
    text: "Paste a LinkedIn job or hiring post. Review the details and uncover what the role really needs.",
  },
  {
    icon: Fingerprint,
    title: "Add your perspective.",
    text: "Upload your resume, review your experience, and see how your verified skills connect to the role.",
  },
  {
    icon: Mail,
    title: "Make the introduction.",
    text: "Choose what to highlight. Create an application email that sounds like you, backed by your actual experience.",
  },
];

export default function Home() {
  return (
    <div className="landing-page">
      <main id="main-content">
        <CinematicHero />
        <ProductDemo />
        <ApplicationExamples />
        <section id="how-it-works" className="section-shell">
          <div className="mb-14 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">LESS FRICTION. MORE INTENTION.</p>
              <h2 className="section-title">
                From opportunity
                <br />
                to introduction.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted">
              One connected workspace, from the first job link to the final
              words. You review every step.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <article
                key={title}
                className="group border-t border-white/15 pt-6"
              >
                <div className="mb-9 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.03] text-lime transition-transform group-hover:-translate-y-1">
                    <Icon size={21} />
                  </span>
                  <span className="font-mono text-xs text-white/30">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mb-3 text-lg font-medium">{title}</h3>
                <p className="text-sm leading-7 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <SupportedSources />
        <section id="features" className="section-shell !pt-3">
          <p className="eyebrow">BUILT AROUND YOUR REAL EXPERIENCE</p>
          <h2 className="section-title mb-12">
            More substance.
            <br />
            Less guesswork.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="feature-card motion-card md:col-span-2">
              <div className="mb-10 flex flex-wrap gap-2">
                {[
                  "Required skills",
                  "Experience",
                  "Responsibilities",
                  "Your evidence",
                ].map((x, i) => (
                  <span
                    key={x}
                    className={`rounded-lg border px-3 py-2 text-xs ${i === 3 ? "border-lime/25 bg-lime/10 text-lime" : "border-white/10 text-muted"}`}
                  >
                    {x}
                  </span>
                ))}
              </div>
              <ScanLine className="mb-5 text-lime" size={24} />
              <h3 className="mb-3 text-2xl tracking-tight">
                See the role beyond the job title.
              </h3>
              <p className="max-w-lg text-sm leading-7 text-muted">
                Break down requirements, separate must-haves from nice-to-haves,
                and trace every finding back to the original posting.
              </p>
            </article>
            <article className="feature-card">
              <div className="mb-8 flex h-20 items-center justify-center">
                <div className="flex size-20 items-center justify-center rounded-full border border-lime/25 bg-lime/5">
                  <ShieldCheck size={34} className="text-lime" />
                </div>
              </div>
              <h3 className="mb-3 text-xl">Your facts come first.</h3>
              <p className="text-sm leading-7 text-muted">
                Review and correct extracted information. Drafts use confirmed
                facts, with a separate check for unsupported claims.
              </p>
            </article>
            <article className="feature-card">
              <FileText size={25} className="mb-8 text-lime" />
              <h3 className="mb-3 text-xl">A resume, with context.</h3>
              <p className="text-sm leading-7 text-muted">
                Bring a PDF or DOCX, or add details manually. Keep employment,
                projects, and skills distinct.
              </p>
            </article>
            <article className="feature-card md:col-span-2">
              <div className="mb-8 flex gap-2">
                <span className="rounded-full bg-lime px-4 py-1.5 text-xs text-ink">
                  Professional
                </span>
                <span className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-muted">
                  Concise
                </span>
                <span className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-muted">
                  Confident
                </span>
              </div>
              <h3 className="mb-3 text-2xl tracking-tight">
                Still your voice. Still your call.
              </h3>
              <p className="max-w-lg text-sm leading-7 text-muted">
                Choose your tone and highlights. Refine the subject and body.
                Copy the finished draft when it feels right. Nothing sends
                automatically.
              </p>
            </article>
          </div>
        </section>
        <WorkflowCards />
        <ApplicationFaq />
        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
          <div className="liquid-glass final-cta relative overflow-hidden rounded-3xl px-6 py-20 text-center">
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <h2 className="text-4xl font-medium tracking-[-.05em] sm:text-5xl">
              Start with a better hello.
            </h2>
            <p className="mb-8 mt-5 text-sm text-muted">
              You have the experience. Let’s help you put it into words.
            </p>
            <Link href="/analyze-job" className="button-primary">
              Open your workspace <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
