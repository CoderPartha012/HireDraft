import { Loader2 } from "@/components/ui/material-icons";
import { Button } from "@/components/ui/button";
export default function ProcessingState({ label, onCancel }) {
  return (
    <section
      className="processing-state flex items-start gap-3 rounded-xl border bg-card p-5"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Loader2
        className="mt-0.5 size-5 shrink-0 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium">{label}</h2>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          This may take a moment. Your results will be ready to review shortly.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </section>
  );
}
