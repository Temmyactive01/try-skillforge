/**
 * Puts the cursor in the first field that has a problem.
 *
 * A field error sits beside its field and is tied to it with aria-describedby,
 * which is the right place for it — but nothing announces it on its own.
 * Moving focus there reads the label and the problem together, and lands the
 * user exactly where the fix has to be typed.
 *
 * `order` is the order the fields appear in, which is the order they should be
 * offered in — not the order the error object happens to be built in.
 */
export function focusFirstError(order: string[], errors: Record<string, string | undefined>) {
  const first = order.find((id) => errors[id]);
  if (first) document.getElementById(first)?.focus();
}
