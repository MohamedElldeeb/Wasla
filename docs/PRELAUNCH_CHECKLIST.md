# Pre-launch checklist

Items that are deliberately relaxed for the pilot and MUST be reverted or completed before real users sign up.

## Email and auth (blocked on a custom domain)
- [ ] **Buy a domain** for the product (and a separate sending domain or subdomain for outreach email, Phase 3).
- [ ] **Verify the domain in Resend** (SPF, DKIM, DMARC records) and keep `RESEND_API_KEY` (already stored in `.env.local`, unused for now).
- [ ] **Switch Supabase Auth SMTP to Resend**: Dashboard → Authentication → Emails → SMTP Settings (host `smtp.resend.com`, port 465, user `resend`, password = the Resend API key, sender on the verified domain). Until then the default Supabase sender is rate-limited and only suitable for tests.
- [ ] **Re-enable email confirmation** for email signups: Dashboard → Authentication → Sign In / Providers → Email → "Confirm email" ON. (Disabled for the pilot so signups work without email delivery.) Re-run the signup flow after switching.
- [ ] Enable **leaked password protection** (Authentication → Policies; flagged by the Supabase advisor).
- [ ] Update Auth **Site URL** and **Redirect URLs** to the production domain; remove `http://localhost:3000/**` from the allow-list.
- [ ] Google OAuth: move the Google Cloud OAuth consent screen to "In production" and add the production domain as an authorized origin.

## Environments
- [ ] Create a separate **production Supabase project** (the current `Wasla` project is DEV by decision); replay `supabase/migrations/` on it, set its keys in Vercel only.
- [ ] Create the Vercel project linked to this GitHub repo; set env vars from `.env.example`; set `NEXT_PUBLIC_APP_URL`.
- [ ] Point n8n workflows at the production Supabase project (credentials in n8n's store) and redeploy with `npm run n8n:deploy`.
- [ ] n8n: turn off saving of successful execution data / set pruning (executions contain lead data; Egypt PDPL).

## Product
- [ ] Fill the OPEN decisions: plan prices (EGP), final credit costs, Apollo key model, digits style, `WASLA_SALES_WHATSAPP`.
- [ ] Confirm the default OpenRouter model after a quality comparison on Egyptian Arabic.
- [ ] Rotate every key that was shared during development (Supabase service role, n8n API key, OpenRouter, Apify, Resend).
