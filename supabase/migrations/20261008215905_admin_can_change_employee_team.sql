-- Two things at once, because both are about who may change what on a profile.
--
-- 1. Admins need to move an employee between teams from the Employees page.
--    Until now the only UPDATE policy on profiles was "update own profile", so
--    an admin could not change anyone else's row at all.
--
-- 2. A security fix. "update own profile" pins role and company_id and nothing
--    else, so any signed-in user could rewrite their own profiles.email and
--    move themselves into any team — including another company's, because the
--    foreign key on team_id only proves the team exists. Both are closed.
--
-- This adds the narrowest policy that allows it, and a trigger that holds it to
-- exactly one column. The policy alone is not enough: a FOR UPDATE policy
-- cannot compare NEW against OLD, so without the trigger an admin could also
-- rewrite a colleague's name, promote them to admin, or move them to another
-- company. The same split (policy for "who", trigger for "which columns") is
-- already used for assignments in private.restrict_assignment_user_update.

-- Who: an admin, acting on a profile inside their own company. The WITH CHECK
-- repeats the company test so a row can never be moved out of the company.
DROP POLICY IF EXISTS "admin update profiles in company" ON public.profiles;
CREATE POLICY "admin update profiles in company" ON public.profiles
  FOR UPDATE TO authenticated
  USING (company_id = private.get_user_company_id(auth.uid()) AND private.is_admin(auth.uid()))
  WITH CHECK (company_id = private.get_user_company_id(auth.uid()) AND private.is_admin(auth.uid()));

-- Which columns: team_id, and nothing else.
CREATE OR REPLACE FUNCTION private.restrict_admin_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Only signed-in users are restricted here. The service role (signup, the
  -- employee invite, scripts) and direct database connections stay trusted.
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- A team must belong to the same company as the employee, whoever is moving
  -- them. The foreign key only proves the team exists, so without this an
  -- employee could be filed under another company's team.
  IF NEW.team_id IS DISTINCT FROM OLD.team_id
     AND NEW.team_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.teams t
       WHERE t.id = NEW.team_id AND t.company_id = NEW.company_id
     ) THEN
    RAISE EXCEPTION 'A team must belong to the same company as the employee';
  END IF;

  -- Updating your own row. The "update own profile" policy already pins role
  -- and company_id, but it pins nothing else, so until now any signed-in user
  -- could rewrite their own profiles.email — the address their admin sees in
  -- the Employees list — and move themselves into any team, including another
  -- company's. Both are closed here, as an allow-list for the same reason as
  -- below: name is the one thing about yourself you may change.
  IF NEW.id = auth.uid() THEN
    IF (to_jsonb(NEW) - 'name') IS DISTINCT FROM (to_jsonb(OLD) - 'name') THEN
      RAISE EXCEPTION 'You can only change your own name';
    END IF;
    RETURN NEW;
  END IF;

  -- Everything below is an admin editing someone else's profile. team_id is the
  -- single column they may touch.
  --
  -- Stated as an allow-list rather than a list of forbidden columns: compare
  -- the whole row with team_id removed from both sides. A column added to
  -- profiles in future is then protected the day it is added, instead of
  -- waiting for someone to remember to extend this trigger.
  IF (to_jsonb(NEW) - 'team_id') IS DISTINCT FROM (to_jsonb(OLD) - 'team_id') THEN
    RAISE EXCEPTION 'Admins may only change an employee''s team';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_admin_profile_update ON public.profiles;
CREATE TRIGGER restrict_admin_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.restrict_admin_profile_update();
