import Link from "next/link";
import Brand from "./brand";
export default function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="page-width flex flex-col justify-between gap-6 py-9 sm:flex-row sm:items-center">
        <div>
          <Brand />
          <p className="mt-3 text-xs text-muted-foreground">
            Your experience, thoughtfully introduced.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground"
        >
          {[
            ["/about", "About"],
            ["/contact", "Contact"],
            ["/privacy", "Privacy Policy"],
            ["/terms", "Terms of Service"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="nav-link">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
