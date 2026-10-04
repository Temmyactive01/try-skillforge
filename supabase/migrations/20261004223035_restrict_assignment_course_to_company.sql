-- An admin could create an assignment for their own employee that pointed at another
-- company's course (the policy only checked the employee). Submitting that quiz made the
-- server-side grader return the other company's questions and correct answers.
-- New and changed assignments must now also use a course from the admin's own company.
DROP POLICY IF EXISTS "admin manage assignments" ON public.assignments;
CREATE POLICY "admin manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (
    private.is_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.company_id = private.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    private.is_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.company_id = private.get_user_company_id(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.company_id = private.get_user_company_id(auth.uid())
    )
  );
