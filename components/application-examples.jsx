"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Mail,
  Check,
} from "@/components/ui/material-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">A little inspiration</p>
          <h2 className="section-title">Specific experience. Better emails.</h2>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Fictional examples that show how a role and your experience come
          together.
        </p>
      </div>
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Choose an example role"
      >
        {examples.map((item, index) => (
          <Button
            key={item.role}
            variant={selected === index ? "default" : "outline"}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {item.role}
          </Button>
        ))}
      </div>
      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <div className="grid md:grid-cols-[.75fr_1.25fr]">
          <div className="space-y-8 border-b bg-secondary/40 p-6 sm:p-8 md:border-b-0 md:border-r">
            <div>
              <p className="eyebrow">The opportunity</p>
              <h3 className="text-lg font-semibold">{example.role}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {example.company} / Fictional company
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {example.needs}
              </p>
            </div>
            <div className="border-t pt-6">
              <p className="mb-3 flex items-center gap-2 text-xs font-medium">
                <FileText size={15} /> Resume experience
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {example.evidence}
              </p>
            </div>
          </div>
          <article
            className="p-6 sm:p-8"
            aria-label={`${example.role} example email`}
          >
            <p className="mb-5 flex items-center gap-2 text-xs font-medium">
              <Mail size={15} /> The application email
            </p>
            <div className="mb-5 border-b pb-5">
              <p className="mb-2 text-xs text-muted-foreground">Subject</p>
              <h3 className="text-sm font-medium">{example.subject}</h3>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {example.body}
            </p>
          </article>
        </div>
      </Card>
      <Button asChild variant="link" className="mt-5 px-0">
        <Link href="/analyze-job">
          Write your own introduction <ArrowUpRight size={15} />
        </Link>
      </Button>
    </section>
  );
}
