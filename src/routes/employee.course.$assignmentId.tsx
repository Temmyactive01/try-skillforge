import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { EmployeeShell } from "@/components/EmployeeShell";
import { CourseContent } from "@/components/CourseContent";
import { Quiz, type Question } from "@/components/Quiz";
import { PRACTICE_NOTE, QuizResult, type Result } from "@/components/QuizResult";
import { submitQuiz } from "@/lib/quiz.functions";
import { dueLabel, finishedDueLabel } from "@/lib/dates";
import type { TrainingStatus } from "@/lib/training";
import { Button } from "@/components/ui/button";
import { Tag, type TagTone } from "@/components/ui/tag";
import { toastFailed } from "@/components/ui/sonner";

export const Route = createFileRoute("/employee/course/$assignmentId")({
  head: () => ({ meta: [{ title: "Course — SkillForge" }] }),
  component: CoursePage,
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  content_url: string | null;
};

type Assignment = {
  id: string;
  status: TrainingStatus;
  due_date: string | null;
  course: Course | null;
};

const STATUS: Record<TrainingStatus, { label: string; tone: TagTone }> = {
  not_started: { label: "Not started", tone: "quiet" },
  in_progress: { label: "In progress", tone: "bronze" },
  complete: { label: "Complete", tone: "blue" },
  cancelled: { label: "Cancelled", tone: "quiet" },
};

function CoursePage() {
  const submitQuizFn = useServerFn(submitQuiz);
  const { assignmentId } = Route.useParams();
  const { checking, name } = useRequireRole("employee");
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingQuiz, setTakingQuiz] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (checking) return;
    (async () => {
      const { data } = await supabase
        .from("assignments")
        .select(
          "id, status, due_date, course:courses(id, title, description, content_type, content_url)",
        )
        .eq("id", assignmentId)
        .maybeSingle();

      const found = data as unknown as Assignment | null;
      if (found) {
        setAssignment(found);
        if (found.course) {
          // correct_answer is revoked from every signed-in user at the column
          // level, so the columns have to be named: select("*") would fail.
          const { data: rows } = await supabase
            .from("quiz_questions")
            .select("id, question_text, options")
            .eq("course_id", found.course.id);
          setQuestions(
            (rows ?? []).map((q) => ({
              id: q.id,
              question_text: q.question_text,
              options: Array.isArray(q.options) ? (q.options as string[]) : [],
            })),
          );
        }
      }
      setLoading(false);
    })();
  }, [assignmentId, checking]);

  if (checking) return null;

  /**
   * Opening the quiz is what "I've started this" means.
   *
   * Not started → In progress is the only status change an employee is allowed
   * to make, and the database enforces that; everything else belongs to the
   * grader or an admin.
   */
  async function startQuiz() {
    setTakingQuiz(true);
    setResult(null);
    if (assignment?.status === "not_started") {
      const { error } = await supabase
        .from("assignments")
        .update({ status: "in_progress" })
        .eq("id", assignment.id);
      if (error) {
        toastFailed("Couldn't mark this course as started. Your answers will still be marked.");
        return;
      }
      setAssignment({ ...assignment, status: "in_progress" });
    }
  }

  async function handleSubmit(answers: Record<string, string>) {
    if (!assignment) return false;
    setSubmitting(true);
    const wasAlreadyComplete = assignment.status === "complete";
    try {
      const response = await submitQuizFn({
        data: { assignment_id: assignment.id, answers },
      });
      setResult({
        score: response.score,
        passed: response.passed,
        review: response.review,
        wasAlreadyComplete,
      });
      setTakingQuiz(false);
      setAssignment({ ...assignment, status: response.status as TrainingStatus });
      return true;
    } catch (error) {
      console.error("Quiz submission failed", error);
      toastFailed("Couldn't send your answers. Check your connection and submit again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <EmployeeShell name={name}>
        <p className="text-small text-ink-muted">Loading…</p>
      </EmployeeShell>
    );
  }

  if (!assignment || !assignment.course) {
    return (
      <EmployeeShell name={name}>
        <h1 className="text-heading-1 font-expanded text-ink">Course not found</h1>
        <p className="mt-2 text-body text-ink-muted">
          This training isn't assigned to you, or it has been cancelled.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/employee/home">Back to my training</Link>
        </Button>
      </EmployeeShell>
    );
  }

  const course = assignment.course;
  const complete = assignment.status === "complete";
  const status = STATUS[assignment.status];
  const due = complete ? finishedDueLabel(assignment.due_date) : dueLabel(assignment.due_date);

  return (
    <EmployeeShell name={name}>
      <Link
        to="/employee/home"
        className="inline-flex items-center gap-2 rounded-sm text-small text-ink-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to my training
      </Link>

      <h1 className="mt-4 text-heading-1 font-expanded text-ink">{course.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Tag tone={status.tone}>{status.label}</Tag>
        <p
          className={`text-small ${due.tone === "overdue" ? "font-medium text-oxide" : "text-ink-muted"}`}
        >
          {due.label}
        </p>
      </div>

      {course.description && (
        <p className="mt-4 max-w-[66ch] text-body text-ink-muted">{course.description}</p>
      )}

      {/* The page reads like a document: content first, quiz below. */}
      <article className="mt-8">
        <CourseContent type={course.content_type ?? "text"} content={course.content_url ?? ""} />
      </article>

      <div className="mt-12">
        {result ? (
          <QuizResult
            result={result}
            onRetake={startQuiz}
            onDone={() => navigate({ to: "/employee/home" })}
          />
        ) : takingQuiz ? (
          questions.length === 0 ? (
            <p className="text-body text-ink-muted">This course has no quiz questions.</p>
          ) : (
            <Quiz questions={questions} submitting={submitting} onSubmit={handleSubmit} />
          )
        ) : (
          <section className="rounded-md border border-steel bg-surface p-4 md:p-6">
            <h2 className="text-heading-2 text-ink">
              {complete ? "Retake the quiz" : "Ready for the quiz?"}
            </h2>
            <p className="mt-2 max-w-[66ch] text-body text-ink-muted">
              {questions.length === 0
                ? "This course has no quiz questions."
                : complete
                  ? // Said before they start, not only after they finish.
                    PRACTICE_NOTE
                  : `There ${questions.length === 1 ? "is 1 question" : `are ${questions.length} questions`}, one at a time. You can go back and change an answer before you hand it in.`}
            </p>
            {questions.length > 0 && (
              <Button className="mt-4" onClick={startQuiz}>
                {complete ? "Retake the quiz" : "Start the quiz"}
              </Button>
            )}
          </section>
        )}
      </div>
    </EmployeeShell>
  );
}
