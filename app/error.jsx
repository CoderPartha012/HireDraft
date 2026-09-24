"use client";
export default function ErrorPage({ reset }) {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-content-center gap-6 p-8 text-center"
    >
      <h1 className="text-3xl font-semibold">
        Something interrupted your workspace.
      </h1>
      <p className="text-muted">Try again to reload the page.</p>
      <button className="button-primary mx-auto" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
