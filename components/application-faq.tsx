"use client";
import Link from "next/link";
import { FAQ } from "@/components/ui/faq-tabs";

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
  const categories = {
    start: "Getting started",
    drafting: "Writing & sending",
    data: "Your data & support",
  };
  const group = (indices: number[]) =>
    indices.map((index) => ({
      question: questions[index].question,
      answer: (
        <>
          <p>{questions[index].answer}</p>
          <p>{questions[index].detail}</p>
        </>
      ),
    }));
  return (
    <FAQ
      id="questions"
      categories={categories}
      faqData={{
        start: group([0, 1]),
        drafting: group([2, 4]),
        data: group([3, 5]),
      }}
    >
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Still have a question?{" "}
        <Link
          href="/contact"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Get in touch
        </Link>
      </p>
    </FAQ>
  );
}
