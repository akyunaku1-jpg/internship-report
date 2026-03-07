-- PROFILES
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee', 'manager')),
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  department TEXT,
  position TEXT,
  employee_id TEXT UNIQUE,
  birth_date DATE,
  blood_type TEXT,
  marital_status TEXT,
  religion TEXT,
  join_date DATE DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMERGENCY CONTACTS
CREATE TABLE public.emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EDUCATION
CREATE TABLE public.education (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  degree TEXT NOT NULL,
  major TEXT NOT NULL,
  institution TEXT NOT NULL,
  gpa TEXT,
  start_year INTEGER,
  end_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAMILY
CREATE TABLE public.family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  family_type TEXT NOT NULL,
  person_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ONBOARDING TASKS
CREATE TABLE public.onboarding_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info','warning','success','error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS
CREATE TABLE public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- INTERNSHIP REPORTS
CREATE TABLE public.internship_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_ref TEXT,
  full_name TEXT,
  intern_id TEXT,
  department TEXT,
  division TEXT,
  supervisor_name TEXT,
  report_date DATE NOT NULL,
  task_title TEXT NOT NULL,
  work_status TEXT NOT NULL DEFAULT 'Pending' CHECK (work_status IN ('Completed', 'In Progress', 'Pending', 'Revision')),
  task_description TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  duration TEXT,
  additional_notes TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, client_ref)
);

-- AUTO CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'New User'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by all authenticated" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Own emergency contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own education" ON public.education FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own family" ON public.family_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own onboarding" ON public.onboarding_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own internship reports" ON public.internship_reports FOR ALL USING (auth.uid() = user_id);
