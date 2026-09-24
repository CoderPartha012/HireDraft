"use client";
import { useEffect, useState } from "react";
import { HISTORY_KEY, readHistory } from "../src/email-history";
import EmailExports from "./email-exports";
import MarkdownPreview from "./markdown-preview";

export default function SavedEmailHistory({ revision }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        setItems(readHistory(localStorage));
        setError("");
      } catch {
        setError(
          "Saved history is unavailable in this browser. You can still download your email.",
        );
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [revision]);
  function remove(id) {
    try {
      const next = readHistory(localStorage).filter((item) => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setItems(next);
      setError("");
    } catch {
      setError(
        "Could not delete this saved email. Please check browser storage permissions.",
      );
    }
  }
  return (
    <details className="workspace-card" aria-label="Saved email history">
      <summary className="cursor-pointer text-sm font-medium">
        Saved History ({items.length})
      </summary>
      <p className="my-4 text-xs leading-6 text-muted">
        Only drafts you explicitly save are retained on this browser, up to 30
        emails. They may contain personal information. Delete them here when you
        no longer need them. Saved emails do not restore job or resume profiles.
      </p>
      {error && (
        <p role="alert" className="text-sm text-muted">
          {error}
        </p>
      )}
      {!items.length && (
        <p className="text-xs text-muted">
          No saved drafts yet. Generate an email and choose Save to History.
        </p>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.id}
            className="rounded-lg border border-white/10 p-4"
          >
            <summary className="cursor-pointer break-words text-sm">
              Generation {item.metadata?.generation || 1} — {item.subject}
            </summary>
            <p className="my-3 text-xs text-muted">
              Saved {new Date(item.savedAt).toLocaleString()} ·{" "}
              {item.edited
                ? "Manually edited; changes not checked"
                : "Saved generated draft"}
            </p>
            {item.bodyFormat === "markdown" ? (
              <MarkdownPreview source={item.body} />
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {item.body}
              </p>
            )}
            <EmailExports email={item} />
            <button
              className="mt-4 text-xs text-muted underline"
              onClick={() => remove(item.id)}
            >
              Delete saved email
            </button>
          </details>
        ))}
      </div>
    </details>
  );
}
