import Link from "next/link";
import { Mail } from "lucide-react";

export default function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight"
      aria-label="HireDraft home"
    >
      <span className="flex size-8 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white">
        <Mail size={18} strokeWidth={1.5} />
      </span>
      HireDraft<span className="text-lime">.</span>
    </Link>
  );
}
