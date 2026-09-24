"use client";
import { useState } from "react";
import { useToast } from "./toast-provider";
import {
  downloadEmail,
  emailMarkdown,
  gmailComposeUrl,
} from "../src/email-export";

export default function EmailExports({ email, onSave }) {
  const notify = useToast();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  async function perform(action, success) {
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      notify(success);
    } catch {
      notify(
        "This action could not be completed. Please try again or copy the text manually.",
        true,
      );
      setMessage(
        "This action could not be completed. Please try again or copy the text manually.",
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="space-y-3 border-t border-white/10 pt-5">
      <div className="flex flex-wrap gap-2" aria-label="Export and sharing">
        <button
          className="button-secondary !text-xs"
          disabled={working}
          onClick={() =>
            perform(() => downloadEmail(email, "txt"), "Text download ready.")
          }
        >
          Download as .txt
        </button>
        <button
          className="button-secondary !text-xs"
          disabled={working}
          onClick={() =>
            perform(() => downloadEmail(email, "docx"), "Word download ready.")
          }
        >
          {working ? "Preparing…" : "Download as .docx"}
        </button>
        <button
          className="button-secondary !text-xs"
          disabled={working}
          onClick={() =>
            perform(
              () => navigator.clipboard.writeText(emailMarkdown(email)),
              "Markdown copied.",
            )
          }
        >
          Copy as Markdown
        </button>
        <button
          className="button-secondary !text-xs"
          disabled={working}
          onClick={() =>
            perform(
              () => downloadEmail(email, "md"),
              "Markdown download ready.",
            )
          }
        >
          Download as .md
        </button>
        <a
          className="button-secondary !text-xs"
          href={gmailComposeUrl(email)}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          Open in Gmail
        </a>
        {onSave && (
          <button className="button-secondary !text-xs" onClick={onSave}>
            Save to History
          </button>
        )}
      </div>
      <p className="text-xs leading-6 text-muted">
        Gmail opens a compose window with this subject and body. Add the
        recipient and resume, review, then send yourself.
      </p>
      {message && (
        <p role="status" className="text-xs text-lime">
          {message}
        </p>
      )}
    </div>
  );
}
