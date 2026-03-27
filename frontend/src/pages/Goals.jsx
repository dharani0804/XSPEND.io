import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

const fmt = (n) => '$' + Math.round(n || 0).toLocaleString()
const AVG_RATE = 0.12

function calcMonths(balance, payment) {
  if (!payment || payment <= 0) return 999
  let bal = balance, months = 0
  while (bal > 0 && months < 360) {
    bal = bal * (1 + AVG_RATE / 12) - payment
    months++
  }
  return months
}

function monthsToDate(n) {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function buildProjection(balance, basePayment, extraPayment) {
  const data = []
  let b1 = balance, b2 = balance
  for (let i = 0; i <= 36; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() + i)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    data.push({
      label,
      Current: Math.max(0, Math.round(b1)),
      Accelerated: Math.max(0, Math.round(b2)),
    })
    b1 = b1 * (1 + AVG_RATE / 12) - basePayment
    b2 = b2 * (1 + AVG_RATE / 12) - (basePayment + extraPayment)
    if (b1 < 0) b1 = 0
    if (b2 < 0) b2 = 0
  }
  return data
}

const DEBT_TYPES = ['Credit card', 'Auto loan', 'Student loan', 'Personal loan', 'Mortgage', 'Medical', 'Other']

const INSIGHTS = (debts, totalDebt, basePayment, extraPayment) => {
  const months = calcMonths(totalDebt, basePayment)
  const newMonths = calcMonths(totalDebt, basePayment + extraPayment)
  const saved = Math.max(0, months - newMonths)
  const highAPR = [...debts].sort((a, b) => (b.apr || 0) - (a.apr || 0))[0]
  return [
    highAPR && highAPR.apr > 10 && {
      type: 'warn', icon: '⚡',
      title: `Prioritise ${highAPR.name} first`,
      body: `At ${highAPR.apr}% APR it costs the most. Paying it off first saves the most in interest.`,
    },
    saved > 0 && {
      type: 'info', icon: '↑',
      title: `Adding $${extraPayment}/month cuts ${saved} month${saved !== 1 ? 's' : ''} off your timeline`,
      body: `Your payoff date moves from ${monthsToDate(months)} to ${monthsToDate(newMonths)}.`,
    },
    {
      type: 'good', icon: '✓',
      title: `You are on track for ${monthsToDate(months)}`,
      body: `At $${basePayment}/month you will be debt-free in ${months} months. Keep going.`,
    },
    totalDebt > 5000 && {
      type: 'info', icon: '◎',
      title: 'Avalanche method saves the most money',
      body: 'Pay minimums on all debts, then throw every extra dollar at the highest APR one first.',
    },
  ].filter(Boolean)
}

