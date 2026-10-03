import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-content-center gap-6 p-8 text-center"
    >
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <h1 className="text-4xl font-semibold">Let’s find your next step.</h1>
      <Link href="/" className="button-primary mx-auto">
        Back to HireDraft
      </Link>
    </main>
  );
}
