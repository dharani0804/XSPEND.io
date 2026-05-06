# xspend — Product Document

**Status:** Active draft · v0.4 · April 29, 2026
**Owner:** Dharani
**Engineering:** 2 engineers (TBD — friend's company)
**Source of truth:** This file in `docs/PRODUCT.md`. Working version may live in Google Doc; final decisions are committed here.

**Timeline:** 2-month build target with optional 3rd-month quality stretch.
**v1 monetization:** Free beta. Paywall is post-v1.

---

## 1. What we believe

These are the worldview statements that guide every product decision. If a feature contradicts these beliefs, we don't build it.

- Most people do not want stricter budgeting tools.
- People return to finance apps when they feel understood, not judged.
- Clarity creates behavior change better than shame.
- The best financial products reduce anxiety rather than increase vigilance.
- Trust matters more than engagement. We never trade user clarity for time-on-screen.
- People already know they're spending money. They want to understand the *shape* of it.

---

## 2. Product Overview

### 2.1 What xspend is

xspend is a personal finance dashboard built around **awareness**, not control.

Most personal finance apps treat users as people who need to be policed — they enforce budgets, scold overspending, and gamify thrift. xspend takes the opposite view: people already know they're spending money. What they don't have is a clear, calm picture of *where* it's going and *what patterns* it forms over time.

The product surfaces that picture in the simplest possible form: spending by category, discretionary vs fixed, biggest charges, recurring expenses, and lightweight editorial insights. No budget enforcement. No moralizing. No streaks or shame.

### 2.2 Who it's for

**Primary:** People in their 20s-40s who are financially competent but want a clearer view of their spending. They're not in crisis — they're curious. They want to *understand* their patterns, not police them.

**Initial beta cohort (v1 target users):** 10-30 users from the founder's and engineering team's networks. Tech-comfortable, data-curious, willing to give feedback.

**Not for:** People in financial crisis (need crisis tools, not awareness tools); strict budgeters (Mint/YNAB exist for that); people who want investment tracking (out of scope).

### 2.3 What makes it different

1. **Awareness-first framing** — no budgets, no shaming, no moralizing copy
2. **Discretionary vs Fixed** as the primary lens — separates "choices you made" from "structural costs"
3. **Editorial insights** — the dashboard says interesting things in plain English ("You dined out 16 times this month") rather than dumping data
4. **Soft limits, not budgets** — optional thresholds you set for yourself, never enforced or escalated
5. **Project tagging** — group transactions by life event (a trip, a move, a wedding) without forcing categories
6. **Read-only by design** — we never move money, never initiate transfers, never sell data

### 2.4 Success metrics for v1

This is a learning release. Success is measured by **what we learn**, not raw user counts.

**Quantitative targets (one of these = success):**
- ≥30% WAU/MAU among beta cohort by week 8 (genuine stickiness), OR
- ≥50% of onboarded users return at least 3 times (first-impression validation)

**Qualitative targets:**
- 10-30 active beta users by end of v1
- At least 5 unprompted "this is different from Mint" reactions
- Identify the 1-2 features users use most (will guide v2 priorities)
- Identify the top 3 gaps users explicitly ask for

---

## 3. Data & Trust

xspend is **read-only.**

The app never moves money, initiates transfers, pays bills, or modifies bank settings.

Financial data is used solely to power categorization, dashboard functionality, and insights. User data is never sold or used for advertising.

### Source of truth for classification

For linked accounts, Plaid/Teller classifications are treated as initial signals and mapped into xspend's canonical category system. User corrections always override system classifications and create persistent merchant rules.

### Other commitments

- We do not share data with third parties beyond what's strictly required to operate (e.g., Plaid handles bank connections — they see only what they need to provide bank linking).
- Users can delete their account and all associated data at any time.
- Trust and clarity matter more than engagement hacks.

---

## 4. Product Principles

These are locked. They guide every design and copy decision.

1. **Lists explain structure. Charts explain shape. Insights explain meaning.** Don't substitute one for another.
2. **Drilldown follows intent.** When users click something, take them somewhere that answers the obvious next question.
3. **Show the shape, then the items.** Bar/visual first, list second.
4. **The 2s/10s/30s scan model.** Glanceable in 2s, comprehensible in 10s, actionable in 30s.
5. **Don't duplicate — interpret.** If we already showed total spend, the next chart should add a *new* dimension, not restate.
6. **Empty states are CTAs, not placeholders.** Tell the user what to do next.
7. **Honesty over completeness.** Say "not enough data yet" when true, instead of showing fake-looking comparisons.
8. **Insights are editorial, not exhaustive.** Pick 3 interesting things to say, not 30.
9. **Awareness doesn't moralize — but it can signal what the user asked it to signal.** Soft limits exist if user opts in; default tone is neutral.

---

## 5. Key Decisions (locked)

These are settled. Document them so the team doesn't relitigate.

- **Awareness-first positioning** — no budgets, no shame, no streaks
- **Soft limits instead of budgets** — optional, opt-in, never enforced
- **Category drilldown is inline, not navigation** — multi-expand, no page transition
- **Top-category metric uses flexible spending only** — committed costs (rent, subs) excluded
- **3 insights maximum on the dashboard panel** — editorial, not exhaustive
- **No financial recommendations in v1** — no HYSA suggestions, no credit card affiliate links
- **Read-only product** — no money movement, ever
- **Free beta for v1** — monetization decisions deferred to v2
- **29 canonical categories** — users cannot create custom categories in v1
- **Hybrid data layer** — Plaid (or Teller) primary, parser fallback for unsupported banks
- **One paid tier when we monetize** (post-v1) — keep pricing simple

---

## 6. High-Level Architecture

```
Frontend (Vercel)
- React 18 + Vite
- Tailwind CSS
- Zustand for global state, Context for narrow concerns
- React Router

Backend (Render or Railway)
- FastAPI (Python 3.11+)
- SQLAlchemy ORM
- Pydantic models
- Async jobs via Celery + Redis

Data (Supabase or Render-managed Postgres)
- Postgres 15+
- Daily backups, 7-day retention
- Connection pooling via PgBouncer

External services:
- Auth:       Clerk
- Data:       Plaid OR Teller (decided Week 1)
- Email:      Resend
- Errors:     Sentry
- Payments:   Stripe (post-v1)
- Analytics:  PostHog or Plausible (optional v1)
```

### Performance expectations

These are non-negotiable user-experience targets. If a feature can't meet these, redesign it.

- **Dashboard load:** <2s after sync (initial render to interactive)
- **Statement upload feedback:** within 10s (user sees parse progress / completion)
- **Initial bank sync:** <60s for most users (typical 1-3 accounts, recent transactions)

These are p95 targets — 95% of requests should meet them. Outliers are tolerable; consistent breaches are not.

---

## 7. Scope for v1

This section is the contract. Anything not in 7.1 is out of scope unless explicitly added with a documented decision.

### 7.1 In scope (must ship)

**Data layer (highest priority):**
- Plaid OR Teller integration (decided Week 1) for top US banks
- Hybrid: parser as fallback for banks not covered by chosen aggregator
- Statement upload (CSV, Excel, PDF, OFX) for at least: Chase, Amex, Bank of America, Wells Fargo, Capital One, Discover
- PDF parsing is supported only for tested statement formats. Unsupported PDFs fall back to a manual-review error state with a clear message.
- Multi-account aggregation per user
- Transaction deduplication

**Classification:**
- 29-category canonical taxonomy (see appendix B)
- Rule-based classifier (already built)
- Membership-subscription detection (already built)
- Discretionary vs Fixed detection (already built)
- User can manually re-categorize a transaction (creates a `merchant_rule`)

**Dashboard:**
- Hero KPIs (Spent / Top Category / Biggest Charge) — already built (Phase 1)
- Discretionary vs Fixed bar with ratio-aware microcopy — already built
- Category drilldown with relative bars + top transactions + 1 insight per category (Phase 2)
- Insights panel — refined version (Phase 3)
- Recurring expenses section, demoted (Phase 4)
- Multi-month trend chart (already exists, minor polish)
- Account selector and month selector

**Projects (already built, light polish):**
- Create project, tag transactions to it, see rollup
- Cross-page state refresh (already done)

**Account & auth:**
- Email + password signup (via Clerk)
- Email verification
- Password reset
- Session management
- Multi-tenant data isolation (every query filtered by `user_id`)
- Delete-my-account flow (soft-delete → 30-day hard delete)

**Trust & support:**
- Terms of Service (Termly or iubenda generated)
- Privacy Policy (Termly or iubenda generated, reviewed for accuracy)
- FAQ page (8 questions, see §13)
- Contact / support email (visible footer)

**Infrastructure:**
- Hosted on Render (backend) + Vercel (frontend)
- Managed Postgres (Supabase or Render)
- Celery + Redis for async work
- Sentry for error tracking
- Resend for transactional email
- Basic CI (GitHub Actions: tests + lint on PR, deploy staging on merge)

**Polish:**
- First-login onboarding flow (3-5 screens)
- Mobile-responsive layout (works on phone, even if not optimized)
- Empty states for every page
- Error states (upload failed, bank disconnect, etc.)
- Loading states

**Testing:**
- Unit tests for classifier, fixed_classifier, parser, dashboard endpoint
- Integration tests for: signup flow, statement upload, Plaid/Teller sync, transaction categorization, dashboard rendering, multi-tenant isolation
- Manual QA test plan (~20 critical scenarios)
- Smoke tests in CI

### 7.2 Out of scope for v1 (explicit)

Don't accidentally build these. If a user requests one, log it for v2.

- Mobile native app (iOS/Android)
- Investment tracking
- Bill pay or money movement (we are read-only, period)
- Joint / shared accounts
- Goals beyond simple project tagging
- Crypto / non-USD support
- Tax features
- Social features (sharing, leaderboards, etc.)
- Full transaction search with filters (basic search only)
- Budget enforcement / alerts
- Data export (CSV download) — soft no
- Bank account aggregation beyond US
- Custom categories
- Receipt scanning / OCR
- Multi-currency
- Push notifications
- AI chat / "ask anything about your money"
- Recommendations (HYSAs, credit cards, etc.)
- **Stripe / payments / paywall** — deferred to post-v1

### 7.3 Deferred to v2

- Stripe Checkout, subscription tiers, paywall
- Phase 4 dashboard polish: Spending by Account section, soft limits with signals
- Custom categories
- CSV/PDF export
- Browser extension
- Dark/light mode toggle (default dark for v1)
- Bank disconnect notifications via email
- Weekly digest email
- Advanced merchant cleanup (the 2 stubborn patterns we know about — non-blocking edge cases)
- A11y audit
- I18n / translations
- Full webhook architecture for Plaid (use polling for v1 if simpler)

---

## 8. User flows

### 8.1 First-time user (signup → connected dashboard)

1. Land on marketing page (or referral link)
2. Click "Sign up" → enter email/password
3. Receive email verification → click link
4. Enter app, see brief onboarding (3 screens explaining the awareness-first idea)
5. Connect first bank account (via Plaid/Teller Link)
6. Wait for initial sync (~30s, show progress)
7. See dashboard with their data
8. Brief tooltip-tour: "this is your discretionary vs fixed split", "click any category to drill in"
9. Onboarding complete

**Failure modes to handle:**
- Email already in use → "Forgot password?" link
- Bank link fails → fall back to "Upload a statement instead" CTA
- No transactions in last 30 days → show empty state explaining sync may take longer

### 8.2 Returning user

1. Login (or auto-login via session)
2. Dashboard loads with current month
3. User can switch month, switch account, drill into category, view recurring, view insights

### 8.3 Statement upload (manual fallback)

1. From dashboard or Settings, click "Upload statement"
2. Drag/drop or pick file (CSV, Excel, PDF, OFX)
3. System detects bank, parses, dedupes
4. Show summary: "Imported X transactions from Chase, Y already existed"
5. New transactions appear on dashboard

**Failure modes:**
- Unrecognized format → "We don't support this bank yet — email us"
- Empty file → friendly error
- Dedupe finds 100% duplicates → "Nothing new to import"

### 8.4 Project creation

1. From Projects page, click "New project"
2. Enter name, optional dates, optional total budget
3. Project appears, transactions can be tagged from any transaction list

### 8.5 Account deletion

1. Settings → Account → "Delete my account" (with confirmation)
2. Soft delete: account marked inactive, banks disconnected immediately
3. Email confirmation: "Your account is scheduled for deletion in 30 days. Click here to cancel."
4. After 30 days: hard delete (transactions, projects, all PII)

---

## 9. Information Architecture

### 9.1 Page hierarchy

```
/ (redirect to /dashboard if logged in, /login if not)
/login
/signup
/verify-email
/forgot-password
/reset-password
/dashboard          (default page after login)
/transactions       (all transactions, filterable)
/projects           (project list)
/projects/:id       (single project view)
/recurring          (full recurring expenses view)
/settings
/settings/account
/settings/banks
/settings/profile
/faq                (public, also linked from footer)
/privacy            (public, also linked from footer)
/terms              (public, also linked from footer)
```

### 9.2 Navigation model

- Top nav (logged in): Dashboard · Transactions · Projects · Settings
- User avatar (top right): Profile · Logout
- Footer (always): FAQ · Privacy · Terms · Contact
- Persistent across all logged-in pages

### 9.3 URL structure

- All app URLs prefixed with `/app/` for clarity
- IDs in URLs use slugs where meaningful, UUIDs as fallback
- Month selector via query param: `/dashboard?month=2026-04`
- Account filter via query param: `/dashboard?account=chase-checking`

---

## 10. UI Components & Design System

### 10.1 Color palette

| Role | Color | Hex |
|---|---|---|
| Background | Near-black | `#0a0d14` |
| Card background | Dark navy | `#0f1117` |
| Card border | Slate | `#1e2030` |
| Primary text | Off-white | `#f1f5f9` |
| Secondary text | Mid-gray | `#94a3b8` |
| Tertiary / disabled | Dark gray | `#475569` / `#64748b` |
| Money / positive | Emerald | `#10b981` |
| Discretionary segment | Blue/indigo gradient | `#3b82f6 → #6366f1` |
| Fixed segment | Slate | `#475569` |
| Warning / over | Amber | `#f59e0b` |
| Danger | Red | `#ef4444` |

**Rule:** All dollar amounts use emerald. All names (categories, merchants) use white. Don't deviate.

### 10.2 Typography

- Sans (UI): system stack
- Monospace (numbers): system mono stack
- Hero KPI primary: 36px / 800 weight
- Card primary: 28px / 800 weight
- Card label: 11px / 700 weight / uppercase / 1.2px tracking
- Body: 13-14px / 400-500 weight
- Subline: 12px / 400 weight

### 10.3 Component library

To be built / extracted:
- `<Card>` — standard container
- `<KpiCard>` — hero card variant
- `<StackedBar>` — horizontal stacked bar
- `<ComparisonPill>` — colored pill with delta arrow
- `<CategoryRow>` — expandable category list item
- `<TransactionRow>` — used in lists
- `<EmptyState>` — illustration + message + CTA
- `<LoadingState>` — skeleton variant
- `<ErrorBanner>` — top-of-page banner
- `<Modal>` — for upload, project create, settings dialogs

### 10.4 Empty / loading / error states

Every page handles all three. Specifics:
- **Empty:** "Connect a bank or upload a statement to get started" + CTA buttons
- **Loading:** skeleton cards on dashboard; top progress bar on page transitions
- **Error:** specific copy per failure mode, never generic

### 10.5 Mobile responsive rules

- All pages must work on 375px width (iPhone)
- Hero cards stack vertically
- Discretionary/Fixed bar stays horizontal but labels wrap below
- Tables become card lists
- Top nav becomes hamburger menu

---

## 11. Domain Logic / Business Rules

These are settled and codified in the existing backend. The team should not redesign them — only port to new architecture if needed.

### 11.1 Categorization

**29 canonical categories** (see appendix B). Three sources, in priority order:

1. **Manual user override** (`merchant_rules`, `source='user_correction'`) — always wins
2. **Rule-based classifier** (`classifier.py`) — regex with priorities
3. **Bank-supplied hint** — only used when classifier confidence is `low` AND bank's hint maps to canonical via `BANK_CATEGORY_MAP`

If none produce a category → `Other`.

### 11.2 Fixed vs Discretionary detection

A transaction is `is_fixed = True` if:
1. Keyword override matches (e.g., "Walmart+ Member") — `fixed_classifier.py:KEYWORD_FIXED_PATTERNS`
2. OR amount-pattern + category signal score ≥ 0.75
3. OR user manually marked it fixed

Default: `is_fixed = False`. When in doubt, discretionary.

### 11.3 Recurring detection

Same logic as is_fixed in v1.

### 11.4 Merchant display normalization

`display_merchant(raw)` cleans bank descriptions for UI:
- Strip location codes, auth tokens, URLs, trailing state codes
- Smart title-casing with acronym preservation
- Coverage ~85%; 2 known stubborn patterns documented as limits

**Known bug to fix in v1:** `MERCHANT_DISPLAY_MAP` in `fixed_classifier.py` uses 4-char prefix matching. This is too coarse and produces wrong labels (e.g., `'amaz' → Amazon Prime` mislabels regular Amazon shopping as a Prime subscription). `display_merchant` currently bypasses the map for this reason. The map needs to be either keyword-matched (longer keys) or replaced. Engineer 1 owns this.

### 11.5 Comparison rules (tier-based)

- Tier 1 (0-1 months): no comparison
- Tier 2 (2 months): absolute delta only
- Tier 3 (3+ months): percentage + absolute

Comparability check: prev month must have ≥10 transactions AND ≥$200 flexible.

### 11.6 Insights generation

Four buckets, in priority order:
- **Surprise:** "You dined out 16 times — every other day"
- **Concentration:** "70% of shopping was at one merchant"
- **Behavior:** "Pets down 58% vs last month"
- **Context:** "April is typically high spending due to taxes"

Soft-limit-exceeded insights have priority floor. Pick top 3 by score. Templates editorial, not generative.

### 11.7 Project rollup

Dual attribution: a transaction can be in both a category total AND a project rollup. Project totals don't reduce category totals.

### 11.8 Multi-account aggregation

Default: all accounts combined. Account selector filters to one. Cross-account dedup uses `external_transaction_id` first, fingerprint hash fallback.

---

## 12. Data Model

### 12.1 Core entities

| Entity | Purpose |
|---|---|
| `User` | Account holder, one-to-one with Clerk identity |
| `Account` | Bank account or credit card |
| `Transaction` | Single charge/credit |
| `Category` | Categorization label (29 system categories) |
| `Project` | User-created grouping |
| `MerchantRule` | Stored categorization rule |
| `UploadedFile` | Statement upload record |

### 12.2 Schema

To be expanded by engineering team. See existing `backend/models.py` — port to Postgres, add `created_at`/`updated_at` everywhere, ensure all queries filter by `user_id`.

**Required indexes:**
- `transactions.user_id`
- `transactions.transaction_date`
- `transactions.fingerprint`
- `transactions.category`
- `merchant_rules.merchant_keyword`

### 12.3 Computed fields

- `is_fixed` — set at write-time
- `classification_confidence` — `low` / `medium` / `high`
- `classification_source` — `auto` / `user_correction` / `merchant_rule`
- `exclusion_reason` — set if excluded from totals

---

## 13. FAQ — internal alignment + draft marketing copy

These answers serve double duty: alignment for the team + draft copy for the public FAQ page.

### What is xspend?

A personal finance dashboard that helps you understand your spending without judging it. We surface where your money actually goes, what's discretionary vs fixed, and what patterns are forming — without pushing budgets, streaks, or shame.

### How is xspend different from Mint?

Mint and similar apps are built around budgeting — they want you to set targets and meet them. xspend is built around awareness — we show you what's happening and trust you to decide what to do about it. We don't sell your data, don't show ads, and don't moralize.

### Do you move my money?

No. xspend is read-only. We can see your transactions to categorize and analyze them, but we cannot transfer money, change account settings, or initiate any movement. You can verify this in our Privacy Policy.

### Is my bank data secure?

We use Plaid (or Teller) for bank connections — the same providers used by Venmo, Coinbase, Robinhood, and most major fintech apps. Your bank credentials are never shared with us. We see only the transaction data needed to power your dashboard.

### Can I delete my data?

Yes, anytime. Settings → Account → Delete my account. Your account is immediately deactivated and all data is hard-deleted within 30 days. We don't retain anything after deletion.

### What banks do you support?

Through Plaid (or Teller), we support 12,000+ US banks and credit unions. For banks not on the list, you can upload statement files directly (CSV, Excel, PDF, or OFX). Currently tested formats: Chase, Amex, Bank of America, Wells Fargo, Capital One, Discover.

### Why doesn't my category look correct?

Our categorizer gets it right most of the time, but not always. You can re-categorize any transaction by clicking it and selecting a different category. We'll remember the correction and apply it to similar transactions in the future.

### Can I upload statements manually?

Yes. From the dashboard or Settings, click "Upload statement" and drag in a file. We support CSV, Excel, PDF, and OFX formats. Useful if your bank isn't supported by Plaid/Teller, or if you want to import historical data.

---

## 14. External integrations

### 14.1 Data layer — TO DECIDE WEEK 1

Choose one of:
- **Plaid:** universal coverage, usage-based pricing (~$1.50/connected account/mo published; monthly minimum may apply depending on plan/approval — confirm during Week 1 evaluation)
- **Teller:** US-only. May offer a different cost/reliability profile than Plaid — validate during Week 1 evaluation

Decision criteria:
- Cost at projected user volume
- Bank coverage in our top-20 list
- Quality of categorization
- Setup time
- Production approval timeline

Both should be evaluated in free trial during Week 1.

### 14.2 Auth — Clerk

Free up to 1k users. Handles email verification + password reset + sessions. Don't roll our own auth.

### 14.3 Payments — Stripe (deferred to post-v1)

Not built in v1. Beta is free.

### 14.4 Email — Resend

Use cases: signup confirmation, password reset, account deletion confirmation. Optional weekly digest in v2.

### 14.5 Error tracking — Sentry

Free tier sufficient. Integrates with FastAPI and React.

### 14.6 Analytics — TBD (optional v1)

PostHog or Plausible. Track: signup, first bank connect, dashboard views, drilldown clicks, churn. Decide Week 2.

---

## 15. Infrastructure & Trust

### 15.1 Environments

- **Local dev:** developer's laptop, local Postgres, mock Plaid/Teller
- **Staging:** deployed `main` branch, real Plaid sandbox, separate database
- **Production:** deployed tagged versions, real Plaid prod, real database

### 15.2 Hosting

- Backend: Render or Railway (FastAPI + Celery + Redis)
- Frontend: Vercel
- Database: Supabase or Render-managed Postgres

### 15.3 CI/CD

- GitHub Actions
- On PR to `main`: run tests, lint, build
- On merge to `main`: deploy to staging
- On tag `vX.Y.Z`: deploy to production

### 15.4 Backup & recovery

- Postgres daily backup (provider does this)
- 7-day retention
- Test restore quarterly

### 15.5 Secrets management

- Environment variables in hosting providers
- Never commit secrets to repo
- `.env.example` checked in, real `.env` gitignored

### 15.6 Trust artifacts

- **Terms of Service** — generated via Termly/iubenda, reviewed for our actual practices
- **Privacy Policy** — same, with explicit notes on read-only nature, no-data-sale commitment, deletion process
- **FAQ page** — see §13
- **Contact / support email** — visible in footer, monitored by founder
- **Status page** (optional v1) — simple uptime monitor

### 15.7 Security & compliance

- Multi-tenant data isolation: every query filters by `user_id`. Code review checklist enforces this.
- Integration test: User A cannot fetch User B's data via any endpoint.
- HTTPS-only.
- Encryption at rest (Postgres provider).
- No SSN / no full bank account numbers stored (Plaid abstracts these).
- Plaid TOS compliance: read and follow.
- "Delete my account" flow: soft-delete → 30-day hard-delete.
- Cookie consent banner for EU visitors (basic).

We don't move money, so most banking regulations don't apply. But trust is earned through behavior, not just legal compliance.

---

## 16. Beta feedback loop

During v1 beta, learning is the primary product. Engineering velocity matters less than insight quality.

**Process:**
- Founder will manually interview active users
- Feedback logged weekly in shared doc (one row per interview, key themes tagged)
- Insights reviewed by full team (founder + 2 engineers) at weekly sync

**Key questions to ask every interviewed user:**
- What did you look at first?
- What insights felt useful?
- What felt confusing or unnecessary?
- What caused you to come back (if you did)?
- What didn't xspend do that you wished it would?

**Cadence:**
- 3-5 user interviews per week during beta
- Weekly synthesis: top 3 themes, top 3 bug categories, anything surprising
- v2 priorities derived from beta themes, not founder intuition

**Tooling:**
- Interview notes: Notion or shared Google Doc
- Bug/feature tracking: Linear or GitHub Issues
- Quantitative behavior: PostHog/Plausible (if added)

The bar for changing the product based on feedback is "≥3 users mentioned the same thing" — not "1 vocal user said X." Avoid building for the loudest voice.

---

## 17. Roadmap — 8-week target with optional 3rd-month stretch

**Team:** 2 engineers + Dharani (product/UX/glue).

**Engineer 1 (backend / infra):** Plaid/Teller integration, Postgres migration, auth migration, multi-tenant audit, Celery setup, deployment, async jobs. Owns MERCHANT_DISPLAY_MAP fix.

**Engineer 2 (frontend / full-stack):** Phase 2-4 dashboard, onboarding flow, empty/loading/error states, mobile responsive, polish.

**Dharani:** decisions, design refinements, beta user recruitment, user interviews, FAQ/TOS, copy, manifesto polish, glue across teams.

### Week 1: Foundation
**Goal:** working deployed app with multi-tenancy, real auth, ready to plug in data layer.

- E1: Postgres migration (schema, queries, transactions)
- E1: Multi-tenant isolation audit
- E1: Replace DIY auth with Clerk
- E1: Deploy to staging on Render + Vercel
- E1: Set up Sentry, basic CI
- E1+D: Decide Plaid vs Teller (free trial evaluation)
- E2: Component library extraction from existing Dashboard.jsx
- E2: Begin Phase 2 dashboard (category drilldown structure)
- E2: Rename Goals.jsx → Projects.jsx
- D: User research — talk to 3-5 target users about awareness-first framing

**Milestone:** founder + 1 friend can both sign up and use staging URL with isolated data.

### Week 2: Data Layer
**Goal:** users can connect a real bank account and see transactions flow.

- E1: Integrate chosen data provider (Plaid or Teller)
- E1: Implement bank-link flow in UI
- E1: Webhook handler / polling for new transactions
- E1: Map provider categories → 29 canonical
- E1: Migrate parser to fallback mode
- E1: Fix MERCHANT_DISPLAY_MAP 4-char prefix bug
- E2: Phase 2 dashboard continues (drilldown UI, top transactions per category)
- D: Begin FAQ + manifesto polish, Privacy Policy review

**Milestone:** new user can sign up, connect Chase, see real transactions.

### Week 3: Phase 2 dashboard + onboarding
**Goal:** core UX is complete and a new user has a smooth first experience.

- E2: Phase 2 dashboard complete (relative bars, top transactions, 1 insight per category)
- E2: First-login onboarding flow (3-5 screens)
- E2: Empty states for every page
- E1: Async job infrastructure (Celery + Redis) for scheduled syncs
- E1: Account deletion flow (soft-delete, 30-day hard-delete)
- D: TOS + Privacy Policy generated and reviewed

**Milestone:** new user signup → bank connect → first dashboard view feels intentional.

### Week 4: Phase 3 insights + email
**Goal:** insights are sharp; email works.

- E2: Phase 3 dashboard (insights system: 4 buckets, scoring, priority floor, soften copy)
- E2: Loading states everywhere
- E2: Error states (upload fail, bank disconnect, etc.)
- E1: Resend integration — signup confirmation, password reset, deletion confirmation
- E1: Multi-tenant isolation integration test
- D: User interviews from Week 1 cohort, refine FAQ based on actual user questions

**Milestone:** product is feature-complete except for polish.

### Week 5: Phase 4 + mobile
**Goal:** product is shippable.

- E2: Phase 4 dashboard (recurring demoted, "Recurring · Not part of your budget" microcopy fix)
- E2: Mobile responsive pass on all pages
- E1: Performance audit (page load < 2s, API < 500ms p95)
- E1: Production environment setup
- D: Beta invite list (10-30 names), draft welcome email
- D: Marketing landing page draft (single page, who/what/how)

**Milestone:** all features built. Bug-bash starts.

### Week 6: Testing & QA
**Goal:** product is reliable enough for 30 strangers.

- E1+E2: Unit test coverage for: classifier, fixed_classifier, parser, dashboard endpoint, canonicalize
- E1+E2: Integration tests: signup, bank connect, transaction sync, categorization, dashboard render, multi-tenant isolation
- E1+E2: Manual QA test plan (~20 critical scenarios)
- E1+E2: Bug fixes from QA
- D: Final review of FAQ, TOS, Privacy, support email setup

**Milestone:** internal team uses product for 1 week without finding blockers.

### Week 7: Beta launch prep
**Goal:** ready to invite users.

- E2: Marketing landing page production-ready
- E1: Domain DNS, SSL, professional polish
- D: Onboarding email sequence written
- D: Support inbox (Crisp or just an email)
- E1: Final security review (multi-tenant test, OWASP basics)
- E1+E2: Last-mile bug fixes

**Milestone:** invite codes go out to first 5 friendly users.

### Week 8: Beta + iterate
**Goal:** learn what matters.

- E1+E2: Daily Sentry check, fix critical issues
- E1+E2: Quick fixes for top user-reported issues
- D: Onboard remaining beta users in waves
- D: Weekly user interview (3-5 users / week)
- D: Decide v2 priorities based on actual usage

**Milestone:** 30 users invited, ≥10 active in week 2 of beta, qualitative themes documented.

### Week 9-12 (stretch / quality buffer)

If timeline slips (and it usually does), we extend by up to 4 weeks. Expected use:
- Bug-bash from beta feedback
- Polish based on user interviews
- Plaid production approval delay buffer
- Surprise infrastructure problems
- Additional bank coverage if 6 isn't enough

If we don't need stretch time: start Stripe integration for v2 launch.

---

## 18. Testing Strategy

### 18.1 Unit tests (mandatory)

- `classifier.py`: 30+ test cases covering each category's regex patterns, edge cases, ambiguous merchants
- `fixed_classifier.py`: keyword override tests, amount-pattern tests, no-history tests
- `parser.py`: per-format tests, per-bank tests, edge cases
- `display_merchant.py`: existing 14 cases + 10 more
- `_month_totals`: empty data, single transaction, mixed types, multi-account

### 18.2 Integration tests

- Signup flow (email → verify → first login)
- Statement upload (Chase CSV → see transactions)
- Bank connect (Plaid sandbox → see transactions)
- Transaction categorization end-to-end
- Manual re-categorization creates merchant_rule that affects future transactions
- Dashboard summary endpoint with various user states
- Multi-tenant isolation (User A cannot see User B's data) — **critical**
- Account deletion flow (soft → hard delete)

### 18.3 Manual QA

Document in `docs/qa-test-plan.md`. ~20 scenarios covering:
- Each user flow from §8
- Edge cases (empty, errors, edge data)
- Mobile devices (real phone test)
- Browsers: Chrome, Safari, Firefox

### 18.4 Acceptance criteria for v1 launch

- All unit + integration tests passing in CI
- Manual QA: 100% pass on critical paths, 90%+ pass overall
- Sentry error rate < 1% of requests
- p95 dashboard load < 2s
- Multi-tenant isolation test passes
- Founder uses product for 1 week without blockers

---

## 19. Risk & open questions

### 19.1 Strategic risks

- **No one wants awareness-first** — mitigation: it's a learning release. If no traction, learn why and pivot.
- **Distributed team coordination** — mitigation: this doc, weekly sync, clear ownership split.
- **"Free → paid" transition risks user revolt** — mitigation: explicit upfront communication, beta-user discount, transparent pricing announcement before charging.

### 19.2 Technical risks

- **Plaid production approval delay (1-3 weeks)** — mitigation: apply Week 1, build with sandbox.
- **Bank format changes break parser** — mitigation: parser is fallback; provider abstracts most banks.
- **Multi-tenant bug leaks data** — mitigation: integration test, code review checklist, run before every deploy.

### 19.3 Decisions still open

- Plaid vs Teller (Week 1)
- Whether to add analytics (Week 1-2)
- Whether `Insights` becomes its own page or stays as panel (Week 3)
- Whether to support data export (Week 5, time-permitting)
- Pricing model details (post-v1, after beta learnings)

---

## 20. Appendices

### Appendix A: Glossary

- **Awareness-first:** the product framing — surface patterns, don't enforce rules
- **Discretionary:** spending the user can theoretically change month-over-month
- **Fixed / Committed:** structural recurring costs
- **Soft limit:** optional user-set threshold per category, never enforced
- **Tier 1/2/3:** dashboard's data sufficiency tiers based on months of history
- **Read-only:** xspend's foundational stance — we observe, never act on user accounts

### Appendix B: 29 canonical categories

Food & Dining, Groceries, Transport, Bills & Utilities, Subscriptions, Health, Shopping, Entertainment, Travel, Personal Care, Pets, Education, Loan Payment, Credit Card Payment, Refund, Salary, Other Income, Transfer, Other, Alcohol & Liquor, Baby & Kids, Bank Fees, Card Credit, Cash & ATM, Gifts & Donations, Government & Taxes, Home Improvement, Insurance, Professional Services.

### Appendix C: Existing code map

- `backend/main.py` — FastAPI app, all endpoints
- `backend/models.py` — SQLAlchemy models, seed data
- `backend/database.py` — DB connection
- `backend/parser.py` — statement parsing
- `backend/classifier.py` — transaction classification (rule-based)
- `backend/fixed_classifier.py` — recurring/fixed detection + merchant display
- `backend/credit_engine.py` — credit card statement credit handling
- `backend/insights.py` — insights generation
- `frontend/src/pages/Dashboard.jsx` — main dashboard (post-Phase-1)
- `frontend/src/pages/Transactions.jsx` — transaction list
- `frontend/src/pages/Goals.jsx` — projects (renamed to `Projects.jsx` in v1)
- `docs/dashboard-redesign-v1.md` — design doc
- `docs/PRODUCT.md` — this doc (canonical)

### Appendix D: Migration plan

1. Port to Postgres (schema in `backend/models.py`)
2. Add `user_id` filtering audit
3. Replace auth (DIY → Clerk)
4. Deploy
5. Integrate data provider
6. Polish per roadmap

---

## Document changelog

- **April 29, 2026 — v0.4** — Initial commit. Includes: What we believe (manifesto), Data & Trust, High-Level Architecture with performance constraints, Key Decisions, FAQ, Beta feedback loop, 8-week roadmap with 3rd-month stretch, free-beta v1 (Stripe deferred), Plaid/Teller pricing as TBD, PDF parsing limited to tested formats, MERCHANT_DISPLAY_MAP elevated to v1 fix.
