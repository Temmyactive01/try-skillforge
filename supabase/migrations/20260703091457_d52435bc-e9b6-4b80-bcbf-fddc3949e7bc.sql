
-- Fix 1: Hide correct_answer from client SELECTs (column-level privilege).
-- Server code uses supabaseAdmin (service_role) to read correct answers.
REVOKE SELECT (correct_answer) ON public.quiz_questions FROM authenticated;
REVOKE SELECT (correct_answer) ON public.quiz_questions FROM anon;

-- Fix 2: Prevent non-admin users from modifying protected columns on assignments.
DROP POLICY IF EXISTS "user update own assignment" ON public.assignments;
CREATE POLICY "user update own assignment"
  ON public.assignments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION private.restrict_assignment_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Admins in the same company may update freely (enforced by admin RLS policy).
  IF private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only status may be updated on your own assignments';
  END IF;

  IF NEW.status NOT IN ('not_started','in_progress','complete') THEN
    RAISE EXCEPTION 'Invalid assignment status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_assignment_user_update ON public.assignments;
CREATE TRIGGER restrict_assignment_user_update
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION private.restrict_assignment_user_update();