export default function Goals() {
  const [debts, setDebts] = useState([
    { id: 1, name: 'Chase Sapphire', type: 'Credit card', balance: 2969, originalBalance: 4500, apr: 19.49, minPayment: 40 },
    { id: 2, name: 'Auto loan', type: 'Auto loan', balance: 5451, originalBalance: 8500, apr: 6.9, minPayment: 280 },
  ])
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [newDebt, setNewDebt] = useState({ name: '', type: 'Credit card', balance: '', originalBalance: '', apr: '', minPayment: '' })
  const [extraPayment, setExtraPayment] = useState(0)
  const [diningCut, setDiningCut] = useState(0)
  const [profile, setProfile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editDebt, setEditDebt] = useState({})

  useEffect(() => {
    fetch('http://127.0.0.1:8000/profile').then(r => r.json()).then(setProfile).catch(() => {})
  }, [])

  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0)
  const totalOriginal = debts.reduce((s, d) => s + (d.originalBalance || d.balance || 0), 0)
  const totalPaid = totalOriginal - totalDebt
  const progressPct = totalOriginal > 0 ? Math.round(totalPaid / totalOriginal * 100) : 0
  const basePayment = debts.reduce((s, d) => s + (d.minPayment || 0), 0)
  const totalExtra = extraPayment + diningCut
  const months = calcMonths(totalDebt, basePayment)
  const newMonths = calcMonths(totalDebt, basePayment + totalExtra)
  const monthsSaved = Math.max(0, months - newMonths)
  const interestSaved = Math.round(monthsSaved * basePayment * 0.3)
  const projData = buildProjection(totalDebt, basePayment, totalExtra)
  const insights = INSIGHTS(debts, totalDebt, basePayment, totalExtra)

  const addDebt = () => {
    if (!newDebt.name || !newDebt.balance) return
    const bal = parseFloat(newDebt.balance) || 0
    setDebts(p => [...p, {
      id: Date.now(), name: newDebt.name, type: newDebt.type,
      balance: bal, originalBalance: parseFloat(newDebt.originalBalance) || bal,
      apr: parseFloat(newDebt.apr) || 0, minPayment: parseFloat(newDebt.minPayment) || 0,
    }])
    setNewDebt({ name: '', type: 'Credit card', balance: '', originalBalance: '', apr: '', minPayment: '' })
    setShowAddDebt(false)
  }

  const saveEdit = (id) => {
    setDebts(p => p.map(d => d.id === id ? { ...d, ...editDebt, balance: parseFloat(editDebt.balance)||d.balance, apr: parseFloat(editDebt.apr)||d.apr, minPayment: parseFloat(editDebt.minPayment)||d.minPayment } : d))
    setEditingId(null)
  }

  const removeDebt = (id) => setDebts(p => p.filter(d => d.id !== id))

  const S = {
    page: { padding: '32px 48px 48px', maxWidth: 1200, margin: '0 auto', fontFamily: 'DM Sans, Inter, sans-serif', background: '#0a0a0f', minHeight: '100vh' },
    card: { background: '#12121e', border: '1px solid #1e1e2e', borderRadius: 14, padding: '18px 20px' },
    label: { fontSize: 11, color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 },
    input: { background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' },
    select: { background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' },
    btn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
    btnSm: { background: 'none', border: '1px solid #2a2a3a', borderRadius: 7, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#8888aa', fontFamily: 'inherit' },
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '8px 12px', border: 'none' }}>
        <p style={{ color: '#8888aa', fontSize: 11, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color, fontSize: 12 }}>{p.name}: {fmt(p.value)}</p>)}
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Debt journey</h1>
        <p style={{ color: '#6a6a8a', fontSize: 13 }}>Track progress, see your payoff timeline, and find ways to get there faster</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total debt remaining', val: fmt(totalDebt), color: '#c81e1e', sub: `${debts.length} account${debts.length !== 1 ? 's' : ''}` },
          { label: 'Progress to payoff', val: `${progressPct}%`, color: '#0d9268', sub: `${fmt(totalPaid)} of ${fmt(totalOriginal)} paid` },
          { label: 'Monthly payment', val: fmt(basePayment), color: '#1a56db', sub: 'Combined minimums' },
          { label: 'Projected payoff', val: monthsToDate(months), color: '#b45309', sub: `${months} months away` },
        ].map((k, i) => (
          <div key={i} style={S.card}>
            <div style={{ fontSize: 11, color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.5px', color: k.color, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#4a4a6a' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Overall payoff progress</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#0d9268', fontFamily: 'monospace' }}>{progressPct}% paid</span>
        </div>
        <div style={{ background: '#1e1e2e', borderRadius: 99, height: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${progressPct}%`, background: '#0d9268', transition: 'width 0.5s ease' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#4a4a6a' }}>
          <span>{fmt(totalPaid)} paid</span>
          <span>{fmt(totalDebt)} remaining</span>
          <span>{fmt(totalOriginal)} total</span>
        </div>
      </div>

      {/* Debt list + Projection chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 10, marginBottom: 12 }}>

        {/* Debt accounts */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 16 }}>Debt accounts</div>
          {debts.map(d => (
            <div key={d.id} style={{ padding: '12px 0', borderBottom: '1px solid #1e1e2e' }}>
              {editingId === d.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input style={S.input} placeholder="Name" value={editDebt.name || ''} onChange={e => setEditDebt({ ...editDebt, name: e.target.value })}/>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input style={S.input} placeholder="Balance" type="number" value={editDebt.balance || ''} onChange={e => setEditDebt({ ...editDebt, balance: e.target.value })}/>
                    <input style={S.input} placeholder="APR %" type="number" value={editDebt.apr || ''} onChange={e => setEditDebt({ ...editDebt, apr: e.target.value })}/>
                    <input style={S.input} placeholder="Min payment" type="number" value={editDebt.minPayment || ''} onChange={e => setEditDebt({ ...editDebt, minPayment: e.target.value })}/>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => saveEdit(d.id)} style={{ ...S.btnSm, background: '#0d9268', color: '#fff', border: 'none' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={S.btnSm}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 3 }}>{d.name}</div>
                    <span style={{ fontSize: 10, color: '#6a6a8a', background: '#1e1e2e', padding: '2px 7px', borderRadius: 4 }}>{d.type}</span>
                    {d.apr > 0 && <span style={{ fontSize: 10, color: '#4a4a6a', marginLeft: 6 }}>{d.apr}% APR</span>}
                    {/* per-debt progress */}
                    <div style={{ marginTop: 8, background: '#1e1e2e', borderRadius: 99, height: 4, width: 120, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, Math.round((1 - d.balance / (d.originalBalance || d.balance)) * 100))}%`, background: d.apr > 15 ? '#c81e1e' : '#0d9268' }}/>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#c81e1e', fontFamily: 'monospace' }}>{fmt(d.balance)}</div>
                    {d.minPayment > 0 && <div style={{ fontSize: 11, color: '#4a4a6a', marginTop: 2 }}>${d.minPayment}/mo min</div>}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setEditingId(d.id); setEditDebt({ name: d.name, balance: d.balance, apr: d.apr, minPayment: d.minPayment }) }} style={S.btnSm}>Edit</button>
                      <button onClick={() => removeDebt(d.id)} style={{ ...S.btnSm, color: '#c81e1e' }}>✕</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add debt form */}
          {showAddDebt ? (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input style={S.input} placeholder="Debt name (e.g. Amex, Student Loan)" value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })}/>
              <select style={S.select} value={newDebt.type} onChange={e => setNewDebt({ ...newDebt, type: e.target.value })}>
                {DEBT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={S.input} placeholder="Current balance" type="number" value={newDebt.balance} onChange={e => setNewDebt({ ...newDebt, balance: e.target.value })}/>
                <input style={S.input} placeholder="Original balance" type="number" value={newDebt.originalBalance} onChange={e => setNewDebt({ ...newDebt, originalBalance: e.target.value })}/>
                <input style={S.input} placeholder="APR %" type="number" value={newDebt.apr} onChange={e => setNewDebt({ ...newDebt, apr: e.target.value })}/>
                <input style={S.input} placeholder="Min payment/mo" type="number" value={newDebt.minPayment} onChange={e => setNewDebt({ ...newDebt, minPayment: e.target.value })}/>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addDebt} style={S.btn}>Add debt</button>
                <button onClick={() => setShowAddDebt(false)} style={{ ...S.btnSm, padding: '8px 14px' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddDebt(true)} style={{ ...S.btnSm, width: '100%', padding: '9px', marginTop: 14, textAlign: 'center' }}>
              + Add debt account
            </button>
          )}
        </div>

        {/* Projection chart */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 4 }}>Payoff projection</div>
          <div style={{ fontSize: 11, color: '#6a6a8a', marginBottom: 12 }}>Balance over time · use the what-if sliders below to see accelerated path</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {[['#c81e1e', 'Current pace'], ['#0d9268', 'Accelerated']].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6a6a8a' }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: c, display: 'inline-block' }}/>
                {l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={projData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false}/>
              <XAxis dataKey="label" tick={{ fill: '#4a4a6a', fontSize: 10 }} axisLine={false} tickLine={false} interval={4}/>
              <YAxis tick={{ fill: '#4a4a6a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v / 1000)}k`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Line type="monotone" dataKey="Current" stroke="#c81e1e" strokeWidth={2} dot={false} name="Current pace"/>
              <Line type="monotone" dataKey="Accelerated" stroke="#0d9268" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Accelerated"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* What-if calculator */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 4 }}>What-if calculator</div>
        <div style={{ fontSize: 11, color: '#6a6a8a', marginBottom: 20 }}>Adjust to see how small changes accelerate your payoff date</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#8888aa', width: 160, flexShrink: 0 }}>Extra monthly payment</span>
              <input type="range" min="0" max="500" step="10" value={extraPayment}
                onChange={e => setExtraPayment(parseInt(e.target.value))}
                style={{ flex: 1 }}/>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#fff', width: 70, textAlign: 'right', fontFamily: 'monospace' }}>+${extraPayment}/mo</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#8888aa', width: 160, flexShrink: 0 }}>Dining reduction</span>
              <input type="range" min="0" max="200" step="5" value={diningCut}
                onChange={e => setDiningCut(parseInt(e.target.value))}
                style={{ flex: 1 }}/>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#fff', width: 70, textAlign: 'right', fontFamily: 'monospace' }}>-${diningCut}/mo</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              ['New payoff', monthsToDate(newMonths), '#0d9268'],
              ['Months saved', `${monthsSaved} mo`, '#0d9268'],
              ['Interest saved', fmt(interestSaved), '#0d9268'],
            ].map(([l, v, c], i) => (
              <div key={i} style={{ background: '#1e1e2e', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#4a4a6a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: monthsSaved > 0 ? c : '#fff' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6a6a8a', marginBottom: 10 }}>Smart insights</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          {insights.map((ins, i) => {
            const borderColor = ins.type === 'warn' ? '#e3a008' : ins.type === 'good' ? '#0d9268' : '#1a56db'
            return (
              <div key={i} style={{ background: '#12121e', border: '0.5px solid #1e1e2e', borderLeft: `2px solid ${borderColor}`, borderRadius: '0 14px 14px 0', padding: '14px 16px' }}>
                <div style={{ fontSize: 13, marginBottom: 7 }}>{ins.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 4, lineHeight: 1.4 }}>{ins.title}</div>
                <div style={{ fontSize: 11, color: '#6a6a8a', lineHeight: 1.5 }}>{ins.body}</div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
