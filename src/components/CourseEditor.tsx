import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getCourseForEdit } from "@/lib/courses.functions";
import { PASS_MARK } from "@/lib/scores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export type ContentType = "text" | "video" | "pdf";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "video", label: "Video link" },
  { value: "pdf", label: "PDF link" },
];

const OPTIONS_PER_QUESTION = 4;

type QuestionDraft = {
  /** Stable across renders so React keeps focus when a question is removed. */
  key: string;
  question_text: string;
  options: string[];
  /** Which option is right, or null when nobody has said yet. */
  correct_index: number | null;
};

type Draft = {
  title: string;
  description: string;
  category: string;
  content_type: ContentType;
  content: string;
  questions: QuestionDraft[];
};

let keySeed = 0;
const nextKey = () => `q${++keySeed}`;

function emptyQuestion(): QuestionDraft {
  return {
    key: nextKey(),
    question_text: "",
    options: Array(OPTIONS_PER_QUESTION).fill(""),
    correct_index: null,
  };
}

const emptyDraft = (): Draft => ({
  title: "",
  description: "",
  category: "",
  content_type: "text",
  content: "",
  questions: [emptyQuestion()],
});

/** A question only counts once it has been written. Blank ones are ignored on save. */
const isFilledIn = (q: QuestionDraft) => q.question_text.trim().length > 0;

type Problems = { title?: string; questions: Record<string, string> };

function validate(draft: Draft): Problems {
  const problems: Problems = { questions: {} };
  if (!draft.title.trim()) problems.title = "Enter a course title.";

  for (const q of draft.questions) {
    if (!isFilledIn(q)) continue;
    const filled = q.options.map((o) => o.trim());
    if (filled.filter(Boolean).length < 2) {
      problems.questions[q.key] = "Give this question at least two options.";
      continue;
    }
    if (q.correct_index === null || !filled[q.correct_index]) {
      problems.questions[q.key] = "Select which option is correct.";
    }
  }
  return problems;
}

const hasProblems = (p: Problems) => Boolean(p.title) || Object.keys(p.questions).length > 0;

