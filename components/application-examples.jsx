"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, Mail, Check } from "lucide-react";
import TypingText from "./typing-text";
import ExampleTextReveal from "./example-text-reveal";

const examples = [
  {
    role: "Frontend Engineer",
    company: "Northstar Studio",
    name: "Sam",
    needs: "Build accessible React interfaces and reusable components.",
    evidence:
      "Built a React booking interface with keyboard navigation. Documented reusable form components in a project component library.",
    subject: "Application for Frontend Engineer at Northstar Studio",
    body: "Hello Northstar team,\n\nI'd like to apply for your Frontend Engineer role. The focus on accessible React interfaces stood out to me because it is work I've already had the chance to put into practice.\n\nIn a React booking project, I built an interface with keyboard navigation and documented reusable form components in a project component library. I'd be happy to walk you through the interface and the decisions behind those components.\n\nI'd like to learn more about what your frontend team is building and where I could contribute. Thank you for taking a look at my application.\n\nBest,\nSam",
  },
  {
    role: "QA Engineer",
    company: "Harbor Systems",
    name: "Priya",
    needs:
      "Maintain automated regression tests and communicate defects clearly.",
    evidence:
      "Wrote Selenium tests in Java for checkout flows. Recorded reproducible defects with steps and expected results during a testing internship.",
    subject: "Application for QA Engineer at Harbor Systems",
    body: "Hello Harbor Systems team,\n\nI'm writing about your QA Engineer opening. My testing internship included writing Selenium tests in Java for checkout flows and reporting defects with reproduction steps and expected results.\n\nBoth parts of that work interest me: checking that important flows still work and making a failure clear enough for someone else to investigate. Your role's focus on regression testing and clear defect reporting is what caught my attention.\n\nI'd appreciate the opportunity to discuss your testing needs and talk through the work I did during my internship. Thank you for your time.\n\nBest,\nPriya",
  },
  {
    role: "Content Marketer",
    company: "Fieldwork",
    name: "Jordan",
    needs: "Write product stories and plan a consistent editorial calendar.",
    evidence:
      "Wrote customer interview articles for a student publication. Maintained its monthly editorial calendar and edited contributor drafts.",
    subject: "Application for Content Marketer at Fieldwork",
    body: "Hello Fieldwork team,\n\nI'd like to be considered for your Content Marketer role. The mix of product storytelling and editorial planning caught my eye.\n\nFor a student publication, I wrote articles based on customer interviews, edited contributor drafts, and maintained the monthly editorial calendar. That gave me experience with both the writing itself and keeping track of what needed to be published.\n\nI'd be glad to share a few writing samples and discuss how I'd approach stories for Fieldwork. Thank you for reading my application.\n\nBest,\nJordan",
  },
];

export default function ApplicationExamples() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  return (
    <section id="examples" className="section-shell">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">EXAMPLE APPLICATIONS</p>
          <h2 className="section-title">
            See the facts.
            <br />
            Read the introduction.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-7 text-muted">
          Explore three fictional examples. Each email connects the role to the
          experience shown beside it. These are illustrations, not live
          generations.
        </p>
      </div>
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Choose an example role"
      >
        {examples.map((item, index) => (
          <button
            key={item.role}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            className={
              selected === index ? "button-primary" : "button-secondary"
            }
          >
            {item.role}
          </button>
        ))}
      </div>
      <div className="inbox-preview overflow-hidden rounded-2xl border border-white/15 bg-panel shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4 text-[10px] tracking-widest text-muted">
          <span className="flex items-center gap-3">
            <span className="traffic-lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            HireDraft ? Application preview
          </span>
          <span className="text-lime">ILLUSTRATIVE EXAMPLE</span>
        </div>
        <div
          className="example-transition grid md:grid-cols-[.8fr_1.2fr]"
          key={example.role}
        >
          <div className="space-y-7 border-b border-white/10 bg-black/10 p-6 md:border-b-0 md:border-r sm:p-8">
            <div>
              <p className="eyebrow">01 / THE OPPORTUNITY</p>
              <h3 className="text-xl">{example.role}</h3>
              <p className="mt-1 text-xs text-muted">
                {example.company} · Fictional company
              </p>
              <p className="mt-4 text-sm leading-7 text-muted">
                {example.needs}
              </p>
            </div>
            <div className="rounded-xl border border-lime/15 bg-lime/[.03] p-5">
              <p className="mb-3 flex items-center gap-2 text-xs text-lime">
                <FileText size={15} />
                02 / RESUME EVIDENCE
              </p>
              <p className="text-sm leading-7 text-muted">{example.evidence}</p>
            </div>
            <p className="flex items-start gap-2 text-xs leading-6 text-muted">
              <Check size={16} className="mt-1 shrink-0 text-lime" />
              Specific experience. No invented years, metrics, or
              qualifications.
            </p>
          </div>
          <article
            className="p-6 sm:p-8"
            aria-label={`${example.role} example email`}
          >
            <p className="mb-5 flex items-center gap-2 text-xs text-lime">
              <Mail size={16} />
              03 / THE APPLICATION EMAIL
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted">
              Subject
            </p>
            <h3 className="mb-5 mt-2 border-b border-white/10 pb-5 text-base font-medium leading-7">
              <TypingText text={example.subject} />
            </h3>
            <ExampleTextReveal key={example.role} text={example.body} />
          </article>
        </div>
      </div>
      <Link
        href="/analyze-job"
        className="mt-6 inline-flex items-center gap-2 text-sm text-lime"
      >
        Now write your own introduction <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}
