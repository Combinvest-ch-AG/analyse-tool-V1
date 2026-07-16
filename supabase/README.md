# Supabase setup

1. Open the Supabase project and select **SQL Editor → New query**.
2. Paste the complete contents of `schema.sql`.
3. Run the query once. The script is designed to be safely rerunnable for the initial setup.
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
