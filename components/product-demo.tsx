"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Play, ArrowUpRight } from "lucide-react";

export default function ProductDemo() {
  const player = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section id="demo" className="section-shell" aria-labelledby="demo-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">SEE HIREDRAFT IN ACTION</p>
          <h2 id="demo-title" className="section-title">
            From job description
            <br />
            to your first draft.
          </h2>
        </div>
        <p
          id="demo-description"
          className="max-w-sm text-sm leading-7 text-muted"
        >
          Watch the real workflow: add a job description, upload a resume, and
          generate an application email with live AI.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0e1014] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 text-xs text-muted">
          <span className="flex items-center gap-3">
            <span className="traffic-lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            HireDraft · Product walkthrough
          </span>
          <span className="hidden sm:inline">Play at your pace</span>
        </div>
        <div className="relative">
          <video
            ref={player}
            className="block aspect-[1280/900] w-full bg-black"
            controls
            playsInline
            preload="none"
            poster="/demo/hiredraft-live-demo-poster.png"
            aria-label="HireDraft product demonstration"
            aria-describedby="demo-description"
            onPlay={() => setStarted(true)}
            onError={() => setFailed(true)}
          >
            <source src="/demo/hiredraft-live-demo.webm" type="video/webm" />
            <track
              default
              kind="captions"
              src="/demo/hiredraft-live-demo.vtt"
              srcLang="en"
              label="English walkthrough"
            />
            Your browser does not support this video. Use the written
            walkthrough below.
          </video>
          {!started && !failed && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 pb-12">
              <button
                type="button"
                className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/25 bg-white px-6 py-4 text-sm font-semibold text-black shadow-2xl transition-transform hover:scale-105"
                onClick={() => {
                  player.current?.play().catch(() => setFailed(true));
                }}
              >
                <Play size={18} fill="currentColor" aria-hidden="true" />
                Watch the real demo
              </button>
            </div>
          )}
        </div>
      </div>
      {failed && (
        <p role="status" className="mt-3 text-sm text-muted">
          The video could not play.{" "}
          <a
            href="/demo/hiredraft-live-demo.webm"
            className="text-lime underline"
          >
            Download the demo
          </a>{" "}
          or follow the written steps below.
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-xl text-xs leading-6 text-muted">
          Recorded in HireDraft with a fictional sample job and resume. The
          email was generated live by Bynara and saved through the actual
          workspace. The recording includes processing time; results and timing
          vary. No audio is required—on-screen steps and captions guide you.
        </p>
        <Link
          href="/analyze-job"
          className="inline-flex items-center gap-2 text-sm text-lime"
        >
          Try it with your own resume <ArrowUpRight size={15} />
        </Link>
      </div>
      <details className="mt-5 rounded-xl border border-white/10 bg-white/[.02] px-5 py-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Read the walkthrough
        </summary>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted">
          <li>Paste a job description and confirm the job details.</li>
          <li>Review the requirements and confirm what the role needs.</li>
          <li>Upload a PDF or DOCX resume and select Read resume.</li>
          <li>Review the extracted experience and confirm your profile.</li>
          <li>Choose an available AI provider and generate your email.</li>
          <li>Review and edit the subject and body.</li>
          <li>
            Copy or export the email, open it in Gmail, or save it to browser
            history. You send it yourself.
          </li>
        </ol>
      </details>
    </section>
  );
}
