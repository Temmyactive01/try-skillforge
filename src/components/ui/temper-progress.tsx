import { cn } from "@/lib/utils";

/*
 * A progress bar whose fill follows the temper scale, so completion reads at a
 * glance down a whole table. See DESIGN.md → "TemperProgress".
 *
 * A forge tempers steel through straw, bronze, violet and blue; the four stages
 * get darker as they go, so they stay distinguishable without relying on hue.
 * The number always sits beside the bar — colour is never the only signal.
 */

/** 0% has no fill at all: cold steel, nothing started yet. */
function temperStage(value: number): "cold" | "straw" | "bronze" | "violet" | "blue" {
  if (value <= 0) return "cold";
  if (value <= 33) return "straw";
  if (value <= 66) return "bronze";
  if (value < 100) return "violet";
  return "blue";
}

const FILL: Record<ReturnType<typeof temperStage>, string> = {
  cold: "",
  straw: "bg-temper-straw",
  bronze: "bg-temper-bronze",
  violet: "bg-temper-violet",
  blue: "bg-temper-blue",
};

type TemperProgressProps = {
  /** Percentage complete, 0–100. */
  value: number;
  /** What the bar measures, for screen readers (e.g. "Best quiz score"). */
  label: string;
  /** The number beside the bar. Turn it off where an adjacent figure already shows it. */
  showValue?: boolean;
  /**
   * DESIGN.md: don't animate on page load. Opt in only where the value changes
   * after an action, such as passing a quiz.
   */
  animate?: boolean;
  className?: string;
};

export function TemperProgress({
  value,
  label,
  showValue = true,
  animate = false,
  className,
}: TemperProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const complete = pct === 100;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 min-w-16 flex-1 overflow-hidden rounded-sm bg-surface inset-ring-1 inset-ring-steel-strong"
      >
        <div
          className={cn("h-full rounded-sm", FILL[temperStage(pct)], animate && "transition-all")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span
          className={cn(
            "shrink-0 text-small tabular-nums",
            complete ? "font-semibold text-temper-blue" : "text-ink",
          )}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
