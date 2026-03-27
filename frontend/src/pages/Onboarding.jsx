import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CURRENCIES = ['USD','EUR','GBP','INR','AUD','CAD','SGD','AED','JPY','CHF']
const INCOME_FREQUENCIES = [
  { value:'weekly',      label:'Weekly',       desc:'Every 7 days' },
  { value:'biweekly',    label:'Bi-weekly',    desc:'Every 2 weeks' },
  { value:'semimonthly', label:'Semi-monthly', desc:'Twice a month' },
  { value:'monthly',     label:'Monthly',      desc:'Once a month' },
  { value:'other',       label:'Other',        desc:'Varies' },
]
const GOALS = [
  { value:'understand',   label:'Understand my finances',         icon:'📊' },
  { value:'spending',     label:'Manage spending better',         icon:'💳' },
  { value:'savings',      label:'Build savings',                  icon:'🏦' },
  { value:'debt',         label:'Pay off debt',                   icon:'📉' },
  { value:'budget',       label:'Stay on budget',                 icon:'🎯' },
  { value:'subscriptions',label:'Reduce subscriptions',           icon:'📱' },
  { value:'bills',        label:'Track bills better',             icon:'📋' },
  { value:'irregular',    label:'Prepare for irregular expenses', icon:'🔄' },
]

