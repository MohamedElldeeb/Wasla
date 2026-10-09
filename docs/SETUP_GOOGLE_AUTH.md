# Google sign-in and pilot auth settings (Supabase dashboard)

The app already has the "كمّل بحساب جوجل" button and the `/auth/callback` route. Two things must be switched on in the Supabase dashboard (they are project settings, not code):

## 1. Google provider
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → type *Web application*.
2. **Authorized redirect URI**: `https://szuarlmqbtlfbfylqobe.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Sign In / Providers → **Google** → enable, paste the Client ID and Client Secret.
4. Supabase → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (dev) → production domain later
   - Redirect URLs: `http://localhost:3000/**`

## 2. Pilot: no email confirmation
Authentication → Sign In / Providers → Email → turn **Confirm email** OFF. Signup then returns a session immediately and the app sends the user to onboarding. Re-enable before launch (see `PRELAUNCH_CHECKLIST.md`).

Notes: Google users get a profile row automatically (trigger on `auth.users`); the 50 free credits are granted when they create their organization in onboarding, exactly like email signups.
