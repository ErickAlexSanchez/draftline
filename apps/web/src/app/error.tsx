"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="content" className="wrap">
      <h1>Something went wrong</h1>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
