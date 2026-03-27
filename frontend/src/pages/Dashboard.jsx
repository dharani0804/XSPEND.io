import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const COLORS = ['#1a56db','#0d9268','#e3a008','#7e3af2','#0694a2','#c81e1e','#8b8fa8','#057a55','#f97316','#0891b2']

// Card credits — excluded from both income and spending
const CARD_CREDIT_KEYWORDS = [
  'uber one credit','amex credit','credit applied','statement credit',
  'annual credit','travel credit','hotel credit','airline credit',
  'reward credit','cash back','cashback','rewards redemption',
  'capitol one credit','capital one credit','membership credit',
]

function isCardCredit(tx) {
  const desc = (tx.description || '').toLowerCase()
  return CARD_CREDIT_KEYWORDS.some(k => desc.includes(k)) && tx.amount > 0
}

function getGreeting() {
  const hr = new Date().getHours()
  return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
}

function filterTx(transactions, view, customStart, customEnd) {
  const now = new Date()
  let start, end
  if (view === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0) }
  else if (view === 'lastmonth') { start = new Date(now.getFullYear(), now.getMonth()-1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0) }
  else if (view === '3m') { start = new Date(now.getFullYear(), now.getMonth()-2, 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0) }
  else if (view === 'ytd') { start = new Date(now.getFullYear(), 0, 1); end = now }
  else if (view === 'custom' && customStart && customEnd) { start = new Date(customStart); end = new Date(customEnd) }
  else return transactions
  return transactions.filter(t => {
    if (!t.transaction_date) return false
    const d = new Date(t.transaction_date)
    return d >= start && d <= end
  })
}

function buildTrend(transactions, gran) {
  const map = {}
  transactions.forEach(t => {
    if (!t.transaction_date) return
    const d = new Date(t.transaction_date)
    let key
    if (gran === 'day') key = t.transaction_date
    else if (gran === 'week') key = `${t.transaction_date.slice(0,7)}-W${Math.ceil(d.getDate()/7)}`
    else if (gran === 'quarter') key = `${d.getFullYear()}-Q${Math.ceil((d.getMonth()+1)/3)}`
    else key = t.transaction_date.slice(0,7)
    if (!map[key]) map[key] = { label: key.slice(-5), Spend: 0 }
    // Only true expenses count in trend
    if (t.transaction_type === 'expense' && t.amount < 0 && !isCardCredit(t)) {
      map[key].Spend += Math.abs(t.amount)
    }
  })
  return Object.values(map)
    .sort((a,b) => a.label.localeCompare(b.label))
    .slice(-8)
    .map(d => ({ ...d, Spend: parseFloat(d.Spend.toFixed(2)) }))
}

