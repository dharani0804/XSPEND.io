#!/usr/bin/env python3
"""
Phase 2, Chunk 1 — extend _month_totals to include per-category drilldown data.

Adds:
- _top_transactions(transactions, n=5): formats top N transactions for API
- _category_insight(transactions, category_name): picks 1 of 7 templates
- Per-category block in _month_totals return: amount, pct, count, avg, top_transactions, insight

Run from project root:
    cd ~/Desktop/financeai
    python3 patches/phase2_chunk1_backend.py
"""

import re
from pathlib import Path

ROOT = Path('/Users/dharanireddy/Desktop/financeai')
PATH = ROOT / 'backend' / 'main.py'

with open(PATH) as f:
    s = f.read()

# Sanity check — confirm we haven't already applied this patch
if '_category_insight' in s:
    print('ABORT — patch already applied (_category_insight exists)')
    raise SystemExit(1)

# ── Edit 1: insert helper functions before _month_totals ────────────────────
helper_anchor = "def _month_totals(db: Session, ym: str) -> dict:"
if s.count(helper_anchor) != 1:
    print(f'ABORT — _month_totals anchor matched {s.count(helper_anchor)} times')
    raise SystemExit(1)

helpers = '''def _top_transactions(transactions: list, n: int = 5) -> list:
    """Return top N transactions by amount, formatted for the dashboard API.
    Each tx is a dict: {date, merchant, amount}.
    Merchant goes through display_merchant for clean output."""
    sorted_txs = sorted(transactions, key=lambda t: t['amount'], reverse=True)
    out = []
    for t in sorted_txs[:n]:
        clean = display_merchant(t['description'] or '') or 'Unknown'
        out.append({
            'date': t['date'],
            'merchant': clean[:80],
            'amount': round(t['amount'], 2),
        })
    return out


def _category_insight(transactions: list, category_name: str) -> dict:
    """Pick 1 interpretive insight from 7 templates, in priority order.
    Each template returns {"template": "<name>", "text": "<copy>"}.
    Returns fallback if nothing else fires.

    Priority (first match wins):
        1. single_merchant   — only 1 unique merchant
        2. dominance         — top txn > 50% of category
        3. burst             — >=40% spend within any 48hr window
        4. repeat_merchant   — one merchant appears >=3 times
        5. weekend           — >=70% spend on Sat+Sun
        6. concentration     — top 2 merchants > 40% combined
        7. fallback          — avg + range
    """
    if not transactions:
        return {'template': 'fallback', 'text': 'No transactions in this category.'}

    total = sum(t['amount'] for t in transactions)
    if total <= 0:
        return {'template': 'fallback', 'text': 'No spending in this category.'}

    # Group by clean merchant name
    from collections import defaultdict
    by_merchant = defaultdict(lambda: {'count': 0, 'amount': 0.0})
    for t in transactions:
        clean = display_merchant(t['description'] or '') or 'Unknown'
        by_merchant[clean]['count'] += 1
        by_merchant[clean]['amount'] += t['amount']

    merchants_by_spend = sorted(
        by_merchant.items(), key=lambda kv: kv[1]['amount'], reverse=True
    )
    merchants_by_count = sorted(
        by_merchant.items(),
        key=lambda kv: (kv[1]['count'], kv[1]['amount']),
        reverse=True,
    )

    # ── 1. Single-merchant — only one unique merchant ──
    if len(by_merchant) == 1:
        m_name = merchants_by_spend[0][0]
        return {
            'template': 'single_merchant',
            'text': f'All from one merchant: {m_name}.',
        }

    # ── 2. Dominance — top txn > 50% of category ──
    top_tx = max(transactions, key=lambda t: t['amount'])
    if top_tx['amount'] / total > 0.5 and len(transactions) > 1:
        m_name = display_merchant(top_tx['description'] or '') or 'Unknown'
        pct = round(top_tx['amount'] / total * 100)
        return {
            'template': 'dominance',
            'text': (
                f'One purchase made up most of this category: '
                f'{m_name} was {pct}% of {category_name} spend.'
            ),
        }

    # ── 3. Burst — >=40% spend within any 48hr window ──
    from datetime import datetime, timedelta
    dated_txs = []
    for t in transactions:
        if t.get('date'):
            try:
                dt = datetime.fromisoformat(str(t['date']))
                dated_txs.append((dt, t['amount']))
            except (ValueError, TypeError):
                pass

    if len(dated_txs) >= 2:
        dated_txs.sort(key=lambda x: x[0])
        # Sliding window: for each tx, sum amounts within 48hrs forward
        best_window_sum = 0
        best_window_start = None
        best_window_end = None
        for i, (dt_i, _) in enumerate(dated_txs):
            window_sum = 0
            window_end = dt_i
            for dt_j, amt_j in dated_txs[i:]:
                if dt_j - dt_i <= timedelta(hours=48):
                    window_sum += amt_j
                    window_end = dt_j
                else:
                    break
            if window_sum > best_window_sum:
                best_window_sum = window_sum
                best_window_start = dt_i
                best_window_end = window_end

        if best_window_sum / total >= 0.4 and best_window_start != best_window_end:
            start_str = best_window_start.strftime('%b %d').replace(' 0', ' ')
            end_str = best_window_end.strftime('%b %d').replace(' 0', ' ')
            # If same day, show one date only — but burst requires multi-day, this is safety
            if start_str == end_str:
                date_phrase = start_str
            else:
                end_day = best_window_end.strftime('%d').lstrip('0')
                date_phrase = f'{start_str}\u2013{end_day}'
            return {
                'template': 'burst',
                'text': f'Most spend happened in a 2-day burst around {date_phrase}.',
            }

    # ── 4. Repeat merchant — one merchant appears >=3 times ──
    top_count_merchant = merchants_by_count[0]
    if top_count_merchant[1]['count'] >= 3:
        m_name = top_count_merchant[0]
        n_times = top_count_merchant[1]['count']
        return {
            'template': 'repeat_merchant',
            'text': f'You visited {m_name} {n_times} times this month.',
        }

    # ── 5. Weekend — >=70% spend on Sat+Sun ──
    weekend_spend = 0
    for dt, amt in dated_txs:
        if dt.weekday() >= 5:  # 5=Sat, 6=Sun
            weekend_spend += amt
    if dated_txs and weekend_spend / total >= 0.7:
        return {
            'template': 'weekend',
            'text': f'Most {category_name} spend happened on weekends.',
        }

    # ── 6. Concentration — top 2 merchants > 40% combined ──
    if len(merchants_by_spend) >= 2:
        top2_sum = merchants_by_spend[0][1]['amount'] + merchants_by_spend[1][1]['amount']
        if top2_sum / total > 0.4:
            m1 = merchants_by_spend[0][0]
            m2 = merchants_by_spend[1][0]
            return {
                'template': 'concentration',
                'text': f'Most spend was at {m1} and {m2}.',
            }

    # ── 7. Fallback — avg + range ──
    amounts = [t['amount'] for t in transactions]
    avg = total / len(amounts)
    return {
        'template': 'fallback',
        'text': (
            f'Purchases ranged from ${round(min(amounts))} to ${round(max(amounts))}, '
            f'averaging ${round(avg)}.'
        ),
    }


'''

