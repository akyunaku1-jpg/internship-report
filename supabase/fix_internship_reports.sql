-- Run this in Supabase SQL Editor if you see:
-- "Could not find the table 'public.internship_reports' in the schema cache"

CREATE TABLE IF NOT EXISTS public.internship_reports (
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS internship_reports_user_id_client_ref_unique
  ON public.internship_reports(user_id, client_ref);

ALTER TABLE public.internship_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'internship_reports'
      AND policyname = 'Own internship reports'
  ) THEN
    CREATE POLICY "Own internship reports"
      ON public.internship_reports
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Force PostgREST/Supabase API to reload schema cache.
NOTIFY pgrst, 'reload schema';
