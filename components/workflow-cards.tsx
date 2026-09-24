import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";

const stages = [
  {
    label: "01 / Understand",
    title: "The opportunity.",
    description: "Start with the details that matter to the role.",
    items: [
      "Public LinkedIn job or hiring post",
      "Paste a full job description",
      "Review extracted job details",
      "Confirm the requirements",
    ],
  },
  {
    label: "02 / Personalize",
    title: "Your experience.",
    description: "Give your application a foundation in real work.",
    items: [
      "Upload a PDF or DOCX resume",
      "Review and correct your profile",
      "Add relevant application details",
      "Choose your tone and highlights",
    ],
  },
  {
    label: "03 / Introduce",
    title: "A better email.",
    description: "Refine the words until they feel like yours.",
    items: [
      "Generate a subject and email",
      "Edit with Markdown and preview",
      "Export, copy, or open in Gmail",
      "Save versions to browser history",
    ],
  },
];

export default function WorkflowCards() {
  return (
    <section className="c3-pricing-section" aria-labelledby="workflow-title">
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="workflow-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.5"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.075" />
            </feComponentTransfer>
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
          </filter>
        </defs>
      </svg>
      <div className="c3-watermark-container">
        <p className="eyebrow">ONE CONNECTED WORKSPACE</p>
        <h2 id="workflow-title" className="c3-watermark-main">
          <span>Your next chapter.</span>
          <span className="c3-watermark-line-2">Better introduced.</span>
        </h2>
      </div>
      <div className="c3-grid">
        {stages.map((stage, index) => (
          <article
            key={stage.label}
            className={`c3-card ${index === 2 ? "c3-card-pro" : ""}`}
          >
            <p className="c3-tier-small">{stage.label}</p>
            <h3 className="c3-tier-large">{stage.title}</h3>
            <p className="c3-desc">{stage.description}</p>
            <ul className="c3-list">
              {stage.items.map((item) => (
                <li key={item}>
                  <span className="c3-check">
                    <Check size={13} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/analyze-job" className="c3-btn">
              Open workspace <ArrowUpRight size={14} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
