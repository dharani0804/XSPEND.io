# Dashboard Redesign v1 — Awareness-First

**Status:** Design locked, implementation pending
**Authored:** April 2026
**Build estimate:** Phased, 7–10 days total across 4 phases

---

## Product framing

**Core question the dashboard answers:** *"Where did my money go — and what's the story?"*

**Framing:** Awareness, not control, not signal.

- ✅ Dashboard reports what happened
- ❌ Dashboard does not advise what to do
- ❌ Dashboard does not judge spending choices

Users who want budgeting, optimization, or strategy eventually get those as separate surfaces. Dashboard stays neutral.

---

## Design principles

Nine principles govern the dashboard. Any future feature that violates these should be re-examined.

1. **Lists explain structure. Charts explain shape. Insights explain meaning.**
2. **Drilldown follows intent.** Don't hijack a user's click for secondary goals.
3. **Show the shape, then the items.** Distribution before detail.
4. **The 2s / 10s / 30s scan model.** Hero answers "how did the month go" in 2s. Categories answer "where did it go" in 10s. Drilldowns answer "what should I look at" in 30s.
5. **Don't duplicate — interpret.** When two surfaces cover related data, one shows *what*, the other shows *what it means.*
6. **Empty states are CTAs, not placeholders.** Tier 1 shows less, honestly; doesn't fake data.
7. **Honesty over completeness.** Suppress suspicious or sparse comparisons.
8. **Insights are editorial, not exhaustive.** Select the 3 most interesting things; don't list every true thing.
9. **Awareness doesn't moralize — but it can signal what the user asked it to signal.** Unsolicited judgment is forbidden. Solicited warnings (soft limits) are required.

---

## Page layout (top to bottom)

```
┌────────────────────────────────────────────────────────┐
│ Header: "Dharani's spending · March 2026 · N accounts" │
├────────────────────────────────────────────────────────┤
│ 1. Hero KPIs (3 cards side by side)                    │
│    Total Spend · Top Category · Biggest Charge         │
├────────────────────────────────────────────────────────┤
│ 2. Discretionary vs Fixed                              │
│    Full-width stacked bar + ratio-aware microcopy      │
├────────────────────────────────────────────────────────┤
│ 2.5. Spending by Account  (conditional)                │
│    Shown only with meaningful distribution             │
├────────────────────────────────────────────────────────┤
│ 3. Category drilldown (the hero component)             │
│    Collapsed list, multi-expand with inline detail     │
├────────────────────────────────────────────────────────┤
│ 4. Insights (3 editorially selected)                   │
├────────────────────────────────────────────────────────┤
│ 5. Recurring expenses (collapsed accordion)            │
├────────────────────────────────────────────────────────┤
│ 6. Monthly trend (hidden at Tier 1)                    │
└────────────────────────────────────────────────────────┘
```

Order reflects an information-depth gradient: each section goes one level deeper than the last.

---

## Section 1 — Hero KPIs

Three cards, equal weight, horizontal row.

### KPI 1: Total spend

- Label: `SPENT`
- Value: `$4,272`
- Subline: `93 transactions`
- MoM row (conditional): `↑ $450 vs Feb` or absent per tier rules
- Includes both flexible and committed spending (honesty over cleanliness)

### KPI 2: Top category

- Label: `TOP CATEGORY`
- Value: Category name (e.g., `Shopping`)
- Subline: `$1,350 · 32%`

### KPI 3: Biggest charge

- Label: `BIGGEST CHARGE`
- Value: Merchant name (e.g., `REI`)
- Subline: `$373 · Mar 5`
- **Flexible expenses only** — excluding committed (rent, subs) makes surprises stand out

### What's excluded

- No income display
- No savings rate
- No budget status widget
- No "where it goes" card (promoted to Section 2)

---

## Section 2 — Discretionary vs Fixed

Replaces the current "Where it goes" hero card.

### Visual

Full-width horizontal stacked bar. Two segments:
- Discretionary (blue/indigo gradient — "choice, energy")
- Fixed (muted slate — "background, infrastructure")

Labels below:
- `Discretionary $3,923 · 92%`
- `Fixed $349 · 8%`

### Microcopy (ratio-aware)

