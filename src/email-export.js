import {
  emailBodyText,
  escapeMarkdown,
  plainToMarkdown,
  parseMarkdown,
} from "./markdown.js";

export function emailText(email) {
  return `Subject: ${email.subject}\n\n${emailBodyText(email)}`;
}

export function emailMarkdown(email) {
  return `**Subject:** ${escapeMarkdown(email.subject)}\n\n${email.bodyFormat === "markdown" ? email.body : plainToMarkdown(email.body)}`;
}

export function gmailComposeUrl(email) {
  return `https://mail.google.com/mail/?${new URLSearchParams({ view: "cm", fs: "1", su: email.subject, body: emailBodyText(email) })}`;
}

export async function emailDocx(email) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ExternalHyperlink,
    HeadingLevel,
  } = await import("docx");
  function runs(node, style = {}) {
    if (node.type === "html" || node.type === "definition") return [];
    if (node.type === "break") return [new TextRun({ break: 1 })];
    if (node.type === "image") return [new TextRun(node.alt || "")];
    if (node.type === "strong") style = { ...style, bold: true };
    if (node.type === "emphasis") style = { ...style, italics: true };
    if (node.type === "delete") style = { ...style, strike: true };
    if (node.type === "inlineCode" || node.type === "code")
      style = { ...style, font: "Consolas" };
    if (node.value !== undefined)
      return [new TextRun({ text: node.value, ...style })];
    const children = (node.children || []).flatMap((child) =>
      runs(child, style),
    );
    if (node.type === "link" && /^(https?:|mailto:)/i.test(node.url))
      return [new ExternalHyperlink({ link: node.url, children })];
    return children;
  }
  function blocks(nodes, level = 0) {
    return nodes.flatMap((node) => {
      if (node.type === "html" || node.type === "definition") return [];
      if (node.type === "list") {
        return node.children.flatMap((item, index) =>
          item.children.flatMap((child, i) => {
            if (child.type === "list") return blocks([child], level + 1);
            const marker = node.ordered
              ? String((node.start || 1) + index) + ". "
              : "- ";
            const checked =
              typeof item.checked === "boolean"
                ? item.checked
                  ? "[x] "
                  : "[ ] "
                : "";
            return [
              new Paragraph({
                children: [
                  ...(i === 0 ? [new TextRun(marker + checked)] : []),
                  ...runs(child),
                ],
                indent: { left: 240 * (level + 1) },
                spacing: { after: 100 },
              }),
            ];
          }),
        );
      }
      if (node.type === "blockquote") return blocks(node.children, level + 1);
      if (node.type === "table")
        return node.children.map(
          (row) =>
            new Paragraph({
              children: row.children.flatMap((cell, i) => [
                ...(i ? [new TextRun(" | ")] : []),
                ...runs(cell),
              ]),
            }),
        );
      if (node.type === "code")
        return node.value
          .split("\n")
          .map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line, font: "Consolas" })],
              }),
          );
      return [
        new Paragraph({
          children:
            node.type === "thematicBreak" ? [new TextRun("—")] : runs(node),
          ...(node.type === "heading"
            ? { heading: HeadingLevel[`HEADING_${node.depth}`] }
            : {}),
          spacing: { after: 160 },
        }),
      ];
    });
  }
  const doc = new Document({
    creator: "HireDraft",
    title: email.subject,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { after: 160, line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: `Subject: ${email.subject}`, bold: true }),
            ],
            spacing: { after: 280 },
          }),
          ...(email.bodyFormat === "markdown"
            ? blocks(parseMarkdown(email.body).children)
            : email.body.split(/\r?\n/).map(
                (line) =>
                  new Paragraph({
                    children: [new TextRun(line)],
                    spacing: { after: line ? 80 : 120 },
                  }),
              )),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export async function downloadEmail(email, format) {
  const blob =
    format === "docx"
      ? await emailDocx(email)
      : new Blob([format === "md" ? emailMarkdown(email) : emailText(email)], {
          type:
            format === "md"
              ? "text/markdown;charset=utf-8"
              : "text/plain;charset=utf-8",
        });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `HireDraft-generation-${email.metadata?.generation || 1}.${format}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
