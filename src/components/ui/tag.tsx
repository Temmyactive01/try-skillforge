import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * A status tag: a soft tinted fill and no outline, so it is never mistaken for
 * a button. The word always carries the meaning — colour is a second signal,
 * never the only one.
 *
 * Tones follow DESIGN.md. The temper colours mean progress and nothing else,
 * so a tag only gets one when it really is a stage of progress: `bronze` for
 * work under way, `blue` for finished. Everything else is steel.
 *
 * `straw` is the one deadline that wears a temper colour, because DESIGN.md's
 * own temper table gives stage 1 two meanings: "1–33% complete, or due soon".
 * It is a fill and not a text colour in the light theme, so the tint carries it
 * and the word stays `ink` — writing in straw is what made "Due in 2 days"
 * unreadable on the old employee page.
 */
export type TagTone = "neutral" | "quiet" | "straw" | "bronze" | "blue" | "oxide";

const TONE: Record<TagTone, string> = {
  neutral: "bg-steel/25 text-ink",
  quiet: "bg-steel/40 text-ink-muted",
  straw: "bg-temper-straw/20 text-ink",
  bronze: "bg-temper-bronze/15 text-temper-bronze",
  blue: "bg-temper-blue/15 text-temper-blue",
  oxide: "bg-oxide/10 text-oxide",
};

export function Tag({
  tone,
  className,
  children,
}: {
  tone: TagTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-small font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
