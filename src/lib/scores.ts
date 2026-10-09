/** The highest quiz score among an assignment's attempts, or null if it has none. */
export function bestScore(results: { score: number }[] | null | undefined): number | null {
  if (!results?.length) return null;
  return Math.max(...results.map((r) => r.score));
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