const STEPS = [
  { id:'welcome',   title:'Welcome to FinanceAI',         subtitle:'Your private, AI-powered finance tracker. Nothing leaves your device.' },
  { id:'name',      title:'What should we call you?',     subtitle:'Just your first name is fine.' },
  { id:'currency',  title:'What\'s your currency?',       subtitle:'This will be used across all your reports and budgets.' },
  { id:'income',    title:'What\'s your income?',         subtitle:'We use this to calculate your savings rate and avoid double-counting deposits in your bank statement.' },
  { id:'goals',     title:'What are you here for?',       subtitle:'Pick everything that applies. This helps us personalise your dashboard.' },
  { id:'targets',   title:'Set some targets',             subtitle:'Optional — you can skip these and set them later in Settings.' },
  { id:'done',      title:'All set!',                     subtitle:'Start by uploading a bank statement or adding transactions manually.' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    currency: 'USD',
    income_amount: '',
    income_frequency: 'monthly',
    payday_day: '',
    selected_goals: [],
    other_goals: '',
    monthly_savings_goal: '',
    weekly_savings_goal: '',
    debt_payoff_goal: '',
    monthly_budget: '',
  })

  const current = STEPS[step]
  const progress = (step / (STEPS.length - 1)) * 100
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const toggleGoal = (val) => {
    setForm(f => ({
      ...f,
      selected_goals: f.selected_goals.includes(val)
        ? f.selected_goals.filter(g => g !== val)
        : [...f.selected_goals, val]
    }))
  }

  const handleFinish = async (goTo) => {
    setSaving(true)
    try {
      await fetch('http://127.0.0.1:8000/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          income_amount: parseFloat(form.income_amount) || 0,
          monthly_income: parseFloat(form.income_amount) || 0,
          income_frequency: form.income_frequency,
          preferred_currency: form.currency,
          payday_day: form.payday_day,
          selected_goals: form.selected_goals.join(','),
          other_goals: form.other_goals,
          monthly_savings_goal: parseFloat(form.monthly_savings_goal) || 0,
          weekly_savings_goal: parseFloat(form.weekly_savings_goal) || 0,
          debt_payoff_goal: parseFloat(form.debt_payoff_goal) || 0,
          monthly_budget: parseFloat(form.monthly_budget) || 0,
        })
      })
      localStorage.setItem('onboarding_complete', 'true')
      if (form.full_name) localStorage.setItem('user_name', form.full_name.split(' ')[0])
    } catch(e) {
      console.error(e)
      localStorage.setItem('onboarding_complete', 'true')
    }
    setSaving(false)
    navigate('/app/dashboard')
  }

  const sym = { USD:'$',EUR:'€',GBP:'£',INR:'₹',AUD:'A$',CAD:'C$',SGD:'S$',AED:'د.إ',JPY:'¥',CHF:'Fr' }
  const s = sym[form.currency] || '$'

  const S = {
    page: { minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Sans, Inter, sans-serif', padding:24 },
    card: { background:'#12121e', border:'1px solid #1e1e2e', borderRadius:24, padding:'44px 48px', width:'100%', maxWidth:540 },
    progress: { background:'#1e1e2e', borderRadius:99, height:3, marginBottom:36, overflow:'hidden' },
    progressFill: { height:'100%', borderRadius:99, background:'linear-gradient(90deg,#2563eb,#7c3aed)', transition:'width 0.4s ease', width:`${progress}%` },
    stepNum: { color:'#4a4a6a', fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 },
    title: { color:'#fff', fontSize:24, fontWeight:700, marginBottom:6, letterSpacing:'-0.3px', lineHeight:1.2 },
    subtitle: { color:'#6a6a8a', fontSize:13, lineHeight:1.6, marginBottom:32 },
    label: { display:'block', color:'#8888aa', fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 },
    hint: { color:'#4a4a6a', fontSize:11, marginTop:7, lineHeight:1.5 },
    input: { width:'100%', background:'#0a0a0f', border:'1px solid #2a2a3a', borderRadius:10, padding:'12px 14px', color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
    btnRow: { display:'flex', gap:10, marginTop:36 },
    btnPrimary: { flex:1, background:'#2563eb', color:'#fff', border:'none', borderRadius:12, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
    btnSecondary: { background:'#1e1e2e', color:'#8888aa', border:'1px solid #2a2a3a', borderRadius:12, padding:'13px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
    skip: { textAlign:'center', color:'#4a4a6a', fontSize:12, marginTop:14, cursor:'pointer' },
    optionGrid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
    option: (sel) => ({ background:sel?'rgba(37,99,235,0.12)':'#0a0a0f', border:`1px solid ${sel?'#2563eb':'#2a2a3a'}`, borderRadius:10, padding:'12px 14px', color:sel?'#fff':'#8888aa', fontSize:13, fontWeight:sel?600:400, cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }),
    summaryRow: (i, len) => ({ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:i<len-1?'1px solid #1e1e2e':'none' }),
  }

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:36 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:15 }}>F</div>
          <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>FinanceAI</span>
        </div>

        {/* Progress */}
        <div style={S.progress}><div style={S.progressFill}/></div>

        {step > 0 && step < STEPS.length - 1 && (
          <p style={S.stepNum}>Step {step} of {STEPS.length - 1}</p>
        )}
        <h2 style={S.title}>{current.title}</h2>
        <p style={S.subtitle}>{current.subtitle}</p>

        {/* ── WELCOME ── */}
        {step === 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              ['🔒','Privacy first','Your data never leaves your device. No cloud database.'],
              ['📊','Smart dashboard','Auto-updating charts based on your real transactions.'],
              ['💬','AI assistant','Ask anything about your money in plain English.'],
              ['✏️','Fully editable','Everything you enter can be changed anytime in Settings.'],
            ].map(([icon,title,desc],i) => (
              <div key={i} style={{ background:'#0a0a0f', border:'1px solid #1e1e2e', borderRadius:10, padding:14 }}>
                <div style={{ fontSize:20, marginBottom:7 }}>{icon}</div>
                <p style={{ color:'#fff', fontWeight:600, fontSize:12, marginBottom:4 }}>{title}</p>
                <p style={{ color:'#4a4a6a', fontSize:11, lineHeight:1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── NAME ── */}
        {step === 1 && (
          <div>
            <label style={S.label}>Your first name</label>
            <input style={S.input} placeholder="e.g. Dharani" value={form.full_name}
              onChange={e => setForm({...form, full_name:e.target.value})} autoFocus/>
            <p style={S.hint}>We'll use this to personalise your dashboard. You can change it anytime.</p>
          </div>
        )}

        {/* ── CURRENCY ── */}
        {step === 2 && (
          <div>
            <label style={S.label}>Base currency</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
              {CURRENCIES.map(c => (
                <button key={c} onClick={() => setForm({...form,currency:c})}
                  style={{ ...S.option(form.currency===c), flexDirection:'column', gap:3, alignItems:'center', padding:'10px 8px' }}>
                  <span style={{ fontSize:13 }}>{sym[c]}</span>
                  <span style={{ fontSize:11 }}>{c}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── INCOME ── */}
        {step === 3 && (
          <div>
            <label style={S.label}>Take-home income ({form.currency})</label>
            <div style={{ position:'relative', marginBottom:16 }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#4a4a6a', fontSize:16 }}>{s}</span>
              <input type="number" style={{...S.input, paddingLeft:32}} placeholder="e.g. 4500"
                value={form.income_amount} onChange={e => setForm({...form,income_amount:e.target.value})} autoFocus/>
            </div>
            <label style={{...S.label, marginTop:4}}>How often do you get paid?</label>
            <div style={S.optionGrid2}>
              {INCOME_FREQUENCIES.map(f => (
                <button key={f.value} onClick={() => setForm({...form,income_frequency:f.value})}
                  style={S.option(form.income_frequency===f.value)}>
                  <span style={{ flex:1 }}>{f.label}</span>
                  <span style={{ fontSize:11, color:'#4a4a6a' }}>{f.desc}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop:14 }}>
              <label style={S.label}>Payday <span style={{ textTransform:'none', letterSpacing:0, fontWeight:400, color:'#4a4a6a' }}>(optional)</span></label>
              <input style={S.input} placeholder="e.g. 1st and 15th, every Friday..."
                value={form.payday_day} onChange={e => setForm({...form,payday_day:e.target.value})}/>
            </div>
            <p style={S.hint}>💡 Enter your after-tax income. If your bank shows direct deposits, we use this to avoid counting it twice.</p>
          </div>
        )}

        {/* ── GOALS ── */}
        {step === 4 && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
              {GOALS.map(g => (
                <button key={g.value} onClick={() => toggleGoal(g.value)}
                  style={S.option(form.selected_goals.includes(g.value))}>
                  <span style={{ fontSize:16 }}>{g.icon}</span>
                  <span style={{ fontSize:12 }}>{g.label}</span>
                </button>
              ))}
            </div>
            <label style={S.label}>Anything else? <span style={{ textTransform:'none', letterSpacing:0, fontWeight:400, color:'#4a4a6a' }}>(optional)</span></label>
            <textarea style={{...S.input, resize:'vertical', minHeight:72, fontSize:13}} placeholder="Tell us anything else you'd like help with..."
              value={form.other_goals} onChange={e => setForm({...form,other_goals:e.target.value})}/>
          </div>
        )}

        {/* ── TARGETS ── */}
        {step === 5 && (
          <div>
            <p style={{ color:'#4a4a6a', fontSize:12, marginBottom:20 }}>All optional — skip if you're not sure yet. You can set these any time in Settings.</p>
            {[
              { label:`Monthly budget (${form.currency})`, field:'monthly_budget', placeholder:'e.g. 3000', hint:'How much you plan to spend per month' },
              { label:`Monthly savings goal (${form.currency})`, field:'monthly_savings_goal', placeholder:'e.g. 500', hint:'How much you want to save per month' },
              { label:`Weekly savings goal (${form.currency})`, field:'weekly_savings_goal', placeholder:'e.g. 125', hint:'Optional alternative to monthly goal' },
              { label:`Debt payoff goal (${form.currency})`, field:'debt_payoff_goal', placeholder:'e.g. 8000', hint:'Total debt you want to clear' },
            ].map((f,i) => (
              <div key={i} style={{ marginBottom:16 }}>
                <label style={S.label}>{f.label}</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#4a4a6a', fontSize:15 }}>{s}</span>
                  <input type="number" style={{...S.input, paddingLeft:30}} placeholder={f.placeholder}
                    value={form[f.field]} onChange={e => setForm({...form,[f.field]:e.target.value})}/>
                </div>
                <p style={S.hint}>{f.hint}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── DONE ── */}
        {step === STEPS.length - 1 && (
          <div>
            {form.full_name && (
              <p style={{ color:'#6a6a8a', fontSize:14, marginBottom:20 }}>
                Welcome, <strong style={{ color:'#fff' }}>{form.full_name}</strong>! Here's what we saved:
              </p>
            )}
            <div style={{ background:'#0a0a0f', border:'1px solid #1e1e2e', borderRadius:12, padding:'14px 16px', marginBottom:24 }}>
              {[
                ['Currency', form.currency],
                ['Income', form.income_amount ? `${s}${parseFloat(form.income_amount).toLocaleString()} ${form.income_frequency}` : '—'],
                ['Goals', form.selected_goals.length ? `${form.selected_goals.length} selected` : 'None selected'],
                ['Monthly budget', form.monthly_budget ? `${s}${parseFloat(form.monthly_budget).toLocaleString()}` : 'Not set'],
                ['Savings goal', form.monthly_savings_goal ? `${s}${parseFloat(form.monthly_savings_goal).toLocaleString()}/mo` : 'Not set'],
              ].map(([l,v],i,arr) => (
                <div key={i} style={S.summaryRow(i, arr.length)}>
                  <span style={{ color:'#6a6a8a', fontSize:13 }}>{l}</span>
                  <span style={{ color:'#fff', fontWeight:600, fontSize:13 }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ color:'#4a4a6a', fontSize:12, textAlign:'center', marginBottom:20 }}>
              Everything can be updated anytime in Settings ⚙️
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => handleFinish('/app/upload')} disabled={saving}
                style={{ background:'#2563eb', color:'#fff', border:'none', borderRadius:14, padding:'18px 12px', cursor:'pointer', fontFamily:'inherit', opacity:saving?0.6:1 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                <p style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>Upload File</p>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:11 }}>Import from any bank</p>
              </button>
              <button onClick={() => handleFinish('/app/upload')} disabled={saving}
                style={{ background:'#1e1e2e', color:'#fff', border:'1px solid #2a2a3a', borderRadius:14, padding:'18px 12px', cursor:'pointer', fontFamily:'inherit', opacity:saving?0.6:1 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✏️</div>
                <p style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>Enter Manually</p>
                <p style={{ color:'#6a6a8a', fontSize:11 }}>Type in transactions</p>
              </button>
            </div>
          </div>
        )}

        {/* BUTTONS */}
        {step < STEPS.length - 1 && (
          <div style={S.btnRow}>
            {step > 0 && <button onClick={back} style={S.btnSecondary}>← Back</button>}
            <button onClick={next} style={S.btnPrimary}>
              {step === 0 ? 'Get Started →' : step === STEPS.length - 2 ? 'Review & Finish →' : 'Continue →'}
            </button>
          </div>
        )}

        {step > 0 && step < STEPS.length - 1 && (
          <p style={S.skip} onClick={next}>Skip this step</p>
        )}

      </div>
    </div>
  )
}
