
-- 1) Quiz correct answers: revoke column read from authenticated/anon
REVOKE SELECT ON public.quiz_questions FROM authenticated;
REVOKE SELECT ON public.quiz_questions FROM anon;
GRANT SELECT (id, course_id, question_text, options, created_at) ON public.quiz_questions TO authenticated;
-- admin writes happen via authenticated role; grant write back
GRANT INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;

-- 2) Profile self-update: prevent role/company/id escalation
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- 3) Switch exposed helper functions from SECURITY DEFINER to SECURITY INVOKER.
-- They only read the caller's own profile row, which the caller can already
-- read via the "view profiles in company" SELECT policy.
ALTER FUNCTION public.is_admin(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_user_role(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_user_company_id(uuid) SECURITY INVOKER;
