export function StampCheck({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm ${className}`}
      style={{ transform: "rotate(-8deg)" }}
    >
      <svg
        viewBox="0 0 12 12"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 6.5l2.5 2.5 4.5-5" />
      </svg>
    </span>
  );
}
