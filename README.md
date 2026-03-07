# HR System

Full-stack HR management application built with React (Vite), Node.js + Express, and Supabase.

## Prerequisites

1. Install Node.js 18 or newer.
2. Check installed version:

```bash
node -v
```

## Setup

1. Create a new project in [Supabase](https://supabase.com).
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Create Storage buckets:
   - `avatars`
   - `documents`
4. Enable Email/Password authentication in Supabase Auth settings.
5. Copy `.env.example` to `.env` in:
   - `client`
   - `server`
6. Fill required keys:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS` (comma-separated emails that should be treated as administrators, example: `admin@company.com`)
7. Install dependencies:

```bash
npm run install:all
```

8. Start both backend and frontend:

```bash
npm run dev
```

9. Browser opens automatically at [http://localhost:5173](http://localhost:5173).

## Admin vs User accounts

- Accounts in `ADMIN_EMAILS` are automatically assigned `role = admin` on login/register.
- All other accounts use `role = employee`.
- Admin-only access is enforced for employee management routes and pages.
- To promote an existing user manually, run `supabase/set_admin_role.sql` in Supabase SQL Editor (replace `<ADMIN_EMAIL>` first).

## Fallback for dependency conflicts

If `npm install` fails, run:

```bash
npm install --legacy-peer-deps --prefix client
npm install --legacy-peer-deps --prefix server
```

## Ports

- Frontend: `5173`
- Backend: `3001`
