import * as React from "react";

import { cn } from "@/lib/utils";

// DESIGN.md: a field sits on `surface` with a `steel-strong` edge (`steel` is
// below 3:1, so it can never be the only edge of a control), radius-sm for a
// control, body text, and the temper-blue focus ring. No shadow.
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-20 w-full rounded-sm border border-steel-strong bg-surface px-3 py-2 text-body text-ink transition-colors placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
