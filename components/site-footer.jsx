import Link from "next/link";
import Brand from "./brand";

export default function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 border-t border-white/10 px-6 py-8 lg:px-10">
      <div>
        <Brand />
        <p className="mt-3 text-xs text-muted">
          Your experience, thoughtfully introduced.
        </p>
      </div>
      <nav
        aria-label="Footer navigation"
        className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted"
      >
        {[
          ["/privacy", "Privacy Policy"],
          ["/terms", "Terms of Service"],
          ["/contact", "Contact"],
          ["/about", "About"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="nav-link">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
