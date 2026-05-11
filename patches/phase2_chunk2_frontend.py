#!/usr/bin/env python3
"""
Phase 2, Chunk 2 — frontend category list view.

Adds:
- Updated CAT_ICONS with full 29-category canonical set
- New "SPENDING BY CATEGORY" section below Discretionary vs Fixed
- Category rows: emoji, name, amount, relative bar, pct, chevron
- Others row: collapses categories < 2% pct_of_flexible
- Chevron is visual only (no expansion yet — that's Chunk 3)

Run from project root:
    cd ~/Desktop/financeai
    python3 patches/phase2_chunk2_frontend.py
"""

import re
from pathlib import Path

ROOT = Path('/Users/dharanireddy/Desktop/financeai')
PATH = ROOT / 'frontend' / 'src' / 'pages' / 'Dashboard.jsx'

with open(PATH) as f:
    s = f.read()

# Sanity check — confirm we haven't already applied
if 'SPENDING BY CATEGORY' in s:
    print('ABORT — patch already applied (SPENDING BY CATEGORY exists)')
    raise SystemExit(1)

# ── Edit 1: replace CAT_ICONS with full canonical 29 ──
old_icons = """const CAT_ICONS = {
  'Food & Dining':'🍽️','Groceries':'🛒','Transport':'🚗','Rent & Utilities':'⚡',
  'Subscriptions':'📱','Health':'💊','Shopping':'🛍️','Entertainment':'🎬',
  'Travel':'✈️','Personal Care':'💆','Pets':'🐾','Education':'📚',
  'Salary':'💰','Transfer':'↔️','Payment':'💳','Other':'📦',
  'Others':'📦','Uncategorized':'❓'
}"""

new_icons = """const CAT_ICONS = {
  // Core expense categories
  'Food & Dining':'🍽️','Groceries':'🛒','Transport':'🚗','Bills & Utilities':'⚡',
  'Subscriptions':'📱','Health':'💊','Shopping':'🛍️','Entertainment':'🎬',
  'Travel':'✈️','Personal Care':'💆','Pets':'🐾','Education':'📚',
  // Added in canonical 29
  'Alcohol & Liquor':'🍷','Baby & Kids':'🍼','Bank Fees':'🏦','Cash & ATM':'💵',
  'Gifts & Donations':'🎁','Government & Taxes':'🏛️','Home Improvement':'🔨',
  'Insurance':'🛡️','Professional Services':'💼',
  // Income, transfers, payments, misc
  'Salary':'💰','Other Income':'💵','Transfer':'↔️',
  'Credit Card Payment':'💳','Card Credit':'↩️','Loan Payment':'📉',
  'Refund':'↩️','Other':'📦',
  // Aliases / safety
  'Others':'📦','Payment':'💳','Uncategorized':'❓'
}"""

if s.count(old_icons) != 1:
    print(f'ABORT — CAT_ICONS anchor matched {s.count(old_icons)} times')
    raise SystemExit(1)

s = s.replace(old_icons, new_icons, 1)
print('  ✓ updated CAT_ICONS with canonical 29 categories')

# ── Edit 2: insert the SPENDING BY CATEGORY section ──
# Anchor: right after the Discretionary vs Fixed section closes, before SPENDING EXPLANATION
anchor = """        {/* SPENDING EXPLANATION */}
        <SpendingExplanation expTotal={totalExp} cardPmts={cardPmts} transfers={transfers} credits={credits} acctFilter={acctFilter}/>"""

