-- Replace the SECURITY DEFINER view approach with column-level privileges.
-- 1) Drop the view (it ran with owner privileges, flagged by the security linter).
DROP VIEW IF EXISTS public.quiz_questions_public;

-- 2) Remove broad row SELECT from client roles, then re-grant SELECT on all
--    columns EXCEPT correct_answer. Employees keep reading questions through the
--    existing RLS policy, but the answer column is no longer readable by them.
REVOKE SELECT ON public.quiz_questions FROM authenticated;
REVOKE SELECT ON public.quiz_questions FROM anon;
GRANT SELECT (id, course_id, question_text, options, created_at) ON public.quiz_questions TO authenticated;

-- 3) Admin management (INSERT/UPDATE/DELETE) is unaffected: those privileges
--    remain and server-side grading uses the service role, which bypasses RLS
--    and is unaffected by these revokes.