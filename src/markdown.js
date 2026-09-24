import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
const parser = unified().use(remarkParse).use(remarkGfm);
export const parseMarkdown = (text) => parser.parse(text);
export const escapeMarkdown = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/([\\`*_{}\[\]()#+.!|~\-])/g, "\\$1")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
export const plainToMarkdown = (text) =>
  escapeMarkdown(text).replace(/\n/g, "  \n");
export function markdownToText(source) {
  const tree = parseMarkdown(source);
  const definitions = new Map();
  function find(node) {
    if (node.type === "definition") definitions.set(node.identifier, node.url);
    node.children?.forEach(find);
  }
  find(tree);
  const safe = (url) => /^(https?:|mailto:)/i.test(url || "");
  function text(node) {
    const children = () => (node.children || []).map(text).join("");
    switch (node.type) {
      case "html":
      case "definition":
        return "";
      case "text":
      case "inlineCode":
      case "code":
        return node.value;
      case "image":
      case "imageReference":
        return node.alt || "";
      case "break":
        return "\n";
      case "thematicBreak":
        return "---";
      case "link":
      case "linkReference": {
        const url = node.url || definitions.get(node.identifier);
        const label = children();
        return safe(url) && url !== label ? `${label} (${url})` : label;
      }
      case "root":
      case "blockquote":
        return (node.children || []).map(text).filter(Boolean).join("\n\n");
      case "list":
        return node.children
          .map(
            (item, i) =>
              `${node.ordered ? `${(node.start || 1) + i}.` : "-"} ${text(item)}`,
          )
          .join("\n");
      case "listItem":
        return `${typeof node.checked === "boolean" ? (node.checked ? "[x] " : "[ ] ") : ""}${node.children.map(text).join("\n")}`;
      case "table":
        return node.children.map(text).join("\n");
      case "tableRow":
        return node.children.map(text).join(" | ");
      default:
        return children();
    }
  }
  return text(tree);
}
export const emailBodyText = (email) =>
  email.bodyFormat === "markdown" ? markdownToText(email.body) : email.body;
