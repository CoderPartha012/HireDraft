"use client";

import { useEffect, useRef, useState } from "react";

export default function TypingText({ text, className = "", duration = 1600 }) {
  const element = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  let index = 0;
  const count = Array.from(text).length;
  return (
    <span
      ref={element}
      className={`landing-typing ${className}`}
      data-typing={started}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(/(\s+)/).map((word, wordIndex) => (
          <span
            key={wordIndex}
            className={word.trim() ? "typing-word" : undefined}
          >
            {Array.from(word).map((character) => (
              <span
                key={index}
                className="typing-letter"
                style={{
                  "--letter-delay": `${Math.round((index++ * duration) / Math.max(1, count))}ms`,
                }}
              >
                {character}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
