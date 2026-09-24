"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Mail,
  FileText,
  Check,
  Search,
} from "lucide-react";

const navigation = [
  ["Demo", "#demo"],
  ["How it works", "#how-it-works"],
  ["Examples", "#examples"],
  ["Sources", "#sources"],
  ["FAQs", "#questions"],
];

export default function CinematicHero() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const entrance = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      delay: reduced ? 0 : delay,
      duration: reduced ? 0 : 0.8,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  });
  return (
    <>
      <motion.header {...entrance(0)} className="cinematic-nav">
        <Link
          href="/"
          aria-label="HireDraft home"
          className="flex items-center gap-3 text-sm font-semibold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-white/20 bg-white/5">
            <Mail size={20} strokeWidth={1.5} />
          </span>
          <span>HireDraft</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 text-xs text-white/65 md:flex"
        >
          {navigation.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="transition-colors hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
        <Link
          href="/analyze-job"
          className="button-primary hidden! md:inline-flex! !py-2.5 !text-xs"
        >
          Open workspace <ArrowUpRight size={14} />
        </Link>
        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
          className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/5 md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        {open && (
          <nav
            id="mobile-nav"
            aria-label="Mobile navigation"
            className="absolute inset-x-5 top-20 z-30 flex flex-col gap-1 rounded-2xl border border-white/15 bg-[#101216]/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            {navigation.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm hover:bg-white/10"
              >
                {label}
              </a>
            ))}
            <Link href="/analyze-job" className="button-primary mt-2">
              Open workspace <ArrowUpRight size={14} />
            </Link>
          </nav>
        )}
      </motion.header>
      <section className="cinematic-hero" aria-labelledby="hero-title">
        <motion.p
          {...entrance(0.1)}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[.16em] text-white/65"
        >
          <span className="size-1.5 rounded-full bg-cyan-200" />
          Your next chapter starts here
        </motion.p>
        <motion.h1
          {...entrance(0.3)}
          id="hero-title"
          className="text-[clamp(3.3rem,8vw,6.7rem)] font-semibold leading-[.96] tracking-[-.065em]"
        >
          Your experience.
          <br />
          <span className="animate-shiny cinematic-shiny">Reintroduced.</span>
        </motion.h1>
        <motion.p
          {...entrance(0.5)}
          className="mx-auto mt-8 max-w-md text-pretty text-sm leading-7 text-white/60 sm:text-base"
        >
          Job link. Your resume. A personal application email.
          <br className="hidden sm:block" /> Turn the role you want and the work
          you’ve done into an introduction grounded in your real experience.
        </motion.p>
        <motion.div
          {...entrance(0.7)}
          className="mt-8 flex flex-col items-center gap-4"
        >
          <Link href="/analyze-job" className="button-primary">
            Draft my application email <ArrowUpRight size={16} />
          </Link>
          <a
            href="#examples"
            className="flex items-center gap-2 text-xs text-white/55 transition-colors hover:text-white"
          >
            Explore example emails <ArrowRight size={13} />
          </a>
          <p className="mt-1 text-[10px] text-white/40">
            No account required · You review before sending
          </p>
        </motion.div>
      </section>
      <div className="desktop-menu-strip" aria-label="Application preview">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6 text-[11px] text-white/50">
          <div className="flex items-center gap-5">
            <Mail size={14} className="text-white" />
            <strong className="font-medium text-white">HireDraft</strong>
            <span>Job</span>
            <span>Resume</span>
            <span className="hidden sm:inline">Draft</span>
            <span className="hidden md:inline">Review</span>
          </div>
          <span className="flex items-center gap-2">
            <Search size={13} />
            <span className="hidden sm:inline">Your application, in focus</span>
          </span>
        </div>
      </div>
      <section className="source-cloud" aria-label="Application workflow">
        {[
          [FileText, "A real opportunity"],
          [Check, "Your confirmed experience"],
          [Mail, "An email in your voice"],
        ].map(([Icon, label], i) => {
          const Symbol = Icon as typeof Mail;
          return (
            <div key={i} className="flex items-center justify-center gap-3">
              <Symbol size={16} strokeWidth={1.4} />
              <span>{label as string}</span>
            </div>
          );
        })}
      </section>
    </>
  );
}
