/** The highest quiz score among an assignment's attempts, or null if it has none. */
export function bestScore(results: { score: number }[] | null | undefined): number | null {
  if (!results?.length) return null;
  return Math.max(...results.map((r) => r.score));
}
