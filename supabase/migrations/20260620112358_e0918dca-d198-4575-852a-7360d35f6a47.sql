
-- Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'employee');
CREATE TYPE public.assignment_status AS ENUM ('not_started', 'in_progress', 'complete');

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Profiles (linked to auth.users) - replaces "users" table; password is managed by auth
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS on profiles)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.profiles WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.user_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin') $$;

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT,
  content_url TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  status public.assignment_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Quiz results
CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- companies: users can read their own company; admins can update
CREATE POLICY "view own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));
CREATE POLICY "admin update own company" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id(auth.uid()) AND public.is_admin(auth.uid()));

-- profiles: users see profiles in their company; users update own profile; admins manage profiles in their company
CREATE POLICY "view profiles in company" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "admin insert profiles in company" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.is_admin(auth.uid()));
CREATE POLICY "admin delete profiles in company" ON public.profiles FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_admin(auth.uid()));

-- teams: company-scoped read; admin write
CREATE POLICY "view teams in company" ON public.teams FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "admin manage teams" ON public.teams FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.is_admin(auth.uid()));

-- courses: company-scoped read; admin write
CREATE POLICY "view courses in company" ON public.courses FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "admin manage courses" ON public.courses FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.is_admin(auth.uid()));

-- quiz_questions: scoped via course's company
CREATE POLICY "view quiz questions in company" ON public.quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "admin manage quiz questions" ON public.quiz_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.company_id = public.get_user_company_id(auth.uid())) AND public.is_admin(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.company_id = public.get_user_company_id(auth.uid())) AND public.is_admin(auth.uid()));

-- assignments: users see their own; admins see all in company
CREATE POLICY "view own assignments" ON public.assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR (public.is_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.company_id = public.get_user_company_id(auth.uid()))));
CREATE POLICY "user update own assignment" ON public.assignments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "admin manage assignments" ON public.assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.company_id = public.get_user_company_id(auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.company_id = public.get_user_company_id(auth.uid())));

-- quiz_results: scoped through assignment
CREATE POLICY "view own quiz results" ON public.quiz_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND (
    a.user_id = auth.uid()
    OR (public.is_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.user_id AND p.company_id = public.get_user_company_id(auth.uid())))
  )));
CREATE POLICY "user insert own quiz results" ON public.quiz_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND a.user_id = auth.uid()));

-- Auto-create profile on signup using user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'company_id' THEN
    INSERT INTO public.profiles (id, company_id, name, email, role)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'company_id')::uuid,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'employee')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