s = s.replace(helper_anchor, helpers + helper_anchor, 1)
print('  ✓ inserted _top_transactions + _category_insight helpers')

# ── Edit 2: update the per-category loop body to also collect transactions ──
old_loop = '''            flexible += amt
            cat = t.category or "Other"
            entry = flex_by_category.setdefault(cat, {"amount": 0.0, "count": 0})
            entry["amount"] += amt
            entry["count"] += 1
            if biggest is None or amt > biggest["amount"]:'''

new_loop = '''            flexible += amt
            cat = t.category or "Other"
            entry = flex_by_category.setdefault(
                cat, {"amount": 0.0, "count": 0, "transactions": []}
            )
            entry["amount"] += amt
            entry["count"] += 1
            entry["transactions"].append({
                "amount": amt,
                "description": t.description or "",
                "date": str(t.transaction_date) if t.transaction_date else None,
            })
            if biggest is None or amt > biggest["amount"]:'''

if s.count(old_loop) != 1:
    print(f'ABORT — loop anchor matched {s.count(old_loop)} times')
    raise SystemExit(1)

s = s.replace(old_loop, new_loop, 1)
print('  ✓ extended flex_by_category to collect transactions')

# ── Edit 3: build the categories array and add to return ──
old_return = '''    # Pick top category by flexible spend
    top_category = None
    if flex_by_category:
        name, info = max(flex_by_category.items(), key=lambda kv: kv[1]["amount"])
        pct = (info["amount"] / flexible * 100) if flexible > 0 else 0
        top_category = {
            "name": name,
            "amount": round(info["amount"], 2),
            "pct_of_flexible": round(pct, 1),
            "txn_count": info["count"],
        }

    return {
        "label": _month_label_long(ym),
        "ym": ym,
        "total": round(flexible + committed, 2),
        "flexible": round(flexible, 2),
        "committed": round(committed, 2),
        "txn_count": len(rows),
        "top_category": top_category,
        "biggest_charge": biggest,
    }'''

new_return = '''    # Pick top category by flexible spend
    top_category = None
    if flex_by_category:
        name, info = max(flex_by_category.items(), key=lambda kv: kv[1]["amount"])
        pct = (info["amount"] / flexible * 100) if flexible > 0 else 0
        top_category = {
            "name": name,
            "amount": round(info["amount"], 2),
            "pct_of_flexible": round(pct, 1),
            "txn_count": info["count"],
        }

    # Build per-category drilldown data (Phase 2)
    categories = []
    for name, info in flex_by_category.items():
        cat_pct = (info["amount"] / flexible * 100) if flexible > 0 else 0
        categories.append({
            "name": name,
            "amount": round(info["amount"], 2),
            "pct_of_flexible": round(cat_pct, 1),
            "txn_count": info["count"],
            "avg_amount": round(info["amount"] / info["count"], 2) if info["count"] > 0 else 0,
            "top_transactions": _top_transactions(info["transactions"]),
            "insight": _category_insight(info["transactions"], name),
        })
    categories.sort(key=lambda c: c["amount"], reverse=True)

    return {
        "label": _month_label_long(ym),
        "ym": ym,
        "total": round(flexible + committed, 2),
        "flexible": round(flexible, 2),
        "committed": round(committed, 2),
        "txn_count": len(rows),
        "top_category": top_category,
        "biggest_charge": biggest,
        "categories": categories,
    }'''

if s.count(old_return) != 1:
    print(f'ABORT — return anchor matched {s.count(old_return)} times')
    raise SystemExit(1)

s = s.replace(old_return, new_return, 1)
print('  ✓ added categories array to return value')

# Write back
with open(PATH, 'w') as f:
    f.write(s)

# Verify
import ast
try:
    ast.parse(open(PATH).read())
    print('  ✓ syntax OK')
except SyntaxError as e:
    print(f'  ✗ SYNTAX ERROR: {e}')
    raise SystemExit(1)

print()
print('All edits applied successfully.')
print('Next: restart uvicorn and curl /dashboard-summary to verify shape.')
