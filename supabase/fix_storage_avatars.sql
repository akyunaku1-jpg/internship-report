-- Fix avatar upload issue for existing Supabase projects.
-- Run this in Supabase SQL Editor once.

-- 1) Ensure avatars bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Allow authenticated users to upload/read/update/delete their own avatar objects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Avatar objects are publicly readable'
  ) THEN
    CREATE POLICY "Avatar objects are publicly readable"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own avatar object'
  ) THEN
    CREATE POLICY "Users can upload own avatar object"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = owner::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own avatar object'
  ) THEN
    CREATE POLICY "Users can update own avatar object"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = owner::text)
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = owner::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own avatar object'
  ) THEN
    CREATE POLICY "Users can delete own avatar object"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = owner::text);
  END IF;
END $$;
