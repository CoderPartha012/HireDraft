import Link from "next/link";
import { ArrowLeft } from "@/components/ui/material-icons";
import SiteHeader from "./site-header";
import SiteFooter from "./site-footer";
export default function InfoPage({ title, intro, children }) {
  return (
    <>
      <SiteHeader />
      <main
        id="main-content"
        className="mx-auto min-h-[65vh] max-w-3xl px-6 py-14 sm:py-20"
      >
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back to HireDraft
        </Link>
        <h1 className="section-title">{title}</h1>
        <p className="mb-10 mt-5 text-base leading-relaxed text-muted-foreground">
          {intro}
        </p>
        <div className="info-content space-y-8 border-t pt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
