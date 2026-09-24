import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Brand from "./brand";
import SiteFooter from "./site-footer";

export default function InfoPage({ title, intro, children }) {
  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-8 lg:px-10">
        <Brand />
        <Link href="/analyze-job" className="button-secondary !text-xs">
          Open workspace <ArrowUpRight size={14} />
        </Link>
      </header>
      <main
        id="main-content"
        className="mx-auto min-h-[60vh] max-w-3xl px-6 pb-24 pt-12"
      >
        <Link
          href="/"
          className="mb-9 inline-flex items-center gap-2 text-xs text-muted"
        >
          <ArrowLeft size={14} /> Back to HireDraft
        </Link>
        <p className="eyebrow">HIREDRAFT</p>
        <h1 className="section-title">{title}</h1>
        <p className="mb-12 mt-5 text-base leading-8 text-muted">{intro}</p>
        <div className="liquid-glass info-content space-y-9 rounded-3xl p-6 sm:p-9 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-medium [&_p]:text-sm [&_p]:leading-7 [&_p]:text-muted [&_a]:text-lime [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
