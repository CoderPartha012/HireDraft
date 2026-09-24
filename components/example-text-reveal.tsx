"use client";

import { motion, useReducedMotion } from "motion/react";

export default function ExampleTextReveal({ text }: { text: string }) {
  const reduced = useReducedMotion();
  let index = 0;
  return (
    <div className="example-body-reveal text-sm leading-7 text-white/75">
      <span className="sr-only">{text}</span>
      <motion.div
        aria-hidden="true"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {text.split("\n\n").map((paragraph, p) => (
          <p key={p} className="whitespace-pre-line [&+p]:mt-4">
            {paragraph.split(/(\s+)/).map((word, w) =>
              word.trim() ? (
                <motion.span
                  key={w}
                  className="inline-block"
                  variants={{
                    hidden: {
                      opacity: reduced ? 1 : 0.15,
                      filter: reduced ? "none" : "blur(3px)",
                    },
                    visible: { opacity: 1, filter: "blur(0px)" },
                  }}
                  transition={{
                    duration: reduced ? 0 : 0.35,
                    delay: reduced ? 0 : index++ * 0.012,
                  }}
                >
                  {word}
                </motion.span>
              ) : (
                word
              ),
            )}
          </p>
        ))}
      </motion.div>
    </div>
  );
}
