import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitSchema = z.object({
  assignment_id: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => submitSchema.parse(data))
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

    let correct = 0;
    const review: {
      id: string;
      question_text: string;
      your_answer: string | null;
      correct_answer: string;
      is_correct: boolean;
    }[] = [];
    for (const q of questions) {
      const given = data.answers[q.id] ?? null;
      const isCorrect = given === q.correct_answer;
      if (isCorrect) correct++;
      review.push({
        id: q.id,
        question_text: q.question_text,
        your_answer: given,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
      });
    }
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 70;

    // Write result + update status using the user-scoped client so RLS applies
    const { error: rErr } = await context.supabase.from("quiz_results").insert({
      assignment_id: assignment.id,
      score,
      passed,
    });
    if (rErr) throw new Error(rErr.message);

    const { error: uErr } = await context.supabase
      .from("assignments")
      .update({ status: passed ? "complete" : "in_progress" })
      .eq("id", assignment.id);
    if (uErr) throw new Error(uErr.message);

    return { score, passed };
  });
