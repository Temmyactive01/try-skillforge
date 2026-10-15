/** The highest quiz score among an assignment's attempts, or null if it has none. */
export function bestScore(results: { score: number }[] | null | undefined): number | null {
  if (!results?.length) return null;
  return Math.max(...results.map((r) => r.score));
}

/**
 * When the course was finished: the *first* attempt that passed.
 *
 * Not the latest attempt, and not the latest passing one. Completion is the
 * moment they showed they knew the material; practising afterwards, which a
 * passed assignment allows any number of times, doesn't move that date.
 *
 * Null when nothing has passed — including for an assignment marked complete
 * with no passing attempt behind it, which the app can't produce but older
 * data might.
 */
export function passedAt(
  results: { passed: boolean; completed_at: string }[] | null | undefined,
): string | null {
  const passes = (results ?? []).filter((r) => r.passed).map((r) => r.completed_at);
  if (!passes.length) return null;
  return passes.reduce((earliest, at) => (at < earliest ? at : earliest));
}

/**
 * The score an employee needs to pass a quiz, as a percentage.
 *
 * The server-side grader in `quiz.functions.ts` is the only thing that decides
 * whether an attempt passed, so everything that *mentions* the pass mark reads
 * it from here rather than restating it. A hint that says 70% while the grader
 * uses something else is worse than no hint at all.
 */
export const PASS_MARK = 70;
