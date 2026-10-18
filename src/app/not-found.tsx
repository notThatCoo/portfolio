import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9500] grid place-items-center p-6">
      <div
        role="alert"
        className="glass pointer-events-auto w-full max-w-sm rounded-2xl border border-line-strong bg-surface p-6 text-center shadow-2xl"
      >
        <p className="font-mono text-xs text-faint">404</p>
        <h2 className="mt-1 text-lg font-semibold">That file doesn’t exist</h2>
        <p className="mt-2 text-sm text-muted">It may have been moved, or the link has a typo.</p>
        <Link href="/" className="button mt-5">
          Back to the desktop
        </Link>
      </div>
    </div>
  );
}
