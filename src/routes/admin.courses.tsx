import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { AdminShell } from "@/components/AdminShell";
import { AssignCourseModal } from "@/components/AssignCourseModal";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({ meta: [{ title: "Courses — SkillForge" }] }),
  component: AdminCoursesPage,
});

type ContentType = "text" | "video" | "pdf";

type CourseRow = {
  id: string;
  title: string;
  category: string | null;
  assignment_count: number;
};

type QuestionDraft = {
  question_text: string;
  options: string[]; // length 4
  correct_index: number; // 0..3
};

function emptyQuestion(): QuestionDraft {
  return { question_text: "", options: ["", "", "", ""], correct_index: 0 };
}

function AdminCoursesPage() {
  const { checking } = useRequireRole("admin");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, category, assignments(count)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setCourses(
        data.map((c: any) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          assignment_count: c.assignments?.[0]?.count ?? 0,
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!checking) refresh();
  }, [checking]);

  if (checking) return null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Courses</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              + Create Course
            </button>
          )}
        </div>

        {showForm && (
          <CreateCourseForm
            onCancel={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              refresh();
            }}
          />
        )}

        <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Assignments</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-slate-500">
                    No courses yet.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.id} className="border-t border-slate-200">
                    <td className="px-4 py-2 text-slate-900">{c.title}</td>
                    <td className="px-4 py-2 text-slate-700">{c.category ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-700">{c.assignment_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function CreateCourseForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(i: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated.");
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!profile) throw new Error("Profile not found.");

      const { data: course, error: cErr } = await supabase
        .from("courses")
        .insert({
          company_id: profile.company_id,
          title: title.trim(),
          description: description.trim() || null,
          content_type: contentType,
          content_url: content.trim() || null,
          category: category.trim() || null,
        })
        .select("id")
        .single();
      if (cErr || !course) throw new Error(cErr?.message ?? "Failed to create course.");

      const validQs = questions.filter(
        (q) => q.question_text.trim() && q.options.some((o) => o.trim()),
      );
      if (validQs.length > 0) {
        const rows = validQs.map((q) => {
          const cleanOpts = q.options.map((o) => o.trim()).filter(Boolean);
          const correctIdx = Math.min(q.correct_index, cleanOpts.length - 1);
          return {
            course_id: course.id,
            question_text: q.question_text.trim(),
            options: cleanOpts,
            correct_answer: cleanOpts[correctIdx] ?? "",
          };
        });
        const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
        if (qErr) throw new Error(qErr.message);
      }
      onCreated();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelCls = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-5 rounded-md border border-slate-200 bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-slate-900">New Course</h2>

      <div>
        <label className={labelCls}>Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Content Type</label>
        <div className="flex gap-4 text-sm text-slate-700">
          {(["text", "video", "pdf"] as ContentType[]).map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input
                type="radio"
                name="content_type"
                value={t}
                checked={contentType === t}
                onChange={() => setContentType(t)}
              />
              {t === "text" ? "Text" : t === "video" ? "Video link" : "PDF"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>
          {contentType === "text" ? "Content" : contentType === "video" ? "Video URL" : "PDF URL"}
        </label>
        {contentType === "text" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className={inputCls}
          />
        ) : (
          <input
            type="url"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        )}
      </div>

      <div>
        <label className={labelCls}>Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Quiz Questions</h3>
          <button
            type="button"
            onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            + Add question
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-md border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Question {qi + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((qs) => qs.filter((_, idx) => idx !== qi))
                    }
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                placeholder="Question text"
                value={q.question_text}
                onChange={(e) => updateQuestion(qi, { question_text: e.target.value })}
                className={`${inputCls} mb-3`}
              />
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.correct_index === oi}
                      onChange={() => updateQuestion(qi, { correct_index: oi })}
                      title="Mark as correct answer"
                    />
                    <input
                      placeholder={`Option ${oi + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      className={inputCls}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Select the radio next to the correct answer.
              </p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save course"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
