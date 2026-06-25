
-- Revert previous INVOKER change (recursion risk on RLS) and move helpers to a private schema
-- so they are NOT exposed via the public PostgREST API, while RLS policies keep working.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_user_role(_user_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin') $$;

CREATE OR REPLACE FUNCTION private.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT company_id FROM public.profiles WHERE id = _user_id $$;

-- Grant execute to authenticated so RLS policies can call these
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_company_id(uuid) TO authenticated, service_role;

-- Rewrite RLS policies to use the private.* helpers
-- profiles
DROP POLICY IF EXISTS "view profiles in company" ON public.profiles;
CREATE POLICY "view profiles in company" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = private.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "admin insert profiles in company" ON public.profiles;
CREATE POLICY "admin insert profiles in company" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = private.get_user_company_id(auth.uid()) AND private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin delete profiles in company" ON public.profiles;
CREATE POLICY "admin delete profiles in company" ON public.profiles
  FOR DELETE TO authenticated
  USING (company_id = private.get_user_company_id(auth.uid()) AND private.is_admin(auth.uid()));

-- quiz_questions
DROP POLICY IF EXISTS "view quiz questions in company" ON public.quiz_questions;
CREATE POLICY "view quiz questions in company" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = quiz_questions.course_id
      AND c.company_id = private.get_user_company_id(auth.uid())
  ));

DROP POLICY IF EXISTS "admin manage quiz questions" ON public.quiz_questions;
CREATE POLICY "admin manage quiz questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quiz_questions.course_id
        AND c.company_id = private.get_user_company_id(auth.uid())
    ) AND private.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quiz_questions.course_id
        AND c.company_id = private.get_user_company_id(auth.uid())
    ) AND private.is_admin(auth.uid())
  );

-- Discover and rewrite any other policy referencing public.is_admin / get_user_company_id / get_user_role
DO $$
DECLARE
  r record;
  new_using text;
  new_check text;
  cmd text;
  roles_clause text;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, p.polname,
           p.polcmd, p.polroles,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual, p.polrelid) ~ 'public\.(is_admin|get_user_role|get_user_company_id)|(^|[^.\w])(is_admin|get_user_role|get_user_company_id)\s*\('
        OR pg_get_expr(p.polwithcheck, p.polrelid) ~ 'public\.(is_admin|get_user_role|get_user_company_id)|(^|[^.\w])(is_admin|get_user_role|get_user_company_id)\s*\('
      )
  LOOP
    new_using := regexp_replace(COALESCE(r.using_expr,''), '(public\.)?(is_admin|get_user_role|get_user_company_id)\(', 'private.\2(', 'g');
    new_check := regexp_replace(COALESCE(r.check_expr,''), '(public\.)?(is_admin|get_user_role|get_user_company_id)\(', 'private.\2(', 'g');

    cmd := CASE r.polcmd
             WHEN 'r' THEN 'SELECT'
             WHEN 'a' THEN 'INSERT'
             WHEN 'w' THEN 'UPDATE'
             WHEN 'd' THEN 'DELETE'
             WHEN '*' THEN 'ALL'
           END;

    EXECUTE format('DROP POLICY %I ON %I.%I', r.polname, r.schema_name, r.table_name);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR %s TO authenticated %s %s',
      r.polname, r.schema_name, r.table_name, cmd,
      CASE WHEN new_using <> '' THEN 'USING (' || new_using || ')' ELSE '' END,
      CASE WHEN new_check <> '' THEN 'WITH CHECK (' || new_check || ')' ELSE '' END
    );
  END LOOP;
END $$;

-- Now drop public.* versions
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_user_company_id(uuid);
