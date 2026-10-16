import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/*
 * The mark both shells and the sign-in pages already use: a billet of steel,
 * tempered blue. The marketing site uses the same one rather than inventing a
 * logo for visitors that nobody sees again after signing in.
 *
 * It is temper-blue because that is the brand colour. It never shows the other
 * three temper stages: those mean progress, and a logo is not progress.
 */
export function SkillForgeMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-5 shrink-0 rounded-sm bg-temper-blue", className)}
    />
  );
}

/** The mark and the name, linking home. */
export function SkillForgeWordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-heading-3 font-semibold text-ink",
        className,
      )}
    >
      <SkillForgeMark />
      SkillForge
    </Link>
  );
}
