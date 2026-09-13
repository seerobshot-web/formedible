# Kingdom Query

A Typeform-like survey and personality-assessment tool built into the
`web` app, backed entirely by Supabase (Postgres + Auth + RLS). It ships as
part of this app's static export (`next.config.ts` sets `output: "export"`),
so it deploys onto plain shared hosting (e.g. Hostinger Business) with no
Node.js server required -- all data access happens client-side against
Supabase, gated by Row Level Security.

## Stack

- Next.js 15 (App Router, static export) + TypeScript + Tailwind
- Supabase (Postgres, Auth, RLS) -- the only backend
- `@dnd-kit/*` for the drag-to-reorder question builder
- `recharts` for results charts
- `qrcode` for the distribution QR code
- `framer-motion` for the slide transitions in the survey runner

## Setup

1. Create a Supabase project.
2. Run `apps/web/supabase/migrations/0001_kingdom_query.sql` in the Supabase
   SQL editor (or `supabase db push`). It creates the `kq_*` tables, RLS
   policies, and a response-cap trigger.
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, used by the seed script)
4. Sign up for a creator account at `/kingdom-query/login`.
5. (Optional) Seed the demo survey:
   ```
   KINGDOM_QUERY_SEED_OWNER_EMAIL=you@example.com npm run seed:kingdom-query
   ```
   This creates a "Spiritual Gifts Assessment" demo survey at `/s/spiritual-gifts-demo`.

## Where things live

```
apps/web/supabase/migrations/0001_kingdom_query.sql   Schema + RLS
apps/web/src/lib/kingdom-query/                       Types, Supabase client,
                                                        scoring/logic engines,
                                                        localStorage helpers
apps/web/src/components/kingdom-query/builder/        Question builder UI
apps/web/src/components/kingdom-query/runtime/        Survey-taking UI
apps/web/src/components/kingdom-query/results/        Results dashboard UI
apps/web/src/app/kingdom-query/                       Creator dashboard, editor, results
apps/web/src/app/s/                                    Public survey-taking page
apps/web/scripts/seed-kingdom-query.ts                 Demo data seeder
```

## Feature notes

**Builder** (`/kingdom-query/edit?id=<surveyId>`): question types (short/long
text, multiple choice, checkboxes, rating 1-5, NPS 0-10, email, yes/no),
drag-to-reorder (dnd-kit), required toggle, per-question description, logic
jump rules ("if answer is X, jump to question Y" or end the survey) with a
visual "→ Q3" indicator, theme color, intro/thank-you screen text, and a
"Preview" tab that runs the live survey inline plus flags validation issues
(missing titles, choice questions with <2 options, logic rules pointing at
deleted questions, duplicate scoring keys).

**Scoring** (`/kingdom-query/edit?id=<surveyId>`, "Scoring" tab): define
personality traits (a `key` + label). Each choice option can award
`trait:weight` scores (e.g. `leadership:3, teaching:1`). At submission time
raw trait sums are computed, then each trait's optional custom expression
(a safe, non-`eval` arithmetic evaluator supporting `+ - * / ^ ( )`,
`min/max/round/abs/floor/ceil`, and any trait key or `total` as a variable)
runs against those sums to produce the final score. See
`src/lib/kingdom-query/expression.ts` and `scoring.ts`.

**Answering experience** (`/s/<slug>`): one question per screen, big
typography, keyboard-first (letter keys A/B/C… pick multiple-choice/checkbox
options, number keys pick rating/NPS values, Enter advances, Shift+Enter adds
a newline in long text), slide transitions, a progress bar, and autosave of
partial progress to `localStorage` (resumable in the same browser). An
opt-in/opt-out checkbox is shown just before the thank-you screen when the
survey creator enables it.

**Distribution**: the public link is `/s/<slug>`, plus a generated QR code
and an `<iframe>` embed snippet. Creators can set a close date and a response
cap (enforced server-side by a Postgres trigger, not just the UI).

**Results** (`/kingdom-query/results?id=<surveyId>`): response count and
completion rate, per-question charts (bar charts for choice questions,
histograms for rating/NPS, word-frequency bars for free text), an average
trait-score chart, an individual response browser, and CSV export.

**Anti-abuse**: by default, one response per browser via a `respondent_token`
(UUID) stored in both `localStorage` and a cookie. "Strict" mode additionally
collects the respondent's email on an email-type question (no separate
verification email is sent in this MVP -- see Known limitations below).

## Static export & pretty URLs

Because this app builds with `output: "export"`, `/s/<slug>` and
`/kingdom-query/edit`/`/results` can't be Next.js dynamic route segments --
survey ids and slugs are created at runtime, long after the site is built,
and static export can only pre-render params known at build time.

- The builder/results pages sidestep this by using a query string
  (`?id=<surveyId>`) on an otherwise-static page.
- The public survey link needs a *pretty* URL, so `/s/page.tsx` is a single
  static page (exported to `s.html`) that reads the slug straight out of
  `window.location.pathname`. `apps/web/public/.htaccess` tells Apache to
  serve `s.html` for any `/s/<slug>` request without redirecting, so the
  address bar still shows `/s/<slug>`.

## Deploying to Hostinger (Business Hosting Plan)

1. `npm run build:web` from the repo root (produces `apps/web/out/`).
2. Upload the contents of `apps/web/out/` to your Hostinger `public_html`
   (or a subdirectory, adjusting paths accordingly).
3. Make sure `.htaccess` (already in `out/` after the build, since it's
   copied from `public/`) made it up -- some FTP clients hide dotfiles by
   default.
4. Confirm Apache's `mod_rewrite` is enabled (it is by default on Hostinger
   shared hosting) and that `.htaccess` overrides are allowed.

## Known limitations (MVP trade-offs)

- Because respondents never sign in, Row Level Security can't verify that an
  anonymous `UPDATE` to a response/answer really comes from the browser that
  created it -- the opaque `respondent_token` is the only guard. This is the
  same trust model most no-login Typeform-style tools use; don't rely on it
  where responses must be tamper-proof.
- "Strict" anti-abuse mode currently just requires an email-type question and
  stores the address; it does not yet send/verify a confirmation code.