| Split | Primary line |
|---|---|
| ≥85% discretionary | *"Most of your spending was discretionary this month."* |
| 60–84% discretionary | *"Your spending was mostly discretionary — N% this month."* |
| 40–59% either way | *"Your spending was evenly split between discretionary and fixed."* |
| 60–84% fixed | *"Most of your spending was fixed costs this month."* |
| ≥85% fixed | *"Almost all of your spending was fixed costs this month."* |

Secondary (hover or expanded):
*"Money you chose to spend (shopping, dining, etc.)"*

Tier 3 addition (if comparison available):
*"Up from 88% last month."*

### Interactions

- **Hover:** tooltip shows top 3 categories in that bucket
- **Click:** no interaction in v1 (defer to v2)

### Vocabulary lock

- Use "Discretionary" / "Fixed" consistently
- Do NOT use "Flexible" / "Committed" / "Variable" / "Recurring" in UI copy
- Use "soft limit" (never "budget") for user-set thresholds

---

## Section 2.5 — Spending by Account

**Conditional section.** Only renders when meaningful multi-account distribution exists.

### Visibility rule

All three must be true:
- ≥2 distinct `bank_source` values with transactions this month
- Second-largest account ≥10% of total spend
- Second-largest account has ≥2 transactions

### Visual

Same stacked-bar treatment as Section 2. Each segment = one bank/account.

### Microcopy

Primary: *"Most of your spending went through Amex this month."* (ratio-aware, same pattern as Section 2)

Subline: *"Grouped by bank — [N] accounts this month"* (honest about precision limits; sets up v2)

### Insight integration

Card-level patterns surface in Insights panel as Concentration-bucket templates:
- *"Most of your Shopping went through Amex."*
- *"Dining spend is concentrated on Chase."*
- *"Your Groceries spending is split across 3 accounts."*

### v2 path

- Card-level granularity (distinguish Chase Freedom from Chase Sapphire)
- Requires user-labeled accounts

---

## Section 3 — Category drilldown (the hero component)

This is the signature feature. Most design investment goes here.

### Default state (collapsed)

Vertical list of categories, sorted descending by spend.

```
🛍  Shopping            $1,350  ▇▇▇▇▇▇▇▇▇░  32%  ›
🛒  Groceries             $674  ▇▇▇▇▇░░░░░  16%  ›
🍽  Food & Dining         $582  ▇▇▇▇░░░░░░  14%  ›
...
▼ Others ($423 · 10%)    [expandable row for tail]
```

Each row:
- Emoji prefix (existing style)
- Category name (bold if expanded)
- Dollar amount (right-aligned)
- **Relative progress bar** — scaled to top category's value, not total
- Percentage of total (numeric context)
- Chevron indicating expandability

### Expanded state (user clicks row)

Inline drawer below the row. Header row stays visible.

```
🛍  Shopping                              $1,350  ▇▇▇▇▇▇▇▇▇░  32%  ˅
    14 transactions · avg $96
    Most spend was at REI and UNIQLO

    TOP TRANSACTIONS
    Mar 05   REI #35 Alderwood              $372
    Mar 05   UNIQLO Alderwood Mall          $265
    Mar 11   Target · Stone Way             $187
    Mar 18   Amazon.com                     $143
    Mar 22   Sephora                         $89
    View all 14 transactions →

    + Set a soft limit
```

Contents:
1. **Context line:** transaction count + avg
2. **Interpretive insight line** (one of 5 templates — see below)
3. **Top 5 transactions:** date, merchant (bold), amount (right-aligned)
4. **"View all" link:** navigates to Transactions page pre-filtered
5. **Soft limit affordance:** quiet "+" button → opens existing budget modal

### Interpretive insight templates

Exactly one line, selected by priority:

| Template | Trigger |
|---|---|
| Frequency (*"You shopped N times — about every X days"*) | txn_count ≥ 10 |
| Concentration (*"Most spend was at X and Y"*) | top 2 merchants > 40% of category |
| Timing (*"Most spend happened between X and Y"*) | 60% of spend within a 7-day window |
| Single-merchant (*"All from one merchant: X"*) | one merchant = 100% |
| Fallback (*"Avg transaction: $X, ranging $Y to $Z"*) | none of the above |

### Interactions

