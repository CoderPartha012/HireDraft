"use client";
import { useRef, useState, useId } from "react";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  Undo2,
  Redo2,
  PenLine,
  Eye,
  Columns2,
} from "lucide-react";
import MarkdownPreview from "./markdown-preview";
import { markdownToText, plainToMarkdown } from "../src/markdown";

export default function MarkdownEditor({
  value,
  format = "plain",
  onChange,
  readOnly,
  typing,
}) {
  const input = useRef(null);
  const id = useId();
  const [mode, setMode] = useState("Split");
  const [undo, setUndo] = useState([]),
    [redo, setRedo] = useState([]);
  const markdown = format === "markdown";
  function update(text, nextFormat = format) {
    if (readOnly || text.length > 10000) return;
    setUndo((items) => [...items.slice(-99), { value, format }]);
    setRedo([]);
    onChange(text, nextFormat);
  }
  function travel(back) {
    const stack = back ? undo : redo;
    if (readOnly || !stack.length) return;
    const item = stack.at(-1);
    (back ? setUndo : setRedo)(stack.slice(0, -1));
    (back ? setRedo : setUndo)((items) => [...items, { value, format }]);
    onChange(item.value, item.format);
  }
  function insert(before, after = "", line = false) {
    const field = input.current;
    if (!field || readOnly) return;
    const start = line
      ? value.lastIndexOf("\n", field.selectionStart - 1) + 1
      : field.selectionStart;
    const end = field.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = line
      ? selected
          .split("\n")
          .map(
            (text, i) => `${before === "1. " ? `${i + 1}. ` : before}${text}`,
          )
          .join("\n")
      : `${before}${selected || "text"}${after}`;
    update(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(
        start + before.length,
        start + replacement.length - after.length,
      );
    });
  }
  const plain = markdown ? markdownToText(value) : value;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="field-label !mb-0" htmlFor={id}>
          Email body
        </label>
        <button
          className="text-xs text-lime underline"
          disabled={readOnly}
          onClick={() =>
            update(
              markdown ? markdownToText(value) : plainToMarkdown(value),
              markdown ? "plain" : "markdown",
            )
          }
        >
          {markdown ? "Use plain text" : "Use Markdown editor"}
        </button>
      </div>
      {markdown && (
        <>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Editor view"
          >
            {[
              ["Write", PenLine],
              ["Preview", Eye],
              ["Split", Columns2],
            ].map(([view, Icon]) => (
              <button
                key={view}
                className="button-secondary !px-3 !py-2 !text-xs"
                aria-pressed={mode === view}
                onClick={() => setMode(view)}
              >
                <Icon size={14} aria-hidden="true" /> {view}
              </button>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Markdown formatting"
          >
            {[
              ["Bold", "**", "**", false, Bold],
              ["Italic", "*", "*", false, Italic],
              ["Heading", "## ", "", true, Heading2],
              ["Bulleted list", "- ", "", true, List],
              ["Numbered list", "1. ", "", true, ListOrdered],
              ["Link", "[", "](https://example.com)", false, Link2],
              ["Quote", "> ", "", true, Quote],
              ["Code", "`", "`", false, Code],
            ].map(([label, before, after, line, Icon]) => (
              <button
                key={label}
                title={label}
                aria-label={label}
                type="button"
                className="button-secondary !px-2.5 !py-1.5 !text-xs"
                disabled={readOnly || mode === "Preview"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(before, after, line)}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div
        className={
          markdown && mode === "Split" ? "grid gap-3 xl:grid-cols-2" : ""
        }
      >
        {(!markdown || mode !== "Preview") && (
          <textarea
            ref={input}
            id={id}
            className={`field min-h-80 resize-y ${markdown ? "font-mono" : ""}`}
            rows={15}
            maxLength={10000}
            value={value}
            readOnly={readOnly}
            aria-busy={typing}
            onChange={(e) => update(e.target.value)}
            onKeyDown={(e) => {
              if (!(e.ctrlKey || e.metaKey)) return;
              const key = e.key.toLowerCase();
              if (
                ["z", "y"].includes(key) ||
                (markdown && ["b", "i"].includes(key))
              ) {
                e.preventDefault();
                if (key === "b") insert("**", "**");
                else if (key === "i") insert("*", "*");
                else travel(key === "z" && !e.shiftKey);
              }
            }}
          />
        )}
        {markdown && mode !== "Write" && (
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/10 p-4">
            <MarkdownPreview source={value} />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {" "}
        <button
          className="button-secondary !px-2.5 !py-1.5 !text-xs"
          disabled={readOnly || !undo.length}
          onClick={() => travel(true)}
        >
          <Undo2 size={14} aria-hidden="true" /> Undo
        </button>
        <button
          className="button-secondary !px-2.5 !py-1.5 !text-xs"
          disabled={readOnly || !redo.length}
          onClick={() => travel(false)}
        >
          <Redo2 size={14} aria-hidden="true" /> Redo
        </button>
      </div>
      <p className="text-xs text-muted">
        {plain.trim() ? plain.trim().split(/\s+/).length : 0} words ·{" "}
        {value.length}/10,000 characters{markdown ? " · Markdown enabled" : ""}
      </p>
      {markdown && (
        <details className="text-xs leading-6 text-muted">
          <summary className="cursor-pointer">
            Markdown help & shortcuts
          </summary>
          <p>
            Use **bold**, *italic*, ## headings, - lists,
            [label](https://example.com), &gt; quotes, `code`, and GitHub-style
            tables or task lists. Ctrl/Cmd+B: bold; Ctrl/Cmd+I: italic;
            Ctrl/Cmd+Z: undo; Ctrl/Cmd+Shift+Z: redo. HTML and remote images are
            not rendered. Plain text mode removes formatting; Undo restores it.
          </p>
        </details>
      )}
    </div>
  );
}
