import Link from "next/link";
import { Mail } from "@/components/ui/material-icons";
export default function Brand() {
  return (
    <Link
      href="/#top"
      className="inline-flex shrink-0 items-center gap-2.5 text-lg font-semibold tracking-tight"
      aria-label="HireDraft home"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Mail size={17} strokeWidth={1.8} />
      </span>
      HireDraft
    </Link>
  );
}
