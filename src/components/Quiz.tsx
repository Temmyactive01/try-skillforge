import { useEffect, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Question = { id: string; question_text: string; options: string[] };

/*
 * The quiz: one question at a time, at every width.
 *
 * DESIGN.md: "Employee screens show one thing at a time: the next course, the
 * next question." It doesn't make that a phone-only rule, and one code path
 * means one set of keyboard, focus and validation behaviours rather than two
 * that drift apart. What a show-everything layout would buy — checking your
 * work before committing to it — is a step of its own instead, which also
 * works on a phone.
 *
 * There is deliberately no <form> here. A form would make Enter submit the
 * quiz from whichever question happened to have focus, which is a horrible way
 * to find out you have finished.
 */
export function Quiz({
  questions,
  submitting,
  onSubmit,
}: {
  questions: Question[];
  submitting: boolean;
  /** Resolves false if the answers never reached the server, so the guard comes back. */
  onSubmit: (answers: Record<string, string>) => Promise<boolean>;
}) {
  // One past the last question is the "check your answers" step.
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const onSummary = step >= questions.length;
  const question = onSummary ? undefined : questions[step];
  const answered = question ? answers[question.id] !== undefined : true;

  /*
   * Work worth losing a warning over: at least one answer given, and not yet
   * handed in. Submitting clears it, so finishing the quiz never argues with
   * you on the way out.
   */
  const hasProgress = Object.keys(answers).length > 0 && !submitted;

  // Covers navigation inside the app; enableBeforeUnload covers closing the tab.
  const blocker = useBlocker({
    shouldBlockFn: () => true,
    enableBeforeUnload: () => hasProgress,
    disabled: !hasProgress,
    withResolver: true,
  });

  /*
   * Every step puts the quiz at the top of the screen and focus on the new
   * question — including the first, which opens below a page of course content
   * and would otherwise start halfway down with its buttons off the bottom.
   *
   * The scroll happens first and focus is told not to scroll, so the two don't
   * fight over where the page ends up.
   */
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function choose(value: string) {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  async function submit() {
    // Dropped before the request so a slow network can't make the warning
    // appear over a quiz that is already on its way.
    setSubmitted(true);
    const delivered = await onSubmit(answers);
    // It never arrived, so the answers are unsaved work again.
    if (!delivered) setSubmitted(false);
  }

  return (
    <section
      ref={panelRef}
      aria-labelledby="quiz-heading"
      className="scroll-mt-4 rounded-md border border-steel bg-surface p-4 md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quiz-heading" className="text-heading-2 text-ink">
          Quiz
        </h2>
        <p className="text-small text-ink-muted">
          {onSummary ? "Check your answers" : `Question ${step + 1} of ${questions.length}`}
        </p>
      </div>

      {onSummary ? (
        <Summary
          questions={questions}
          answers={answers}
          onChange={setStep}
          headingRef={headingRef}
        />
      ) : (
        question && (
          <div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-heading-3 text-ink focus-visible:outline-none"
            >
              {question.question_text}
            </h3>

            <RadioGroup
              className="mt-4 gap-2"
              value={answers[question.id] ?? ""}
              onValueChange={choose}
            >
              {question.options.map((option, index) => {
                const id = `${question.id}-${index}`;
                return (
                  <div
                    key={option}
                    className="flex items-center gap-3 rounded-sm border border-steel-strong px-3 py-3 transition-colors hover:bg-accent/40 has-[[data-state=checked]]:border-temper-blue"
                  >
                    <RadioGroupItem id={id} value={option} />
                    {/* Every option carries its own visible, clickable label. */}
                    <Label htmlFor={id} className="flex-1 cursor-pointer text-body font-normal">
                      {option}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        )
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>

        {onSummary ? (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit quiz"}
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!answered}>
            Next
          </Button>
        )}
      </div>

      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Your answers haven't been submitted, so they won't be saved. You can come back and
              start the quiz again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Stay on the quiz
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>
              Leave the quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Summary({
  questions,
  answers,
  onChange,
  headingRef,
}: {
  questions: Question[];
  answers: Record<string, string>;
  onChange: (step: number) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-heading-3 text-ink focus-visible:outline-none"
      >
        Check your answers
      </h3>
      <p className="mt-1 text-small text-ink-muted">
        Change anything you want to before you hand it in.
      </p>

      <ol className="mt-4 divide-y divide-steel border-y border-steel">
        {questions.map((question, index) => (
          <li key={question.id} className="flex items-start gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-small text-ink-muted">
                {index + 1}. {question.question_text}
              </p>
              <p className="mt-1 text-body text-ink">{answers[question.id]}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(index)}
              aria-label={`Change your answer to question ${index + 1}`}
            >
              Change
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
