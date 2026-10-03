"use client";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Tabs } from "radix-ui";
import { Plus } from "@/components/ui/material-icons";
import { cn } from "@/lib/utils";

interface FAQEntry {
  question: string;
  answer: ReactNode;
}
interface FAQProps extends ComponentProps<"section"> {
  title?: string;
  subtitle?: string;
  categories: Record<string, string>;
  faqData: Record<string, FAQEntry[]>;
}
export function FAQ({
  title = "Frequently asked questions",
  subtitle = "A few things worth knowing",
  categories,
  faqData,
  className,
  children,
  ...props
}: FAQProps) {
  const keys = Object.keys(categories);
  const [selected, setSelected] = useState(keys[0]);
  const reduced = useReducedMotion();
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn("section-shell relative", className)}
      {...props}
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">{subtitle}</p>
        <h2 id={titleId} className="section-title">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          From your first upload to your final draft, here is what to expect.
        </p>
      </div>
      <Tabs.Root value={selected} onValueChange={setSelected} className="mt-8">
        <Tabs.List
          aria-label="FAQ categories"
          className="flex flex-wrap justify-center gap-2"
        >
          {keys.map((key) => (
            <Tabs.Trigger
              key={key}
              value={key}
              className="relative isolate overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary-foreground"
            >
              {selected === key && (
                <motion.span
                  aria-hidden="true"
                  initial={reduced ? false : { y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="absolute inset-0 -z-10 bg-primary"
                />
              )}
              {categories[key]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {keys.map((key) => (
          <Tabs.Content
            key={key}
            value={key}
            className="mx-auto mt-8 max-w-3xl rounded-xl outline-offset-4"
          >
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className="space-y-3"
            >
              {(faqData[key] || []).map((item) => (
                <FAQItem key={item.question} {...item} />
              ))}
            </motion.div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
      {children}
    </section>
  );
}
function FAQItem({ question, answer }: FAQEntry) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduced = useReducedMotion();
  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        open ? "bg-muted/50" : "bg-card",
      )}
    >
      <h3>
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-answer`}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-4 rounded-xl p-5 text-left text-sm font-medium sm:text-base"
        >
          {question}
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="flex shrink-0 text-muted-foreground"
          >
            <Plus className="size-5" />
          </motion.span>
        </button>
      </h3>
      <div
        id={`${id}-answer`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        hidden={!open}
      >
        {open && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-muted-foreground"
          >
            {answer}
          </motion.div>
        )}
      </div>
    </div>
  );
}
