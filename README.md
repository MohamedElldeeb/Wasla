# Wasla (وصلة)

Arabic-first, horizontal B2B lead generation and outreach SaaS for Egypt/MENA. A user describes what they sell; Wasla finds matching businesses (Google Maps first), scores them with signals, writes a personal Egyptian-Arabic message for each, and the user reviews and sends it from their own WhatsApp (human in the loop, never automated).

- Product spec: [`specs.md`](specs.md) · Rules for contributors and agents: [`CLAUDE.md`](CLAUDE.md) · UX: [`USER_FLOW_UIUX.md`](USER_FLOW_UIUX.md)
- Phase reports: [`docs/`](docs) · Pre-launch checklist: [`docs/PRELAUNCH_CHECKLIST.md`](docs/PRELAUNCH_CHECKLIST.md)

## Stack
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui on Vercel · Supabase (Postgres, RLS, Auth, Realtime) · self-hosted n8n for orchestration · Apify for data · OpenRouter for LLM.

## Local development
```bash
npm ci
cp .env.example .env.local        # fill in the values (never commit .env.local)
npm run dev                       # http://localhost:3000
npm run lint && npx tsc --noEmit && npm test
npm run n8n:build && npm run n8n:deploy   # generate and push workflows to n8n
```
Schema changes are versioned files in `supabase/migrations/` (apply to a dev project/branch, never straight to production). RLS and business-rule tests: `supabase/tests/`.

## Secrets
Nothing secret is committed. `.env.local`, n8n credential ids and test state are git-ignored.
