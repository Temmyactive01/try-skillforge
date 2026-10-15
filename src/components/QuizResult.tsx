import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemperProgress } from "@/components/ui/temper-progress";
import { PASS_MARK } from "@/lib/scores";

export type ReviewItem = {
  id: string;
  question_text: string;
  your_answer: string | null;
  /*
   * Absent on a failed attempt. The grader only sends the answers to someone
   * who has already earned them — see submitQuiz. Treating this as optional is
   * not defensive coding: it is the shape the server really returns.
   */
  correct_answer?: string;
  is_correct: boolean;
};

export type Result = {
  score: number;
  passed: boolean;
  review: ReviewItem[];
  /** The assignment was already complete before this attempt: this was practice. */
  wasAlreadyComplete: boolean;
};

/** The one sentence that has to be true before anyone retakes a finished course. */
export const PRACTICE_NOTE =
  "This course is complete. Retaking it is for practice and won't change your result.";

export function QuizResult({
  result,
  onRetake,
  onDone,
}: {
  result: Result;
  onRetake: () => void;
  onDone: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The result is the answer to what they just did, so focus goes to it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const { score, passed, review, wasAlreadyComplete } = result;

  return (
    <section
      // Announced to a screen reader without interrupting whatever it is saying.
      role="status"
      aria-live="polite"
      className="rounded-md border border-steel bg-surface p-4 md:p-6"
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-heading-2 text-ink focus-visible:outline-none"
      >
        {passed ? "You passed" : "You didn't pass this time"}
      </h2>

      <div className="mt-4 max-w-sm">
        {/* The one place DESIGN.md allows animating the fill: a value that
            just changed because of something the person did. */}
        <TemperProgress value={score} label="Your score" animate />
      </div>

      <p className="mt-3 text-body text-ink">
        You scored {score}%. {passed ? `The pass mark is ${PASS_MARK}%.` : null}
      </p>

      {!passed &&
        (wasAlreadyComplete ? (
          <p className="mt-1 text-body text-ink">{PRACTICE_NOTE}</p>
        ) : (
          <p className="mt-1 text-body text-ink">
            You need {PASS_MARK}% to pass. Review the course and try again.
          </p>
        ))}

      {passed && wasAlreadyComplete && <p className="mt-1 text-body text-ink">{PRACTICE_NOTE}</p>}

      {passed && !wasAlreadyComplete && (
        <p className="mt-1 text-body text-ink">This course is now complete.</p>
      )}

      {review.length > 0 && (
        <div className="mt-6">
          <h3 className="text-heading-3 text-ink">Your answers</h3>
          {/* Said once, rather than on every question that has nothing to show. */}
          {!review.some((item) => item.correct_answer !== undefined) && (
            <p className="mt-1 text-small text-ink-muted">
              The correct answers aren't shown until you pass.
            </p>
          )}
          <ol className="mt-3 divide-y divide-steel border-y border-steel">
            {review.map((item, index) => (
              <ReviewRow key={item.id} item={item} index={index} />
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onRetake} variant={passed ? "outline" : "default"}>
          Retake the quiz
        </Button>
        <Button onClick={onDone} variant={passed ? "default" : "outline"}>
          Back to my training
        </Button>
      </div>
    </section>
  );
}

function ReviewRow({ item, index }: { item: ReviewItem; index: number }) {
  return (
    <li className="py-3">
      <div className="flex items-start gap-2">
        {/*
         * The icon repeats what the words say. Being right is not a stage of
         * progress, so it gets no temper colour; only being wrong is coloured,
         * and DESIGN.md gives that to oxide.
         */}
        {item.is_correct ? (
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
        ) : (
          <X aria-hidden className="mt-0.5 size-4 shrink-0 text-oxide" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-small text-ink-muted">
            {index + 1}. {item.question_text}
          </p>
          <p className="mt-1 text-body text-ink">
            <span className="font-medium">{item.is_correct ? "Correct" : "Not correct"}</span>
            {" — you answered "}
            {item.your_answer ?? "nothing"}
          </p>
          {!item.is_correct && item.correct_answer !== undefined && (
            <p className="mt-1 text-body text-ink">The answer is {item.correct_answer}</p>
          )}
        </div>
      </div>
    </li>
  );
}
