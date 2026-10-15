import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PASS_MARK } from "@/lib/scores";

const submitSchema = z.object({
  assignment_id: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => submitSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify the assignment belongs to the calling user (RLS-scoped read)
    const { data: assignment, error: aErr } = await context.supabase
      .from("assignments")
      .select("id, user_id, course_id, status")
      .eq("id", data.assignment_id)
      .maybeSingle();

    if (aErr) throw new Error(aErr.message);
    if (!assignment || assignment.user_id !== context.userId) {
      throw new Response("Forbidden", { status: 403 });
    }
    if (assignment.status === "cancelled") {
      throw new Response("This assignment was cancelled", { status: 400 });
    }

    // The course must be one the caller can see (their own company's), so the answers
    // read below with the admin client can never come from another company.
    const { data: course, error: cErr } = await context.supabase
      .from("courses")
      .select("id")
      .eq("id", assignment.course_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!course) throw new Response("Forbidden", { status: 403 });

    // Load correct answers using the admin client (bypasses column-level grants)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, question_text, correct_answer")
      .eq("course_id", assignment.course_id);

    if (qErr) throw new Error(qErr.message);
    if (!questions || questions.length === 0) {
      throw new Response("No quiz questions for this course", { status: 400 });
    }

    /*
     * Grade first, and build the review afterwards, so that whether the
     * answers may be revealed is settled before anything is written down to
     * send back. Building the full review and then stripping it would work
     * today and leak the day someone returns it one line earlier.
     */
    let correct = 0;
    for (const q of questions) {
      if ((data.answers[q.id] ?? null) === q.correct_answer) correct++;
    }
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= PASS_MARK;

    // Only this grader may record results and set "complete": the database refuses both
    // from employees, so write with the admin client now that ownership is verified above.
    const { error: rErr } = await supabaseAdmin.from("quiz_results").insert({
      assignment_id: assignment.id,
      score,
      passed,
    });
    if (rErr) throw new Error(rErr.message);

    // Once passed, an assignment stays complete: later attempts are practice only.
    const status = passed || assignment.status === "complete" ? "complete" : "in_progress";
    if (status !== assignment.status) {
      const { error: uErr } = await supabaseAdmin
        .from("assignments")
        .update({ status })
        .eq("id", assignment.id);
      if (uErr) throw new Error(uErr.message);
    }

    /*
     * The correct answers go back only to someone who has already earned
     * them: this attempt passed, or the assignment was already complete, in
     * which case they were shown the answers when they passed.
     *
     * A failed attempt still learns which questions it got wrong — that is
     * the half worth having — but not what the right answer was, so failing
     * on purpose is no longer a way to read the answer sheet. Hiding it in
     * the page would not have been enough: it would still have arrived in the
     * browser, where anyone can read it.
     *
     * `assignment.status` here is the status *before* this attempt, read from
     * the database at the top of this handler under the caller's own RLS. The
     * request body carries only an assignment id and the answers, so nothing
     * the browser sends can widen what comes back.
     */
    const reveal = passed || assignment.status === "complete";
    const review = questions.map((q) => {
      const given = data.answers[q.id] ?? null;
      return {
        id: q.id,
        question_text: q.question_text,
        your_answer: given,
        is_correct: given === q.correct_answer,
        ...(reveal ? { correct_answer: q.correct_answer } : {}),
      };
    });

    return { score, passed, review, status };
  });
