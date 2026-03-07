-- Promote an existing user account to administrator role.
-- Replace <ADMIN_EMAIL> before running.

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('<ADMIN_EMAIL>')
  LIMIT 1
);