export function CourseEditor({
  courseId,
  assignmentCount,
  completedCount,
  onCancel,
  onSaved,
}: {
  /** Omitted when creating a new course. */
  courseId?: string;
  /** How many assignments already point at this course, for the warning hint. */
  assignmentCount?: number;
  completedCount?: number;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = Boolean(courseId);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  /** What was loaded, to tell a real edit from an untouched form. */
  const [original, setOriginal] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problems>({ questions: {} });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        /*
         * correct_answer is revoked from the browser at the column level, so
         * the admin who wrote the quiz can't read it back either. This server
         * function is the one path that returns it.
         */
        const { course, questions } = await getCourseForEdit({ data: { course_id: courseId } });
        if (cancelled) return;
        const loaded: Draft = {
          title: course.title ?? "",
          description: course.description ?? "",
          category: course.category ?? "",
          content_type: (course.content_type as ContentType) ?? "text",
          content: course.content_url ?? "",
          questions: questions.length
            ? questions.map((q) => {
                const options = [...q.options];
                while (options.length < OPTIONS_PER_QUESTION) options.push("");
                const correct = options.indexOf(q.correct_answer);
                return {
                  key: nextKey(),
                  question_text: q.question_text,
                  options,
                  correct_index: correct === -1 ? null : correct,
                };
              })
            : [emptyQuestion()],
        };
        setDraft(loaded);
        setOriginal(loaded);
      } catch {
        if (!cancelled) setError("Couldn't open this course. Go back and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Keys change on every load, so compare everything except them.
  const dirty = useMemo(() => {
    const strip = (d: Draft) => ({ ...d, questions: d.questions.map(({ key: _k, ...q }) => q) });
    return JSON.stringify(strip(draft)) !== JSON.stringify(strip(original));
  }, [draft, original]);

  function leave() {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onCancel();
  }

  function patch(changes: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...changes }));
  }

  function patchQuestion(key: string, changes: Partial<QuestionDraft>) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.key === key ? { ...q, ...changes } : q)),
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const found = validate(draft);
    setProblems(found);
    if (hasProblems(found)) {
      if (found.title) titleRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const fields = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        content_type: draft.content_type,
        content_url: draft.content.trim() || null,
        category: draft.category.trim() || null,
      };

      let id = courseId;
      if (id) {
        const { error: upErr } = await supabase.from("courses").update(fields).eq("id", id);
        if (upErr) throw new Error(upErr.message);
        /*
         * The quiz is replaced wholesale rather than diffed. Results live on
         * the assignment, not the question, so nothing an employee has already
         * earned depends on these rows surviving.
         */
        const { error: delErr } = await supabase
          .from("quiz_questions")
          .delete()
          .eq("course_id", id);
        if (delErr) throw new Error(delErr.message);
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("You're signed out. Sign in again to save.");
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (!profile) throw new Error("We couldn't find your company. Sign in again to save.");

        const { data: created, error: insErr } = await supabase
          .from("courses")
          .insert({ company_id: profile.company_id, ...fields })
          .select("id")
          .single();
        if (insErr || !created) throw new Error(insErr?.message ?? "Couldn't save the course.");
        id = created.id;
      }

      const rows = draft.questions.filter(isFilledIn).map((q) => {
        const options = q.options.map((o) => o.trim()).filter(Boolean);
        // validate() has already proved the chosen option is one of these.
        const correct = q.options[q.correct_index ?? 0].trim();
        return {
          course_id: id,
          question_text: q.question_text.trim(),
          options,
          correct_answer: correct,
        };
      });
      if (rows.length) {
        const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
        if (qErr) throw new Error(qErr.message);
      }

      onSaved(editing ? `Saved ${fields.title}.` : `Created ${fields.title}.`);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't save the course. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-small text-ink-muted">Loading the course…</p>;
  }

  const filledQuestions = draft.questions.filter(isFilledIn).length;
  const contentLabel =
    draft.content_type === "text"
      ? "Content"
      : draft.content_type === "video"
        ? "Video link"
        : "PDF link";

  return (
    <>
      {/* One primary button per screen, so the only Save is the one at the end. */}
      <h1 className="mb-8 text-heading-1 font-expanded text-ink">
        {editing ? "Edit course" : "Create course"}
      </h1>

      {editing && Boolean(assignmentCount) && (
        <p className="mb-6 rounded-md border border-steel bg-surface px-4 py-3 text-small text-ink-muted">
          {completedCount
            ? `Changes apply to future attempts. Completed training stays complete — ${completedCount} ${completedCount === 1 ? "person has" : "people have"} already passed this course.`
            : "Changes apply to future attempts. Completed training stays complete."}
        </p>
      )}

      <form onSubmit={save} className="space-y-8">
        <section className="space-y-4 rounded-md border border-steel bg-surface p-4 md:p-6">
          <h2 className="text-heading-3 text-ink">Course details</h2>

          <div className="space-y-2">
            <Label htmlFor="course-title">Title</Label>
            <Input
              id="course-title"
              ref={titleRef}
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              aria-invalid={Boolean(problems.title)}
              aria-describedby={problems.title ? "course-title-problem" : undefined}
            />
            {problems.title && (
              <p id="course-title-problem" role="alert" className="text-small text-oxide">
                {problems.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-description">Description</Label>
            <Textarea
              id="course-description"
              rows={3}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
            <p className="text-small text-ink-muted">
              A line or two on what the course covers. Employees see it before they start.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-category">Category</Label>
            <Input
              id="course-category"
              value={draft.category}
              onChange={(e) => patch({ category: e.target.value })}
            />
            <p className="text-small text-ink-muted">
              Optional. Groups courses in the list, for example Safety or Compliance.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 block text-small font-medium text-ink">Content type</legend>
            <RadioGroup
              className="flex flex-wrap gap-6"
              value={draft.content_type}
              onValueChange={(value) => patch({ content_type: value as ContentType })}
            >
              {CONTENT_TYPES.map((t) => (
                <div key={t.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`content-type-radio-${t.value}`} value={t.value} />
                  <Label htmlFor={`content-type-radio-${t.value}`} className="font-normal">
                    {t.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="course-content">{contentLabel}</Label>
            {draft.content_type === "text" ? (
              <Textarea
                id="course-content"
                rows={6}
                value={draft.content}
                onChange={(e) => patch({ content: e.target.value })}
              />
            ) : (
              <Input
                id="course-content"
                type="url"
                placeholder="https://…"
                value={draft.content}
                onChange={(e) => patch({ content: e.target.value })}
              />
            )}
            <p className="text-small text-ink-muted">
              {draft.content_type === "text"
                ? "What the employee reads before the quiz."
                : "Paste a link, for example https://example.com/fire-safety."}
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-md border border-steel bg-surface p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-heading-3 text-ink">Quiz questions</h2>
              <p className="mt-1 text-small text-ink-muted">
                Employees pass at {PASS_MARK}%.
                {filledQuestions === 0 &&
                  " A course with no questions can't be completed — there is nothing to pass."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patch({ questions: [...draft.questions, emptyQuestion()] })}
            >
              <Plus aria-hidden />
              Add question
            </Button>
          </div>

          <ol className="space-y-4">
            {draft.questions.map((q, index) => (
              <li key={q.key} className="rounded-md border border-steel p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  {/* One label, not a heading plus a label both saying "Question". */}
                  <Label htmlFor={`${q.key}-text`}>Question {index + 1}</Label>
                  {draft.questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() =>
                        patch({ questions: draft.questions.filter((x) => x.key !== q.key) })
                      }
                    >
                      <Trash2 aria-hidden />
                      Remove
                    </Button>
                  )}
                </div>

                <Input
                  id={`${q.key}-text`}
                  value={q.question_text}
                  onChange={(e) => patchQuestion(q.key, { question_text: e.target.value })}
                />

                <fieldset className="mt-4 space-y-2">
                  <legend className="mb-2 block text-small font-medium text-ink">
                    Options — choose the correct answer
                  </legend>
                  <RadioGroup
                    className="gap-3"
                    value={q.correct_index === null ? "" : String(q.correct_index)}
                    onValueChange={(value) =>
                      patchQuestion(q.key, { correct_index: Number(value) })
                    }
                  >
                    {q.options.map((option, oi) => (
                      <div key={oi} className="flex items-center gap-3">
                        <RadioGroupItem
                          value={String(oi)}
                          aria-label={`Question ${index + 1}, option ${oi + 1} is the correct answer`}
                        />
                        <Input
                          aria-label={`Question ${index + 1}, option ${oi + 1}`}
                          placeholder={`Option ${oi + 1}`}
                          value={option}
                          onChange={(e) =>
                            patchQuestion(q.key, {
                              options: q.options.map((o, j) => (j === oi ? e.target.value : o)),
                            })
                          }
                        />
                      </div>
                    ))}
                  </RadioGroup>
                  {problems.questions[q.key] && (
                    <p role="alert" className="text-small text-oxide">
                      {problems.questions[q.key]}
                    </p>
                  )}
                </fieldset>
              </li>
            ))}
          </ol>

          {/*
           * The same action again at the foot of the list. With four questions
           * on screen the button at the top of the section has scrolled away,
           * and the place you want the next question is here.
           */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patch({ questions: [...draft.questions, emptyQuestion()] })}
          >
            <Plus aria-hidden />
            Add question
          </Button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-sm border border-oxide/40 bg-oxide/10 px-3 py-2 text-small text-oxide"
          >
            {error}
          </div>
        )}

        {/*
         * The actions stay on screen rather than sitting at the bottom of a
         * form that is several screens tall. Sticky inside the content column,
         * so it stops at the sidebar on a desktop instead of spanning the
         * window, and opaque so the form scrolls underneath it rather than
         * showing through. Still one primary button.
         */}
        <div className="sticky bottom-0 -mx-4 border-t border-steel bg-ground px-4 py-4 md:mx-0 md:px-0">
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save course"}
            </Button>
            <Button type="button" variant="outline" onClick={leave}>
              Cancel
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? "This course will stay as it was. Nothing you have typed here is saved yet."
                : "This course has not been created yet. Nothing you have typed here is saved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