new_section = """        {/* SPENDING BY CATEGORY — Section 3, Phase 2 (Chunk 2: collapsed list) */}
        {summary?.current_month?.categories && summary.current_month.categories.length > 0 && (() => {
          const cats = summary.current_month.categories
          // Split into shown + others (< 2% pct_of_flexible)
          const shown = cats.filter(c => c.pct_of_flexible >= 2)
          const others = cats.filter(c => c.pct_of_flexible < 2)
          const othersTotal = others.reduce((s, c) => s + c.amount, 0)
          const othersCount = others.reduce((s, c) => s + c.txn_count, 0)
          const othersPct = others.reduce((s, c) => s + c.pct_of_flexible, 0)
          // Top amount for relative-bar scaling (uses the largest category, NOT total)
          const topAmount = cats[0]?.amount || 1
          return (
            <div style={{background:'#0f1117',border:'1px solid #1e2030',borderRadius:18,padding:'24px 26px',marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:18}}>
                <p style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1.2px'}}>
                  Spending by category
                </p>
                <span style={{fontSize:12,color:'#475569'}}>
                  {shown.length} categor{shown.length === 1 ? 'y' : 'ies'} · flexible only
                </span>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {shown.map((c, i) => {
                  const barPct = Math.max(2, Math.round((c.amount / topAmount) * 100))
                  const icon = CAT_ICONS[c.name] || '📦'
                  return (
                    <div
                      key={c.name}
                      style={{
                        display:'grid',
                        gridTemplateColumns:'28px 1fr 90px 180px 50px 20px',
                        gap:14,
                        alignItems:'center',
                        padding:'12px 8px',
                        borderRadius:10,
                        cursor:'pointer',
                        transition:'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#151720'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { /* expansion lives in Chunk 3 */ }}
                    >
                      <span style={{fontSize:18}}>{icon}</span>
                      <span style={{fontSize:14,color:'#f1f5f9',fontWeight:500}}>{c.name}</span>
                      <span style={{fontSize:14,fontWeight:700,color:'#10b981',fontFamily:'monospace',textAlign:'right'}}>
                        {fmt(c.amount)}
                      </span>
                      <div style={{background:'#1a1f2e',borderRadius:99,height:6,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${barPct}%`,background:'linear-gradient(90deg,#3b82f6,#6366f1)',transition:'width 0.5s'}}/>
                      </div>
                      <span style={{fontSize:13,color:'#64748b',textAlign:'right'}}>{Math.round(c.pct_of_flexible)}%</span>
                      <span style={{fontSize:14,color:'#475569',textAlign:'center'}}>›</span>
                    </div>
                  )
                })}

                {others.length > 0 && (
                  <div
                    style={{
                      display:'grid',
                      gridTemplateColumns:'28px 1fr 90px 180px 50px 20px',
                      gap:14,
                      alignItems:'center',
                      padding:'12px 8px',
                      marginTop:6,
                      borderTop:'1px solid #1e2030',
                      paddingTop:14,
                      cursor:'pointer',
                      borderRadius:10,
                      transition:'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#151720'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{fontSize:16}}>📦</span>
                    <span style={{fontSize:13,color:'#94a3b8'}}>
                      Others <span style={{color:'#475569',marginLeft:6}}>· {others.length} categor{others.length === 1 ? 'y' : 'ies'} · {othersCount} txn{othersCount === 1 ? '' : 's'}</span>
                    </span>
                    <span style={{fontSize:13,fontWeight:700,color:'#10b981',fontFamily:'monospace',textAlign:'right'}}>
                      {fmt(othersTotal)}
                    </span>
                    <div style={{background:'#1a1f2e',borderRadius:99,height:4,overflow:'hidden',opacity:0.6}}>
                      <div style={{height:'100%',width:`${Math.max(2, Math.round((othersTotal / topAmount) * 100))}%`,background:'#475569',transition:'width 0.5s'}}/>
                    </div>
                    <span style={{fontSize:12,color:'#475569',textAlign:'right'}}>{Math.round(othersPct)}%</span>
                    <span style={{fontSize:14,color:'#475569',textAlign:'center'}}>›</span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* SPENDING EXPLANATION */}
        <SpendingExplanation expTotal={totalExp} cardPmts={cardPmts} transfers={transfers} credits={credits} acctFilter={acctFilter}/>"""

if s.count(anchor) != 1:
    print(f'ABORT — SPENDING EXPLANATION anchor matched {s.count(anchor)} times')
    raise SystemExit(1)

s = s.replace(anchor, new_section, 1)
print('  ✓ inserted SPENDING BY CATEGORY section')

with open(PATH, 'w') as f:
    f.write(s)

print()
print('Done. Vite should hot-reload. Refresh the dashboard to see the new section.')
