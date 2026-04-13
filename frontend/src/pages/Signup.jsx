import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const F = 'DM Sans, Inter, sans-serif'

export default function Signup() {
  const [step, setStep] = useState(1) // 1=name+budget, 2=email+password
  const [form, setForm] = useState({ name:'', monthly_budget:'', email:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const QUICK_BUDGETS = [1500, 2000, 3000, 4000, 5000]

  const nextStep = () => {
    if (!form.name.trim()) { setError('Please enter your name'); return }
    if (!form.monthly_budget) { setError('Please set a monthly budget'); return }
    setError('')
    setStep(2)
  }

  const submit = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://127.0.0.1:8000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          monthly_budget: parseFloat(form.monthly_budget)
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Signup failed'); setLoading(false); return }
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_name', data.user.name?.split(' ')[0] || 'You')
      localStorage.setItem('user_email', data.user.email)
      localStorage.setItem('onboarding_complete', 'true')
      localStorage.setItem('just_signed_up', 'true')
      navigate('/app/upload')
    } catch {
      setError('Could not connect. Make sure the app is running.')
    }
    setLoading(false)
  }

  const inp = {
    background:'#0f1117', border:'1px solid #1e2030', borderRadius:10,
    padding:'12px 16px', color:'#fff', fontSize:15, outline:'none',
    fontFamily:F, width:'100%', boxSizing:'border-box'
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080b0f', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, padding:20 }}>
      <div style={{ width:'100%', maxWidth:440 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <Link to="/" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18 }}>x</div>
            <span style={{ fontWeight:800, fontSize:20, color:'#fff' }}>xspend</span>
          </Link>
        </div>

        {/* Progress */}
        <div style={{ display:'flex', gap:6, marginBottom:28 }}>
          {[1,2].map(s => (
            <div key={s} style={{ flex:1, height:3, borderRadius:99, background:s<=step?'#3b82f6':'#1e2030', transition:'background 0.3s' }}/>
          ))}
        </div>

        <div style={{ background:'#0f1117', border:'1px solid #1e2030', borderRadius:20, padding:'36px 32px' }}>

          {step === 1 && (
            <>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>Let's get started</h1>
              <p style={{ fontSize:14, color:'#475569', marginBottom:28 }}>Tell us a bit about yourself</p>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
                  <p style={{ color:'#ef4444', fontSize:13 }}>{error}</p>
                </div>
              )}

              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:600, display:'block', marginBottom:6 }}>Your name</label>
                <input placeholder="e.g. Dharani" value={form.name}
                  onChange={e => setForm({...form, name:e.target.value})}
                  onKeyDown={e => e.key==='Enter' && nextStep()}
                  style={inp} autoFocus/>
              </div>

              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:600, display:'block', marginBottom:6 }}>Monthly budget for flexible spending</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'#475569', fontSize:15 }}>$</span>
                  <input type="number" placeholder="3000" value={form.monthly_budget}
                    onChange={e => setForm({...form, monthly_budget:e.target.value})}
                    onKeyDown={e => e.key==='Enter' && nextStep()}
                    style={{ ...inp, paddingLeft:32 }}/>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  {QUICK_BUDGETS.map(b => (
                    <button key={b} onClick={() => setForm({...form, monthly_budget:String(b)})}
                      style={{ background:form.monthly_budget===String(b)?'rgba(37,99,235,0.15)':'#0a0d12', border:`1px solid ${form.monthly_budget===String(b)?'#2563eb':'#1e2030'}`, borderRadius:8, padding:'5px 12px', fontSize:13, color:form.monthly_budget===String(b)?'#3b82f6':'#475569', cursor:'pointer', fontFamily:F }}>
                      ${b.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={nextStep}
                style={{ width:'100%', background:'#2563eb', color:'#fff', border:'none', borderRadius:12, padding:'13px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:F }}>
                Continue →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>Sign up to continue</h1>
              <p style={{ fontSize:14, color:'#475569', marginBottom:4 }}>Sign up to upload your first statement and see where your money goes.</p>
              <div style={{ display:'flex', gap:12, marginBottom:24, marginTop:12 }}>
                <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#10b981' }}>✓ {form.name}</div>
                <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#10b981' }}>✓ ${parseFloat(form.monthly_budget||0).toLocaleString()} budget</div>
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
                  <p style={{ color:'#ef4444', fontSize:13 }}>{error}</p>
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:600, display:'block', marginBottom:6 }}>Email</label>
                <input type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => setForm({...form, email:e.target.value})}
                  onKeyDown={e => e.key==='Enter' && submit()}
                  style={inp} autoFocus/>
              </div>

              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:600, display:'block', marginBottom:6 }}>Set a password</label>
                <input type="password" placeholder="Min 6 characters" value={form.password}
                  onChange={e => setForm({...form, password:e.target.value})}
                  onKeyDown={e => e.key==='Enter' && submit()}
                  style={inp}/>
              </div>

              <button onClick={submit} disabled={loading}
                style={{ width:'100%', background:'#2563eb', color:'#fff', border:'none', borderRadius:12, padding:'13px', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:F, opacity:loading?0.7:1, marginBottom:12 }}>
                {loading ? 'Creating account...' : 'Create account & continue →'}
              </button>

              <button onClick={() => { setStep(1); setError('') }}
                style={{ width:'100%', background:'none', border:'none', color:'#334155', fontSize:13, cursor:'pointer', fontFamily:F }}>
                ← Back
              </button>
            </>
          )}

          <p style={{ textAlign:'center', fontSize:13, color:'#334155', marginTop:20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>Sign in →</Link>
          </p>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#283244', marginTop:20 }}>
          No bank connection · Free · Private
        </p>
      </div>
    </div>
  )
}
