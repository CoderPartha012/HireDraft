import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function MarkdownPreview({ source }) {
  return (
    <div className="markdown-preview" aria-label="Markdown preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : "")}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => <span>{alt || "Image omitted"}</span>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
