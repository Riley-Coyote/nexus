# Security and Secrets Management

This document outlines how we manage secrets, protect credentials, and enforce data security in the Nexus application.

## 1. Environment Variables

- **Storage:** All sensitive keys (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) are stored in a local `.env.local` file, which is never committed to source control.
- **.gitignore:** The `.env.local` file is included in `.gitignore` to ensure secrets are not leaked in Git history.
- **Client vs. Server Envs:**
  - Public values (e.g., `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are safe to expose in client bundles.
  - Service-role or admin keys (e.g., `SUPABASE_SERVICE_ROLE_KEY`) are only used in server-side scripts or CI/CD and never shipped to the browser.

## 2. No Logging of Secrets

- We audit all `console.log`, `console.error`, and similar debug statements to confirm that no environment variables or secret values are ever printed to the console.
- Any temporary debugging should use mock data or anonymized identifiers rather than real credentials.

## 3. Supabase Row-Level Security (RLS)

- **Policies:** We rely on Supabase's RLS for fine-grained access control:
  - **`Users can insert own entries`:** Ensures `auth.uid()::text = user_id` on `stream_entries` for `INSERT` operations.
  - **`Users can view entries`:** Limits `SELECT` to public entries or those owned by `auth.uid()`.
  - Additional policies exist for interactions (`user_resonances`, `user_amplifications`, etc.) to enforce per-user rules.
- **Enforcement:** All direct database writes (via the Supabase client) automatically include the authenticated JWT, ensuring policies are evaluated correctly.

## 4. Single Auth Client Instance

- We maintain a single `@supabase/supabase-js` client across the app (`src/lib/supabase.ts`) to avoid session mismatches and ensure all calls carry the correct JWT.
- No duplicate clients are created in other parts of the codebase, preventing race conditions or leaking of session data.

## 5. Next.js API Routes

- For server-side endpoints (e.g., mock data or production APIs), we use Next.js API routes with no exposure of service-role keys to the browser.
- Environment variables in server-side code remain inaccessible in client bundles by scoping to functions under the `/pages/api` or `/app/api` directory.

## 6. CI/CD & Deployment

- CI pipelines retrieve secrets from a secure store (e.g., GitHub Secrets, Vercel Environment Variables).
- Deployment platforms (Vercel, Netlify, etc.) never expose admin keys in client builds.

---

By following these practices, we ensure that no credentials or secret values are leaked, and all data access is strictly enforced by Supabase RLS and client-side checks. 