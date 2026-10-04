-- Employees could mark their own assignment "complete" (or any other status) directly,
-- and insert their own quiz results with any score. Only the server-side quiz grader,
-- which uses the service role, may now record results and set "complete".
-- Employees may still move their own assignment from "not_started" to "in_progress".

CREATE OR REPLACE FUNCTION private.restrict_assignment_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Only signed-in users are restricted here. The service role (the quiz grader, scripts)
  -- and direct database connections are trusted.
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RETURN NEW;
  END IF;

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

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'not_started' AND NEW.status = 'in_progress') THEN
    RAISE EXCEPTION 'Employees can only start an assignment; passing the quiz completes it';
  END IF;

  RETURN NEW;
END;
$$;

-- Quiz results are written only by the grader (service role, which bypasses RLS).
DROP POLICY IF EXISTS "user insert own quiz results" ON public.quiz_results;