const fmt = (n) => '$' + Math.round(n || 0).toLocaleString()
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1a1a2e', borderRadius:8, padding:'8px 12px' }}>
      <p style={{ color:'#8888aa', fontSize:11, marginBottom:4 }}>{label}</p>
      {payload.map((p,i) => <p key={i} style={{ color:p.color, fontSize:12, fontWeight:500 }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  )
}

// Inline editable profile field
function EditableKPI({ label, value, onSave, color, sub }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const save = () => { onSave(parseFloat(val) || 0); setEditing(false) }
  return (
    <div style={{ background:'#12121e', border:'1px solid #1e1e2e', borderRadius:14, padding:'16px 18px' }}>
      <div style={{ fontSize:11, color:'#6a6a8a', letterSpacing:'0.3px', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
      {editing ? (
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ color:'#4a4a6a', fontSize:16 }}>$</span>
          <input
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            style={{ background:'#0a0a0f', border:'1px solid #3b82f6', borderRadius:8, padding:'6px 10px', color:'#fff', fontSize:18, fontWeight:500, outline:'none', width:120, fontFamily:'inherit' }}
          />
          <button onClick={save} style={{ background:'#0d9268', color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ background:'none', border:'1px solid #2a2a3a', borderRadius:7, padding:'5px 8px', fontSize:11, cursor:'pointer', color:'#6a6a8a', fontFamily:'inherit' }}>✕</button>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'baseline', gap:8, cursor:'pointer' }} onClick={() => { setVal(value); setEditing(true) }}>
          <div style={{ fontSize:22, fontWeight:500, letterSpacing:'-0.5px', color }}>{fmt(value)}</div>
          <div style={{ fontSize:11, color:'#4a4a6a' }}>✎ edit</div>
        </div>
      )}
      {sub && <div style={{ fontSize:11, color:'#4a4a6a', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('month')
  const [gran, setGran] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [budgetMode, setBudgetMode] = useState('pct')
  const [debtOpen, setDebtOpen] = useState(false)
  const name = localStorage.getItem('user_name') || 'Your'

  useEffect(() => {
    Promise.all([
      fetch('http://127.0.0.1:8000/transactions').then(r => r.json()).catch(() => []),
      fetch('http://127.0.0.1:8000/profile').then(r => r.json()).catch(() => ({})),
    ]).then(([txs, prof]) => {
      setTransactions(Array.isArray(txs) ? txs : [])
      setProfile(prof || {})
      if (prof?.full_name) localStorage.setItem('user_name', prof.full_name.split(' ')[0])
      setLoading(false)
    })
  }, [])

  const saveProfile = async (field, value) => {
    const updated = { ...profile, [field]: value }
    setProfile(updated)
    await fetch('http://127.0.0.1:8000/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    }).catch(() => {})
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400, fontFamily:'DM Sans, sans-serif', background:'#0a0a0f' }}>
      <p style={{ color:'#4a4a6a', fontSize:14 }}>Loading your finances...</p>
    </div>
  )

  if (!transactions.length) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:400, fontFamily:'DM Sans, sans-serif', background:'#0a0a0f', gap:12 }}>
      <div style={{ fontSize:40 }}>📊</div>
      <p style={{ color:'#fff', fontSize:16, fontWeight:500 }}>No transactions yet</p>
      <p style={{ color:'#6a6a8a', fontSize:13 }}>Upload a bank statement to see your dashboard</p>
      <Link to="/app/upload" style={{ background:'#2563eb', color:'#fff', padding:'9px 20px', borderRadius:10, textDecoration:'none', fontWeight:500, fontSize:13 }}>Upload File →</Link>
    </div>
  )

  // ── CORE RULES ──
  // Income = profile input only
  const monthlyIncome = profile?.income_amount || profile?.monthly_income || 0
  const multiplier = view === '3m' ? 3 : view === 'ytd' ? new Date().getMonth()+1 : view === 'lastmonth' ? 1 : 1
  const totalIncome = monthlyIncome * multiplier

  // Savings = profile input only
  const monthlySavings = profile?.savings_goal_monthly || profile?.monthly_savings_goal || 0
  const totalSavingsGoal = monthlySavings * multiplier

  // Debt = profile input only
  const debtGoal = profile?.debt_payoff_goal || 0

  // Budget = profile input only
  const monthlyBudget = profile?.monthly_budget || 0
  const periodBudget = monthlyBudget * multiplier

  // Filter transactions by date
  const filtered = filterTx(transactions, view, customStart, customEnd)

  // Expenses = only expense type, negative amount, NOT card credits
  const expenseTxs = filtered.filter(t =>
    t.transaction_type === 'expense' &&
    t.amount < 0 &&
    !isCardCredit(t)
  )
  const totalExpenses = expenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0)

  // Card credits — shown separately, excluded from everything
  const cardCredits = filtered.filter(t => isCardCredit(t))
  const totalCardCredits = cardCredits.reduce((s, t) => s + t.amount, 0)

  // Net remaining
  const remaining = totalIncome > 0
    ? totalIncome - totalExpenses
    : -totalExpenses
  const budgetUsed = periodBudget > 0 ? pct(totalExpenses, periodBudget) : 0
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0

  // Category breakdown — expenses only
  const catMap = expenseTxs.reduce((acc, t) => {
    const cat = t.category || 'Other'
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
    return acc
  }, {})
  const catEntries = Object.entries(catMap)
    .map(([name, val]) => ({ name, val: parseFloat(val.toFixed(2)) }))
    .sort((a, b) => b.val - a.val)
  const donutData = catEntries.slice(0, 8).map((c, i) => ({ name: c.name, value: c.val, fill: COLORS[i % COLORS.length] }))

  // Budget rows
  const budgetRows = catEntries.slice(0, 7).map(c => ({
    cat: c.name,
    actual: c.val,
    budget: periodBudget > 0
      ? parseFloat((periodBudget / Math.max(catEntries.length, 1)).toFixed(2))
      : parseFloat((c.val * 1.2).toFixed(2))
  }))

  // Trend
  const trendData = buildTrend(filtered, gran)

  // Period label
  const now = new Date()
  const periodLabels = {
    month: now.toLocaleDateString('en-US', { month:'long', year:'numeric' }),
    lastmonth: 'Last month',
    '3m': 'Last 3 months',
    ytd: `${now.getFullYear()} YTD`,
    custom: customStart && customEnd ? `${customStart} → ${customEnd}` : 'Custom',
    all: 'All time',
  }

  const S = {
    page: { padding:'24px 40px 48px', maxWidth:1200, margin:'0 auto', fontFamily:'DM Sans, Inter, sans-serif', background:'#0a0a0f', minHeight:'100vh' },
    card: { background:'#12121e', border:'1px solid #1e1e2e', borderRadius:14, padding:'18px 20px' },
    cardTitle: { fontSize:13, fontWeight:500, color:'#fff', marginBottom:4 },
    cardSub: { fontSize:11, color:'#6a6a8a', marginBottom:16 },
    filterBtn: (a) => ({ padding:'6px 13px', borderRadius:8, border:a?'none':'0.5px solid #2a2a3a', background:a?'#2563eb':'#12121e', color:a?'#fff':'#6a6a8a', fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }),
    granBtn: (a) => ({ padding:'3px 10px', borderRadius:4, border:'0.5px solid #2a2a3a', background:a?'#1e1e2e':'#12121e', color:a?'#fff':'#6a6a8a', fontSize:11, cursor:'pointer', fontFamily:'inherit' }),
    toggleBtn: (a) => ({ padding:'3px 10px', borderRadius:4, border:'0.5px solid #2a2a3a', background:a?'#1e1e2e':'#12121e', color:a?'#fff':'#6a6a8a', fontSize:11, cursor:'pointer', fontFamily:'inherit' }),
  }

  return (
    <div style={{ background:'#0a0a0f', minHeight:'100vh' }}>
    <div style={S.page}>

      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:12, color:'#4a4a6a', marginBottom:2 }}>{getGreeting()}</div>
          <h1 style={{ fontSize:20, fontWeight:500, color:'#fff', letterSpacing:'-0.3px', marginBottom:4 }}>{name}'s dashboard</h1>
          <p style={{ fontSize:13, color:'#6a6a8a' }}>{periodLabels[view]} · {filtered.length} transactions</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
            {[['month','This month'],['lastmonth','Last month'],['3m','3 months'],['ytd','YTD'],['all','All time']].map(([key,label]) => (
              <button key={key} onClick={() => setView(key)} style={S.filterBtn(view===key)}>{label}</button>
            ))}
            <div style={{ width:'0.5px', height:22, background:'#2a2a3a', margin:'0 2px' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                style={{ padding:'4px 7px', borderRadius:6, border:'0.5px solid #2a2a3a', background:'#12121e', fontSize:10, color:'#6a6a8a', outline:'none', width:96, fontFamily:'inherit' }}/>
              <span style={{ fontSize:10, color:'#4a4a6a' }}>→</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                style={{ padding:'4px 7px', borderRadius:6, border:'0.5px solid #2a2a3a', background:'#12121e', fontSize:10, color:'#6a6a8a', outline:'none', width:96, fontFamily:'inherit' }}/>
              <button onClick={() => setView('custom')}
                style={{ padding:'4px 9px', borderRadius:6, border:'0.5px solid #2a2a3a', background:'#1e1e2e', fontSize:10, cursor:'pointer', fontFamily:'inherit', color:'#8888aa' }}>Apply</button>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:10, color:'#4a4a6a' }}>View by</span>
            {['day','week','month','quarter'].map(g => (
              <button key={g} onClick={() => setGran(g)} style={S.granBtn(gran===g)}>{g.charAt(0).toUpperCase()+g.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>

      {/* PROFILE NOTE */}
      {!profile?.income_amount && !profile?.monthly_income && (
        <div style={{ background:'rgba(227,160,8,0.08)', border:'1px solid rgba(227,160,8,0.2)', borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ color:'#e3a008', fontSize:13 }}>⚠ Income not set — click the income card below to add your monthly income</p>
        </div>
      )}

      {/* HERO KPIs — Income/Savings/Debt are profile-only, editable inline */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginBottom:16 }}>

        <EditableKPI
          label="Monthly income"
          value={monthlyIncome}
          color="#0d9268"
          sub="From your profile · click to edit"
          onSave={v => saveProfile('income_amount', v)}
        />

        <div style={{ background:'#12121e', border:'1px solid #1e1e2e', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:11, color:'#6a6a8a', letterSpacing:'0.3px', textTransform:'uppercase', marginBottom:8 }}>Total expenses</div>
          <div style={{ fontSize:22, fontWeight:500, letterSpacing:'-0.5px', color:'#c81e1e', marginBottom:4 }}>{fmt(totalExpenses)}</div>
          <span style={{ display:'inline-flex', fontSize:11, padding:'2px 7px', borderRadius:4, fontWeight:500, background:'rgba(200,30,30,0.1)', color:'#c81e1e' }}>
            {expenseTxs.length} transactions
          </span>
          <div style={{ fontSize:11, color:'#4a4a6a', marginTop:4 }}>Purchases only · card credits excluded</div>
        </div>

        <EditableKPI
          label="Monthly savings goal"
          value={monthlySavings}
          color="#1a56db"
          sub={totalIncome > 0 ? `${savingsRate.toFixed(0)}% of income saved` : 'Set income to see rate'}
          onSave={v => saveProfile('savings_goal_monthly', v)}
        />

        <div style={{ background:'#12121e', border:'1px solid #1e1e2e', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:11, color:'#6a6a8a', letterSpacing:'0.3px', textTransform:'uppercase', marginBottom:8 }}>Net remaining</div>
          <div style={{ fontSize:22, fontWeight:500, letterSpacing:'-0.5px', color:remaining>=0?'#0d9268':'#c81e1e', marginBottom:4 }}>
            {remaining >= 0 ? fmt(remaining) : `-${fmt(Math.abs(remaining))}`}
          </div>
          <span style={{ display:'inline-flex', fontSize:11, padding:'2px 7px', borderRadius:4, fontWeight:500, background:'rgba(255,255,255,0.05)', color:'#6a6a8a' }}>
            {totalIncome > 0 ? `Income − Expenses` : 'Set income above'}
          </span>
          <div style={{ fontSize:11, color:'#4a4a6a', marginTop:4 }}>{periodBudget > 0 ? `Budget: ${fmt(periodBudget)}` : 'No budget set'}</div>
        </div>
      </div>

      {/* Card credits info strip */}
      {cardCredits.length > 0 && (
        <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:10, padding:'10px 16px', marginBottom:12, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ color:'#8b5cf6', fontSize:12, fontWeight:500 }}>💳 Card credits excluded from spending</span>
          <span style={{ color:'#6a6a8a', fontSize:12 }}>{cardCredits.length} credits totalling {fmt(totalCardCredits)} — Uber One, Amex credits etc.</span>
        </div>
      )}

      {/* Budget progress */}
      {periodBudget > 0 && (
        <div style={{ ...S.card, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:500, color:'#fff' }}>Budget used</span>
            <span style={{ fontSize:12, fontWeight:500, color:budgetUsed>100?'#c81e1e':budgetUsed>80?'#e3a008':'#0d9268', fontFamily:'monospace' }}>
              {budgetUsed}% of {fmt(periodBudget)}
            </span>
          </div>
          <div style={{ background:'#1e1e2e', borderRadius:99, height:8, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, width:`${Math.min(budgetUsed,100)}%`, background:budgetUsed>100?'#c81e1e':budgetUsed>80?'#e3a008':'#0d9268', transition:'width 0.5s ease' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:5, fontSize:11, color:'#4a4a6a' }}>
            <span>$0</span>
            <span>{fmt(totalExpenses)} spent · {fmt(Math.max(0, periodBudget-totalExpenses))} remaining</span>
            <span>{fmt(periodBudget)}</span>
          </div>
        </div>
      )}

      {/* DONUT + BUDGET */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:10, marginBottom:10 }}>

        <div style={S.card}>
          <div style={S.cardTitle}>Spending breakdown</div>
          <div style={S.cardSub}>Expenses only · card credits excluded</div>
          {donutData.length > 0 ? (
            <>
              <div style={{ position:'relative', width:130, height:130, margin:'0 auto 14px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {donutData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>{fmt(totalExpenses)}</div>
                  <div style={{ fontSize:10, color:'#6a6a8a' }}>spent</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {catEntries.slice(0,8).map((c,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', fontSize:12 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i%COLORS.length], flexShrink:0 }}/>
                    <span style={{ color:'#6a6a8a', marginLeft:7, flex:1 }}>{c.name}</span>
                    <span style={{ fontWeight:500, color:'#fff', fontFamily:'monospace', fontSize:11 }}>{fmt(c.val)}</span>
                    <span style={{ color:'#4a4a6a', fontSize:11, marginLeft:5, fontFamily:'monospace' }}>{pct(c.val,totalExpenses)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#4a4a6a', fontSize:13 }}>No expenses in this period</div>
          )}
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Budget tracking</div>
          <div style={S.cardSub}>Actual spending by category</div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:4, marginBottom:12 }}>
            <button onClick={() => setBudgetMode('pct')} style={S.toggleBtn(budgetMode==='pct')}>%</button>
            <button onClick={() => setBudgetMode('dollar')} style={S.toggleBtn(budgetMode==='dollar')}>$</button>
          </div>
          {budgetRows.length > 0 ? budgetRows.map((r,i) => {
            const p = Math.min(pct(r.actual, r.budget), 200)
            const over = r.actual > r.budget
            const color = over ? '#c81e1e' : p > 85 ? '#e3a008' : '#0d9268'
            const label = budgetMode === 'pct' ? pct(r.actual,r.budget)+'%' : fmt(r.actual)+' / '+fmt(r.budget)
            return (
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'#c0c0d8' }}>
                    {r.cat}
                    {over && <span style={{ fontSize:10, color:'#c81e1e', background:'rgba(200,30,30,0.1)', padding:'1px 5px', borderRadius:3, marginLeft:5 }}>over</span>}
                  </span>
                  <span style={{ fontSize:11, color:'#6a6a8a', fontFamily:'monospace' }}>{label}</span>
                </div>
                <div style={{ background:'#1e1e2e', borderRadius:99, height:6, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, width:`${Math.min(p,100)}%`, background:color, transition:'width 0.4s ease' }}/>
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#4a4a6a', fontSize:13 }}>No spending data</div>
          )}
        </div>
      </div>

      {/* TREND + DEBT */}
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:10, marginBottom:10 }}>

        <div style={S.card}>
          <div style={S.cardTitle}>Spending trend</div>
          <div style={S.cardSub}>{gran.charAt(0).toUpperCase()+gran.slice(1)}ly · expenses only</div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false}/>
                <XAxis dataKey="label" tick={{ fill:'#4a4a6a', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#4a4a6a', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="Spend" stroke="#c81e1e" strokeWidth={2} dot={{ fill:'#c81e1e', r:3 }} name="Expenses"/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#4a4a6a', fontSize:13 }}>Not enough data</div>
          )}
        </div>

        {/* Debt + Savings from profile */}
        <div style={S.card}>
          <div style={S.cardTitle}>Goals</div>
          <div style={S.cardSub}>From your profile · click to edit</div>

          {/* Savings goal */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#c0c0d8' }}>Monthly savings goal</span>
              <span style={{ fontSize:12, fontWeight:500, color:'#1a56db', fontFamily:'monospace' }}>{fmt(monthlySavings)}</span>
            </div>
            <div style={{ background:'#1e1e2e', borderRadius:99, height:6, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, width:`${Math.min(pct(Math.max(0,totalIncome-totalExpenses), monthlySavings||1), 100)}%`, background:'#1a56db' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:11, color:'#4a4a6a' }}>
              <span>Saved: {fmt(Math.max(0, totalIncome - totalExpenses))}</span>
              <span>Goal: {fmt(monthlySavings)}</span>
            </div>
          </div>

          {/* Debt goal */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#c0c0d8' }}>Debt payoff goal</span>
              <span style={{ fontSize:12, fontWeight:500, color:'#c81e1e', fontFamily:'monospace' }}>{fmt(debtGoal)}</span>
            </div>
            <div style={{ background:'#1e1e2e', borderRadius:99, height:6, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, width:'35%', background:'#c81e1e' }}/>
            </div>
          </div>

          {/* Edit goals link */}
          <div style={{ borderTop:'1px solid #1e1e2e', paddingTop:12, display:'flex', gap:8 }}>
            <button onClick={() => saveProfile('savings_goal_monthly', parseFloat(prompt('New monthly savings goal:', monthlySavings)||monthlySavings))}
              style={{ flex:1, background:'#1e1e2e', border:'1px solid #2a2a3a', borderRadius:8, padding:'7px', fontSize:11, cursor:'pointer', color:'#8888aa', fontFamily:'inherit' }}>
              ✎ Edit savings goal
            </button>
            <button onClick={() => saveProfile('debt_payoff_goal', parseFloat(prompt('Total debt to pay off:', debtGoal)||debtGoal))}
              style={{ flex:1, background:'#1e1e2e', border:'1px solid #2a2a3a', borderRadius:8, padding:'7px', fontSize:11, cursor:'pointer', color:'#8888aa', fontFamily:'inherit' }}>
              ✎ Edit debt goal
            </button>
          </div>
        </div>
      </div>

      {/* INSIGHTS */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#6a6a8a', marginBottom:8 }}>Insights</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10 }}>
          {[
            totalIncome > 0 && { type:'info', icon:'💰', title:`${savingsRate.toFixed(0)}% savings rate`, body:`You saved ${fmt(Math.max(0,totalIncome-totalExpenses))} of ${fmt(totalIncome)} income this period.` },
            catEntries[0] && { type:'info', icon:'📊', title:`Top spend: ${catEntries[0].name}`, body:`${fmt(catEntries[0].val)} — ${pct(catEntries[0].val,totalExpenses)}% of total expenses.` },
            cardCredits.length > 0 && { type:'good', icon:'💳', title:`${cardCredits.length} card credits excluded`, body:`${fmt(totalCardCredits)} in card credits excluded from spending. These don't count as income.` },
            remaining < 0 && { type:'warn', icon:'⚠', title:'Spending exceeds income', body:`You spent ${fmt(Math.abs(remaining))} more than your income this period.` },
            remaining > 0 && totalIncome > 0 && { type:'good', icon:'✓', title:`${fmt(remaining)} left this period`, body:`After expenses, you have ${fmt(remaining)} remaining from ${fmt(totalIncome)} income.` },
            periodBudget > 0 && budgetUsed > 90 && { type:'warn', icon:'↑', title:`${budgetUsed}% of budget used`, body:`You've used ${fmt(totalExpenses)} of your ${fmt(periodBudget)} budget.` },
            { type:'info', icon:'📅', title:`${expenseTxs.length} expense transactions`, body:`Across ${Object.keys(catMap).length} spending categories in this period.` },
          ].filter(Boolean).slice(0,6).map((ins,i) => {
            const borderColor = ins.type==='warn'?'#e3a008':ins.type==='good'?'#0d9268':'#1a56db'
            return (
              <div key={i} style={{ ...S.card, borderLeft:`2px solid ${borderColor}`, borderRadius:'0 14px 14px 0', padding:'14px 16px' }}>
                <div style={{ fontSize:13, marginBottom:7 }}>{ins.icon}</div>
                <div style={{ fontSize:12, fontWeight:500, color:'#fff', marginBottom:4, lineHeight:1.4 }}>{ins.title}</div>
                <div style={{ fontSize:11, color:'#6a6a8a', lineHeight:1.5 }}>{ins.body}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* DEBT JOURNEY */}
      <div style={{ marginBottom:10 }}>
        <button onClick={() => setDebtOpen(o => !o)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', ...S.card, cursor:'pointer', textAlign:'left' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'rgba(200,30,30,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>⚡</div>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>Debt journey</div>
              <div style={{ fontSize:11, color:'#6a6a8a', marginTop:1 }}>Track payoff progress · based on your profile goal</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, fontWeight:500, color:'#c81e1e', fontFamily:'monospace' }}>{fmt(debtGoal)} goal</span>
            <span style={{ fontSize:11, color:'#4a4a6a', transform:debtOpen?'rotate(180deg)':'none', transition:'transform 0.2s', display:'inline-block' }}>▼</span>
          </div>
        </button>
        {debtOpen && (
          <div style={{ ...S.card, borderRadius:'0 0 14px 14px', marginTop:-4, paddingTop:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[['Debt goal',fmt(debtGoal),'#c81e1e'],['Monthly budget',fmt(monthlyBudget),'#1a56db'],['Savings goal',fmt(monthlySavings)+'/mo','#0d9268']].map(([l,v,c],i) => (
                <div key={i} style={{ background:'#1e1e2e', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, color:'#4a4a6a', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{l}</div>
                  <div style={{ fontSize:18, fontWeight:500, color:c }}>{v}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize:12, color:'#6a6a8a' }}>
            </p>
          </div>
        )}
      </div>

      {/* RECENT TRANSACTIONS */}
      <div style={S.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>Recent transactions</div>
            <div style={{ fontSize:11, color:'#4a4a6a' }}>{expenseTxs.length} expenses · {cardCredits.length} card credits excluded</div>
          </div>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'0.5px solid #1e1e2e' }}>
              {['Date','Description','Category','Amount'].map((h,i) => (
                <th key={h} style={{ padding:'8px 12px', color:'#4a4a6a', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px', textAlign:i===3?'right':'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0,20).map((t,i) => {
              const cc = isCardCredit(t)
              return (
                <tr key={i} style={{ borderBottom:'0.5px solid #1a1a2a', opacity:cc?0.4:1 }}>
                  <td style={{ padding:'10px 12px', color:'#6a6a8a', fontSize:12 }}>{t.transaction_date}</td>
                  <td style={{ padding:'10px 12px', color:cc?'#4a4a6a':'#c0c0d8' }}>
                    {t.description}
                    {cc && <span style={{ marginLeft:6, fontSize:10, color:'#8b5cf6', background:'rgba(139,92,246,0.1)', padding:'1px 5px', borderRadius:3 }}>card credit</span>}
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ background:'#1e1e2e', color:'#6a6a8a', fontSize:11, padding:'2px 8px', borderRadius:4 }}>{t.category}</span>
                  </td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:500, color:cc?'#8b5cf6':t.amount>=0?'#0d9268':'#c81e1e', fontFamily:'monospace' }}>
                    {t.amount>=0?'+':'-'}${Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
    </div>
  )
}
