# Supabase setup

Run these SQL files **in order** in the Supabase **SQL Editor → New query** of the
new Zurich database. Each file is idempotent and safe to rerun.

1. `schema.sql` — tables, enums, RLS policies, `save_analysis_snapshot` RPC, and the
   Combinvest organization + advisor directory seed (33 advisors).
2. `002_dashboard_rpc.sql` — `create_customer_with_analysis` and
   `start_customer_analysis` RPCs used by the dashboard.
3. `003_indexes.sql` — additive performance optimization: covering indexes for the
   foreign keys PostgreSQL does not index automatically.

Then finish configuration:

4. In **Authentication → URL Configuration**, set the production Site URL and add local/preview redirect URLs.
5. Create advisor users through Supabase Auth or activate Google login. Existing `advisor_profiles` are linked automatically by matching the verified email address.

## Required frontend variables

These values may be exposed to the browser:

```text
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

If the frontend is migrated to Next.js, use:

```text
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The Supabase `service_role`/secret key must never be shipped to the browser. If later required for migrations, Catalyst webhooks or administrative imports, store it only in a protected Vercel server environment variable.

## Google login

Google OAuth is configured in the Supabase Dashboard, not hardcoded into this repository:

1. Create a Google OAuth **Web application**.
2. Add the production Vercel domain and local development origin.
3. Add the Supabase callback URL shown under the Google provider configuration.
4. Store the Client ID and Client Secret in Supabase Authentication → Providers → Google.
5. Add the application callback URL to the Supabase redirect allow list.

Do not paste the Google Client Secret into chat, Git, frontend JavaScript, or a `NEXT_PUBLIC_`/`VITE_` variable.

## Storage buckets to create later

- `customer-files` — private
- `generated-documents` — private
- `signatures` — private and highly restricted
- `legacy-imports` — private, management/service-role only

Storage RLS policies should be added when the upload/download implementation is built; the SQL schema intentionally does not create public buckets.
