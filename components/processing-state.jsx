import { FileText, ScanLine } from "lucide-react";

export default function ProcessingState({ label, onCancel }) {
  const description = /resume/i.test(label)
    ? "Reading your experience, skills, and education. Your details will be ready to review shortly."
    : /email|draft/i.test(label)
      ? "Bringing the job, your experience, and additional details together for your introduction."
      : "Organizing the opportunity into clear details you can review and confirm.";
  return (
    <section
      className="processing-state"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="processing-document" aria-hidden="true">
        <FileText size={32} strokeWidth={1.2} />
        <span className="document-scan" />
        <span className="processing-orbit">
          <ScanLine size={14} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[10px] uppercase tracking-[.2em] text-lime">
          A little care for every detail
        </p>
        <h2 className="text-base font-medium text-white">{label}</h2>
        <p className="mt-2 max-w-lg text-xs leading-6 text-muted">
          {description}
        </p>
        <div className="processing-track" aria-hidden="true">
          <span />
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="self-start rounded-md border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
      >
        Cancel
      </button>
    </section>
  );
}
