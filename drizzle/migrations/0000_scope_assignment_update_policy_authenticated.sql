DROP POLICY IF EXISTS "user update own assignment" ON public.assignments;

CREATE POLICY "user update own assignment"
ON public.assignments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());