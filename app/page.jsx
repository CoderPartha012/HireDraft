import { HeroSection, LogosSection } from "@/components/ui/hero-1";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  ListChecks,
  PenLine,
  Upload,
} from "@/components/ui/material-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ApplicationExamples from "@/components/application-examples";
import ApplicationFaq from "@/components/application-faq";
import SupportedSources from "@/components/supported-sources";

const steps = [
  {
    icon: FileText,
    title: "Add the opportunity",
    text: "Paste a job link or description. Confirm the role and company.",
  },
  {
    icon: ListChecks,
    title: "Review the requirements",
    text: "See what the role needs, with evidence from the original post.",
  },
  {
    icon: Upload,
    title: "Bring your experience",
    text: "Upload your resume and check the details that make you a fit.",
  },
  {
    icon: PenLine,
    title: "Make it your own",
    text: "Generate a draft, refine the wording, and export when it feels right.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HeroSection>
          <div className="relative rounded-2xl border bg-secondary/60 p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex shrink-0 items-center gap-1.5"
                >
                  <span className="size-3 rounded-full bg-[#ff5f57] ring-1 ring-black/10" />
                  <span className="size-3 rounded-full bg-[#febc2e] ring-1 ring-black/10" />
                  <span className="size-3 rounded-full bg-[#28c840] ring-1 ring-black/10" />
                </span>
                Your next introduction
              </span>
              <span className="rounded border bg-card px-2 py-1 text-xs">
                Example
              </span>
            </div>
            <Card className="hero-preview gap-0 overflow-hidden border-border py-0">
              <div className="flex items-center gap-3 border-b px-5 py-4">
                <span className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                  <FileText className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-medium">Frontend Engineer</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Northstar Studio
                  </p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3" /> Reviewed
                </span>
              </div>
              <CardContent className="p-5 sm:p-6">
                <p className="mb-4 border-b pb-4 text-xs">
                  <span className="mr-3 text-muted-foreground">Subject</span>
                  Application for Frontend Engineer
                </p>
                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <p>Hello Northstar team,</p>
                  <p>
                    Your focus on accessible React interfaces stood out to me.
                    In a recent booking project, I built keyboard-friendly flows
                    and reusable form components.
                  </p>
                  <p>
                    I'd love to share that work and learn more about what your
                    team is building.
                  </p>
                  <p>
                    Best,
                    <br />
                    Sam
                  </p>
                </div>
              </CardContent>
              <div className="flex items-center justify-between border-t bg-secondary/40 px-5 py-3 text-xs text-muted-foreground">
                <span>Based on sample experience</span>
                <span className="flex items-center gap-1.5">
                  <PenLine className="size-3" /> Ready to personalize
                </span>
              </div>
            </Card>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Your resume + the role. One considered introduction.
            </p>
          </div>
        </HeroSection>
        <LogosSection />
        <section id="how-it-works" className="section-shell">
          <div className="max-w-xl">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title">A clear path from role to reply.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Four simple steps. A chance to review at every stage.
            </p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="border-t pt-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg border bg-secondary/40">
                    <Icon className="size-4" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-base font-medium tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>
        <div className="border-y bg-secondary/30">
          <ApplicationExamples />
        </div>
        <SupportedSources />
        <div className="border-t">
          <ApplicationFaq />
        </div>
        <section className="page-width pb-20">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border bg-secondary/40 p-7 sm:p-10 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Let your experience do the talking.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Start with a role. Leave with a draft that sounds like you.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/analyze-job">
                Create your first draft <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
