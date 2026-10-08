import { Toaster as Sonner, toast } from "sonner";

/*
 * See DESIGN.md → "Toast". One toaster per shell. A confirmation repeats the
 * verb and dismisses itself; a failure says how to fix the problem and stays
 * until the user dismisses it, because a message that vanishes before it has
 * been read is worse than none.
 */

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      // A hairline separates a panel from what's behind it; shadows don't.
      toastOptions={{
        closeButtonAriaLabel: "Dismiss",
        classNames: {
          toast:
            "group toast pointer-events-auto flex w-full items-start gap-3 rounded-md border border-steel bg-surface p-4 text-body text-ink",
          description: "text-small text-ink-muted",
          error: "border-oxide/40 bg-oxide/10 text-oxide [&_[data-description]]:text-oxide",
          actionButton: "rounded-md bg-temper-blue px-3 py-1 text-small text-on-temper-blue",
          cancelButton: "rounded-md px-3 py-1 text-small text-ink-muted",
          closeButton: "border-steel bg-surface text-ink",
        },
      }}
      {...props}
    />
  );
};

/** A finished action: repeats the verb, names the thing, dismisses itself. */
export function toastDone(message: string) {
  toast.success(message);
}

/**
 * An action that failed. Says what went wrong and how to fix it, and stays on
 * screen until dismissed.
 */
export function toastFailed(message: string) {
  toast.error(message, { duration: Infinity, closeButton: true });
}

export { Toaster };
