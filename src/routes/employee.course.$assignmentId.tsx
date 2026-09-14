import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { EmployeeShell } from "@/components/EmployeeShell";
import { submitQuiz } from "@/lib/quiz.functions";

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

type Question = {
  id: string;
  question_text: string;
  options: string[];
};


type ReviewItem = {
  id: string;
  question_text: string;
  your_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
};

type Assignment = {
  id: string;
  status: "not_started" | "in_progress" | "complete";
  due_date: string | null;
  course: Course | null;
};

function CoursePage() {
  const submitQuizFn = useServerFn(submitQuiz);
  const { assignmentId } = Route.useParams();
  const { checking, name } = useRequireRole("employee");
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewed, setViewed] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    review: ReviewItem[];
  } | null>(null);
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
      if (data) {
        const a = data as any as Assignment;
        setAssignment(a);
        if (a.status === "complete") setViewed(true);
        if (a.course) {
          const { data: qs } = await supabase
            .from("quiz_questions_public")
            .select("id, question_text, options")
            .eq("course_id", a.course.id);
          setQuestions(
            (qs ?? []).map((q: any) => ({
              ...q,
              options: Array.isArray(q.options) ? q.options : [],
            })),
          );
        }
      }
      setLoading(false);
    })();
  }, [assignmentId, checking]);

  if (checking) return null;

  async function markViewed() {
    setViewed(true);
    if (assignment && assignment.status === "not_started") {
      await supabase
        .from("assignments")
        .update({ status: "in_progress" })
        .eq("id", assignment.id);
    }
  }

  async function handleSubmit() {
    if (!assignment || questions.length === 0) return;
    setSubmitting(true);
    try {
      const res = await submitQuizFn({
        data: { assignment_id: assignment.id, answers },
      });
      setResult({
        score: res.score,
        passed: res.passed,
        review: (res as any).review ?? [],
      });
    } catch (err) {
      console.error("Quiz submission failed", err);
    } finally {
      setSubmitting(false);
    }
  }

  function retakeQuiz() {
    setResult(null);
    setAnswers({});
    setShowQuiz(true);
  }

  if (loading) {
    return (
      <EmployeeShell name={name}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </EmployeeShell>
    );
  }

  if (!assignment || !assignment.course) {
    return (
      <EmployeeShell name={name}>
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Link to="/employee/home" className="text-sm text-primary underline">
          Back to home
        </Link>
      </EmployeeShell>
    );
  }

  const c = assignment.course;

  return (
    <EmployeeShell name={name}>
      <Link
        to="/employee/home"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-foreground">{c.title}</h1>
      {c.description && (
        <p className="mb-6 text-sm text-muted-foreground">{c.description}</p>
      )}

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <CourseContent
          type={c.content_type ?? "text"}
          content={c.content_url ?? ""}
        />
      </div>

      {result ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 font-serif text-lg font-semibold text-foreground">
            Quiz {result.passed ? "Passed" : "Not Passed"}
          </h2>
          <p className="mb-4 text-sm text-foreground">
            You scored <span className="font-medium">{result.score}%</span>
            {result.passed
              ? " — nice work!"
              : " — a passing score of 70% is required. You can retake the quiz."}
          </p>
          <div className="flex gap-2">
            {!result.passed && (
              <button
                onClick={retakeQuiz}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Retake Quiz
              </button>
            )}
            <button
              onClick={() => navigate({ to: "/employee/home" })}
              className={
                result.passed
                  ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  : "rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
              }
            >
              Back to my learning
            </button>
          </div>
        </div>
      ) : showQuiz ? (

        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h2 className="font-serif text-lg font-semibold text-foreground">Quiz</h2>
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This course has no quiz questions.
            </p>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id}>
                <div className="mb-2 text-sm font-medium text-foreground">
                  {idx + 1}. {q.question_text}
                </div>
                <div className="space-y-1.5">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/40"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={(e) =>
                          setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        }
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              questions.length === 0 ||
              questions.some((q) => !answers[q.id])
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Quiz"}
          </button>
        </div>
      ) : viewed ? (
        <button
          onClick={() => setShowQuiz(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Take Quiz
        </button>
      ) : (
        <button
          onClick={markViewed}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          I've reviewed the content
        </button>
      )}
    </EmployeeShell>
  );
}

function CourseContent({ type, content }: { type: string; content: string }) {
  if (!content) {
    return <p className="text-sm text-muted-foreground">No content provided.</p>;
  }
  if (type === "video") {
    const embed = toEmbed(content);
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        {embed ? (
          <iframe
            src={embed}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <a
            href={content}
            target="_blank"
            rel="noreferrer"
            className="block p-4 text-sm text-white underline"
          >
            {content}
          </a>
        )}
      </div>
    );
  }
  if (type === "pdf") {
    return (
      <div className="space-y-2">
        <iframe src={content} className="h-[600px] w-full rounded-md border" />
        <a
          href={content}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline"
        >
          Open PDF in new tab
        </a>
      </div>
    );
  }
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {content}
    </div>
  );
}

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return null;
  }
}
