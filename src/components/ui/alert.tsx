import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * A message that belongs to the page rather than to an action that finished
 * somewhere else — a form that was refused, a link that has expired. Anything
 * the user must read before carrying on is a dialog; anything about an action
 * that finished elsewhere is a toast (DESIGN.md → "Toast").
 *
 * DESIGN.md: radius-md for panels (radius-lg is dialogs only), never below
 * 14px, and oxide only for things that are wrong — always with words, so the
 * colour is the second signal and never the only one.
 */
const alertVariants = cva(
  "relative w-full rounded-md px-4 py-3 text-small [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg~*]:pl-6",
  {
    variants: {
      variant: {
        // A plain note: a hairline separates it, not a shadow.
        default: "border border-steel bg-surface text-ink [&>svg]:text-ink-muted",
        // Something went wrong, or is about to.
        error: "bg-oxide/10 text-oxide [&>svg]:text-oxide",
        // Something worked. Finishing a task is not progress on the temper
        // scale, so a confirmation gets no temper colour — it stays in ink.
        done: "border border-steel bg-surface text-ink [&>svg]:text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    // An error is announced at once; anything else can wait for a pause.
    role={variant === "error" ? "alert" : "status"}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("mb-1 text-small font-semibold", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-small [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
