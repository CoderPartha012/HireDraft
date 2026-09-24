import Link from "next/link";
import { ArrowUpRight, ChevronDown, MessageCircle } from "lucide-react";

const questions = [
  {
    category: "Getting started",
    question: "What do I need to create my first email?",
    answer:
      "Start with a job link or the full job description, then upload your resume as a PDF or DOCX. You can also enter your experience manually.",
    detail:
      "Review the job details and your profile, add any application-specific information, then choose an available AI provider and generate your draft.",
  },
  {
    category: "Job sources",
    question: "Which job links work—and what if a link won’t load?",
    answer:
      "HireDraft can read public LinkedIn job listings and hiring posts. Some pages require a login or block automated access, so a link may not always load.",
    detail:
      "Choose “Enter details manually” and paste the original job description to continue. This also works for opportunities from company websites and recruiter posts.",
  },
  {
    category: "Accuracy",
    question: "How does the email stay true to my experience?",
    answer:
      "The draft uses the job details, resume information, and additional facts you have reviewed and confirmed. HireDraft checks the generated email for unsupported claims before displaying it.",
    detail:
      "AI can still make mistakes. Check names, skills, dates, and achievements before sending. Changes you make in the editor are not automatically rechecked.",
  },
  {
    category: "Your data",
    question: "What happens to my resume and saved emails?",
    answer:
      "The app processes uploaded resumes in memory rather than saving the files. Unsaved job and resume information clears when you refresh the page.",
    detail:
      "Emails you choose to save stay in this browser’s local storage until you delete them from Saved History. When you generate an email, relevant confirmed details go to your selected AI provider. With the local Ollama setup, generation runs on your computer.",
  },
  {
    category: "Editing & sending",
    question: "Can I edit, export, and send the finished email?",
    answer:
      "Yes. Edit the subject and body, use the Markdown editor, or regenerate with feedback. You can regenerate up to two times after the first successful generation and switch between versions.",
    detail:
      "Copy your draft, download it as TXT or DOCX, or open it in Gmail. HireDraft does not send emails or submit applications—you review the final message, attach your resume, and send it yourself.",
  },
  {
    category: "AI availability",
    question: "Why might email generation be unavailable?",
    answer:
      "Reading job details and resumes works without an AI key. Generating an email requires an available provider selected in the email step.",
    detail:
      "Cloud providers need valid server-side credentials and available quota. For local Ollama, both Ollama and the gateway must be running. Follow the error shown in the workspace, or select another configured provider.",
  },
];

export default function ApplicationFaq() {
  return (
    <section
      id="questions"
      className="section-shell application-faq"
      aria-labelledby="faq-title"
    >
      <div className="faq-intro">
        <p className="eyebrow">A FEW THINGS TO KNOW</p>
        <h2 id="faq-title" className="section-title">
          Before your
          <br />
          first introduction.
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
          What to bring, how your information is used, and what happens before
          you hit send.
        </p>
        <div className="faq-help">
          <MessageCircle
            size={20}
            strokeWidth={1.5}
            className="text-lime"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-white">
              Still have a question?
            </p>
            <Link
              href="/contact"
              className="mt-2 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-white"
            >
              Visit our contact page{" "}
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <div className="faq-list">
        {questions.map((item, index) => (
          <details
            key={item.question}
            className="faq-item"
            name="application-questions"
            open={index === 0}
          >
            <summary>
              <span className="faq-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="faq-category">{item.category}</span>
                <span className="faq-question">{item.question}</span>
              </span>
              <span className="faq-toggle">
                <ChevronDown size={17} aria-hidden="true" />
              </span>
            </summary>
            <div className="faq-answer">
              <p>{item.answer}</p>
              <p>{item.detail}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
