import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, PenLine } from "@/components/ui/material-icons";

export function HeroSection({ children }: { children?: ReactNode }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate mx-auto w-full max-w-5xl overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_50%_0%,var(--foreground),transparent_65%)] opacity-[0.06]" />
        <div className="absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-border via-border/60 to-transparent lg:block" />
        <div className="absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-border via-border/60 to-transparent lg:block" />
        <div className="absolute inset-y-0 left-4 w-px bg-gradient-to-b from-transparent via-border to-transparent md:left-8" />
        <div className="absolute inset-y-0 right-4 w-px bg-gradient-to-b from-transparent via-border to-transparent md:right-8" />
        <div className="absolute inset-y-0 left-8 hidden w-px bg-gradient-to-b from-transparent via-border/50 to-transparent sm:block md:left-12" />
        <div className="absolute inset-y-0 right-8 hidden w-px bg-gradient-to-b from-transparent via-border/50 to-transparent sm:block md:right-12" />
      </div>
      <div className="relative flex flex-col items-center gap-5 px-8 pb-14 pt-20 text-center sm:px-16 sm:pb-20 sm:pt-28 lg:pt-32">
        <a
          href="#how-it-works"
          className="hero-text-reveal group inline-flex max-w-full items-center gap-3 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm"
        >
          <PenLine className="size-3.5 text-muted-foreground" />
          <span>A thoughtful way to apply</span>
          <span aria-hidden="true" className="h-4 border-l" />
          <ArrowRight className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5" />
        </a>
        <h1
          id="hero-title"
          className="hero-text-reveal max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
        >
          Your experience.
          <br />A better introduction.
        </h1>
        <p className="hero-text-reveal hero-text-reveal-delayed max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Turn a job description and your resume into a personal application
          email. Clear, relevant, and ready for your finishing touch.
        </p>
        <div className="hero-text-reveal hero-text-reveal-delayed flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="rounded-full"
          >
            <a href="#examples">Explore example emails</a>
          </Button>
          <Button asChild size="lg" className="rounded-full">
            <Link href="/analyze-job">
              Create an application <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Check className="size-3.5" />
          You review the draft. You decide when to send.
        </p>
      </div>
      {children && (
        <div className="relative mx-auto max-w-2xl px-6 pb-14 sm:px-10 sm:pb-20">
          {children}
        </div>
      )}
    </section>
  );
}
export function LogosSection() {
  return (
    <section
      aria-label="What you can do with HireDraft"
      className="border-y bg-secondary/35"
    >
      <div className="page-width flex flex-wrap justify-center gap-x-10 gap-y-3 py-6 text-xs text-muted-foreground">
        {[
          "PDF & Word resumes",
          "Editable email drafts",
          "Export or open in Gmail",
        ].map((text) => (
          <span key={text} className="flex items-center gap-2">
            <Check className="size-3.5" />
            {text}
          </span>
        ))}
      </div>
    </section>
  );
}
