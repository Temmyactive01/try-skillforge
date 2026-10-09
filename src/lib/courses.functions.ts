import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GetCourseForEditSchema = z.object({
  course_id: z.string().uuid(),
});

/**
 * A course and its quiz, with the correct answers, so an admin can edit it.
 *
 * `quiz_questions.correct_answer` is revoked from `authenticated` at the column
 * level, because the browser must never be able to read the answer sheet. That
 * makes it unreadable for the admin who wrote it too, so this is the one path
 * that returns it — read with the service role, after two checks that mirror
 * the quiz grader's:
 *
 *   1. the caller is an admin, and
 *   2. the course comes back from an RLS-scoped read as the caller, which is
 *      true only for courses in the caller's own company.
 *
 * Check 2 is what keeps this from becoming a cross-company answer leak: the
 * admin client is only ever pointed at a course id the caller has already
 * proved they can see. Read-only — saving goes through ordinary RLS writes.
 */
export const getCourseForEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => GetCourseForEditSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile, error: pErr } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile || profile.role !== "admin") {
      throw new Response("Forbidden", { status: 403 });
    }

    // RLS-scoped: another company's course simply isn't there.
    const { data: course, error: cErr } = await context.supabase
      .from("courses")
      .select("id, title, description, content_type, content_url, category")
      .eq("id", data.course_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!course) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, question_text, options, correct_answer")
      .eq("course_id", course.id)
      .order("created_at", { ascending: true });
    if (qErr) throw new Error(qErr.message);

    return {
      course,
      questions: (questions ?? []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? (q.options as unknown[]).map(String) : [],
        correct_answer: q.correct_answer,
      })),
    };
  });
