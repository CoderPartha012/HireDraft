import Link from "next/link";
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-content-center gap-6 p-8 text-center"
    >
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1 className="text-4xl font-semibold">Let’s find your next step.</h1>
      <Link href="/" className="button-primary mx-auto">
        Back to HireDraft
      </Link>
    </main>
  );
}
