-- Remove all direct SELECT access to the quiz_questions table from clients.
REVOKE SELECT ON public.quiz_questions FROM authenticated;
REVOKE SELECT ON public.quiz_questions FROM anon;

-- Safe, answer-free view for client reads, scoped to the caller's company.
CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = false) AS
SELECT q.id,
       q.course_id,
       q.question_text,
       q.options,
       q.created_at
FROM public.quiz_questions q
JOIN public.courses c ON c.id = q.course_id
WHERE c.company_id = private.get_user_company_id(auth.uid());

REVOKE ALL ON public.quiz_questions_public FROM PUBLIC;
GRANT SELECT ON public.quiz_questions_public TO authenticated;