- **Multi-expand:** multiple categories can be open at once
- **Collapse all:** button appears when ≥2 rows expanded
- **No sort controls in v1** (default: descending by spend)
- **No filter UI in v1**

### v1 scope

- ✅ Current-month data only
- ❌ No per-category MoM comparison (deferred to v2)
- ❌ No trend indicators within drilldown

### v2 path

- Category MoM (requires backend extension to `/dashboard-summary`)
- Per-merchant aggregation within a category
- Optional project tag chips on transactions

### Project tag integration

When a transaction in the drilldown is tagged to a project, display a subtle chip:
```
Mar 05   REI #35 Alderwood    🔨 Renovation    $372
```
Ties Projects back to Categories — demonstrates dual-attribution design.

---

## Section 4 — Insights

### Taxonomy (4 buckets)

1. **Surprise** — new merchants, unusually large charges, category spikes
2. **Concentration** — top category dominance, top-N merchants, account-level splits
3. **Behavior** — frequency, repeat patterns, timing
4. **Context** — MoM comparisons, baselines, soft-limit signals

### Priority (for ranking)

**Surprise > Concentration > Behavior > Context**

### Generation

Template-based for v1. Deterministic, cheap, consistent voice.

Generative (Claude API) is a v2 option, not v1.

### Ranking

Score = `category_weight × magnitude × freshness`

Top 3 scores win. No fixed slot reservation per category.

### Count

Always 3, all tiers. Better insights at higher tiers, not more.

### Voice guardrails

- ✅ *"You dined out 27 times this month — almost every day."*
- ❌ *"You should slow down your dining spend."*
- ❌ *"Switch to Chase for 5% back on dining."*
- ❌ No causal inference where only correlation exists

### Cleanup required

- Merchant name normalization: *"Trader Joe S #270"* → *"Trader Joe's"* (classifier-level fix)
- Icon standardization: each bucket gets consistent icons
- Confidence suppression: insights with thin data should be suppressed, not rephrased

### Interactions

- No dismiss/remind controls in v1
- Next-month load produces fresh insights organically

### Tier degradation

| Tier | Available buckets | Count |
|---|---|---|
| 1 | Surprise, Concentration, Behavior | 3 |
| 2 | All + partial Context | 3 |
| 3 | All + full Context with comparisons | 3 |

---

## Section 5 — Recurring expenses

Collapsed accordion at bottom of dashboard. Expandable on click.

- Shows total recurring + count + subscription count
- Expands to show recurring items list
- Edit/remove available within expanded state

Rationale for demotion: recurring is control-flavored, not awareness-flavored. Available when users care; out of the way when they don't.

---

## Section 6 — Monthly trend

### Visibility rules

| Tier | Display |
|---|---|
| 1 (1 month) | Hidden. Show CTA: *"Upload another month to see trends."* |
| 2 (2 months) | 2-bar minimal chart. No percentage comparison. |
| 3 (3+ months) | Full trend chart with percentage comparisons. |

### Placement

Bottom of dashboard. Weakest-value section at Tier 1–2, so honest placement is last.

### Chart decoupling

Chart visibility is tied to months-available.
Comparison pill is tied to comparability-of-the-immediate-prior-month.

These are independent. Chart may show sparse months; pills may not.

---

## Section 7 — Budget as contextual signal

Budget is not a dashboard surface. It's an opt-in signal delivered through the Insights panel.

### User flow

1. User sets soft limit via category drawer (Section 3)
2. Limit is silently tracked
3. When significant thresholds are crossed, an insight surfaces
4. No dedicated budget page or widget in v1

### Templates

**Approaching:**
- Trigger: category with soft limit AND current spend ≥80% AND ≥3 days remaining in month
- Copy: *"You're at 90% of your Dining soft limit with 8 days left this month."*

**Exceeded:**
- Trigger: category with soft limit AND current spend > limit
- Copy: *"Your Dining spend is 15% above your soft limit this month."*
- Use overage phrasing ("15% above"), not percentage-of-base ("115% of")

### Priority floor

Exceeded-limit insights get a scoring boost proportional to overage:

| Overage | Priority boost |
|---|---|
| 10–25% above | Normal Context priority |
| 25–50% above | Floor = top 3 guaranteed |
| >50% above | Floor = top 2 guaranteed |

Protects user trust when they've explicitly asked for warnings.

### Vocabulary

