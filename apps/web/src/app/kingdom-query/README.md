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
- `jspdf` + `jspdf-autotable` for PDF export (results summary & respondent result)

## Setup

1. Create a Supabase project.
2. Run, in order, in the Supabase SQL editor (or `supabase db push`):
   - `apps/web/supabase/migrations/0001_kingdom_query.sql` -- core tables
     (surveys, questions, scoring profiles, responses, answers), RLS, and a
     response-cap trigger.
   - `apps/web/supabase/migrations/0002_kingdom_query_archetypes_and_growth.sql`
     -- archetypes/sub-profiles, respondent-account CRUD, and the leads /
     newsletter / payment-embed tables.
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, used by the seed script)
4. Sign up for a creator account at `/kingdom-query/login`.
5. (Optional) Seed the demo survey:
   ```
   KINGDOM_QUERY_SEED_OWNER_EMAIL=you@example.com npm run seed:kingdom-query
   ```
   This creates a "Spiritual Gifts Assessment" demo survey at `/s/spiritual-gifts-demo`,
   including a 3-archetype (Leader / Servant / Teacher) scoring setup with one
   sub-profile nested under each of two archetypes.

## Where things live

```
apps/web/supabase/migrations/0001_kingdom_query.sql              Core schema + RLS
apps/web/supabase/migrations/0002_kingdom_query_archetypes_and_growth.sql
                                                                   Archetypes, sub-profiles,
                                                                   respondent CRUD, growth tables
apps/web/src/lib/kingdom-query/                                  Types, Supabase client,
                                                                   scoring/archetype/logic engines,
                                                                   PDF builders, localStorage helpers
apps/web/src/components/kingdom-query/builder/                   Question/scoring/archetype/growth builder UI
apps/web/src/components/kingdom-query/runtime/                   Survey-taking UI
apps/web/src/components/kingdom-query/results/                   Results dashboard UI
apps/web/src/components/kingdom-query/my-results/                Respondent "my results" answer editor
apps/web/src/app/kingdom-query/                                  Creator dashboard, editor, results, my-results
apps/web/src/app/s/                                               Public survey-taking page
apps/web/scripts/seed-kingdom-query.ts                            Demo data seeder
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

**Archetypes & sub-profiles** (`/kingdom-query/edit?id=<surveyId>`,
"Archetypes" tab): a two-tier "you are a ___" result layered on top of the
trait scoring above. An archetype is scored by a **scoring rule** -- pick
one of three algorithm types:
  - `highest_trait` -- just reads one trait's score,
  - `expression` -- a custom formula (same evaluator as trait scoring),
  - `weighted_sum` -- a weighted combination of several traits.
Whichever archetype's rule evaluates highest wins (see
`src/lib/kingdom-query/archetype.ts`). Nest **sub-profiles** under an
archetype for a second, more specific result (each scored the same way, but
only competing against sibling sub-profiles under the same archetype). Both
carry their own result title/body and an optional CTA button+URL, so a
"special result" can point straight at an offer, booking link, or resource --
that's also the tie-in point for a payment embed (see Growth below).

**Growth** (`/kingdom-query/edit?id=<surveyId>`, "Growth" tab, plus the
Results page): every completed response with an answered email question is
automatically recorded as a lead (`kq_leads`); if the respondent opts in it's
also added to the newsletter list (`kq_newsletter_subscriptions`). Both are
viewable/exportable from the Results page. Payment embeds
(`kq_payment_embeds`) are configuration-only in this pass -- a checkout-link
URL, a Stripe Payment Element key/price id, or a raw HTML snippet -- ready
for a future thank-you-screen renderer once you wire up a real
Stripe/PayPal integration.

**Respondent accounts & CRUD** (`/kingdom-query/my-results`): a respondent
can optionally create an account right after finishing a survey ("Save my
results" on the thank-you screen), which claims their anonymous response via
the `kq_claim_response` RPC (it only succeeds if they hold that response's
token, so no one can claim someone else's result). From `/my-results` they
can then **read** their past responses, **update** individual answers (which
recomputes trait scores and the archetype/sub-profile result), and **delete**
a response entirely -- independent of the survey's owner or its open/closed
status.

**Results** (`/kingdom-query/results?id=<surveyId>`): response count and
completion rate, archetype/sub-profile distribution charts, per-question
charts (bar charts for choice questions, histograms for rating/NPS,
word-frequency bars for free text), an average trait-score chart, a leads +
newsletter panel, an individual response browser (now tagged with its
archetype/sub-profile), and export as **CSV** or a **PDF summary report**
(`jspdf`/`jspdf-autotable`). Respondents can similarly download a one-page
PDF of their own result from the thank-you screen.

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
- Payment embeds are schema + builder-config only -- there is no thank-you
  screen renderer or live Stripe/PayPal SDK wiring yet; `config` just stores
  what a future renderer would need.
- If a respondent signs up on the thank-you screen but your Supabase Auth
  settings require email confirmation, there's no session yet to attach the
  claim to, so the response is *not* claimed automatically -- confirming and
  logging in afterward doesn't retroactively link it. Turning off mandatory
  email confirmation (or adding a "claim by email" flow to `/my-results`) is
  a follow-up if this matters for your use case.