- Use "soft limit" consistently
- Never use "budget" in user-facing copy
- No "slow down," "watch out," "consider" — observational only

### Explicit non-features (v1)

- ❌ Budget health score or composite metric
- ❌ Envelope budgeting
- ❌ Monthly budget planning flow
- ❌ Per-week sub-limits
- ❌ Rollover accounting
- ❌ Dedicated budget page

### v2 path

- Subtle inline indicator on category row when exceeded
- "View all soft limits" aggregated view

---

## What gets deleted

1. "Over Budget" hero card
2. "Where It Goes" hero card (replaced by Section 2)
3. Pie chart "Where your money went"
4. Budget-by-category table
5. "Showing real spending only" disclaimer banner
6. Per-category "Set limit" buttons (relocated into category drawer)

Net: ~400 LoC removed from Dashboard.jsx.

---

## Backend extensions

### Extended `/dashboard-summary` payload

Add to existing contract:

```json
{
  "account_breakdown": {
    "show": true,
    "reason": null,
    "accounts": [
      { "label": "Amex", "amount": 2100, "pct": 49, "txn_count": 42 },
      { "label": "BofA", "amount": 1500, "pct": 35, "txn_count": 31 },
      { "label": "Chase", "amount": 672, "pct": 16, "txn_count": 20 }
    ],
    "primary_label": "Amex"
  },
  "category_breakdown": [
    {
      "category": "Shopping",
      "amount": 1350,
      "pct": 32,
      "txn_count": 14,
      "top_transactions": [...],
      "insight": "Most spend was at REI and UNIQLO"
    }
  ]
}
```

### New reason enum values

Extend existing enum:
- `single_account`
- `insignificant_secondary`
- `sparse_secondary`

### New endpoints

None required. All data flows through extended `/dashboard-summary`.

---

## Phased build plan

### Phase 1 — Foundation (2–3 days)

- Hero KPIs (Section 1)
- Discretionary vs Fixed (Section 2)
- Delete: Over Budget card, Where It Goes card, pie chart, budget table
- Net frontend: ~180 LoC added, ~300 LoC removed

**Shippable independently.** Dashboard is visibly better, simpler.

### Phase 2 — Differentiation (2–3 days)

- Category drilldown core component (Section 3)
- Top transactions + relative bars
- Soft limit placeholder affordance
- ~250 LoC frontend, ~40 LoC backend

**Shippable independently.** Signature feature in place.

### Phase 3 — Magic (1–2 days)

- Insights system refactor (4 buckets, scoring, priority floor)
- Drawer interpretive insight line (Section 3, one of 5 templates)
- Merchant name normalization
- ~30 LoC frontend, ~150 LoC backend

**Shippable independently.** Product feels intelligent.

### Phase 4 — Polish (1–2 days, later)

- Spending by Account section (Section 2.5)
- Soft-limit insight templates (Section 7)
- Trend chart handling (hide at Tier 1)
- Recurring accordion demotion
- ~100 LoC frontend, ~70 LoC backend

---

## Implementation guardrails

1. **Do not skip deletions.** Adding new components without removing old ones creates two dashboards fused together.

2. **Do not leak MoM into categories in v1.** Category drawer has zero MoM references until v2.

3. **Do not build generative insights before templates.** Templates are the base layer. Generative is a v2 option.

4. **Do not add dismiss/remind controls to insights in v1.** Adds state complexity for low user value.

5. **Do not moralize in any copy.** If a sentence could read as advice or judgment, rewrite it.

---

## Open questions for future iteration

- Should tier-3 users see 5 insights instead of 3? (Current decision: no, same count, better quality.)
- Should soft limits rollover between months? (Current decision: no, silent monthly reset.)
- Should the dashboard support a "compare to average user" benchmark? (Current decision: not in v1, conflicts with awareness-first.)
- Should card optimization ("move groceries to Chase Freedom for 5%") ever ship? (Current decision: deferred, belongs on a separate opt-in surface.)

---

## References

- Session conversation: April 2026 design review
- Existing tier-aware endpoint: `/dashboard-summary` (implemented)
- Existing project tagging: `tx_to_dict` includes `project_id` (implemented)
- Existing budget infrastructure: `/budget-history`, `budget_amount` field (reuseable for soft limits)
