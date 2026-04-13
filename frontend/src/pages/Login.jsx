import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const F = 'DM Sans, Inter, sans-serif'

export default function Login() {
  const [form, setForm] = useState({ email:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Login failed'); setLoading(false); return }
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_name', data.user.name?.split(' ')[0] || 'You')
      localStorage.setItem('user_email', data.user.email)
      localStorage.setItem('onboarding_complete', 'true')
      navigate('/app/dashboard')
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
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <Link to="/" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18 }}>x</div>
            <span style={{ fontWeight:800, fontSize:20, color:'#fff' }}>xspend</span>
          </Link>
        </div>

        <div style={{ background:'#0f1117', border:'1px solid #1e2030', borderRadius:20, padding:'36px 32px' }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:6, textAlign:'center' }}>Welcome back</h1>
          <p style={{ fontSize:14, color:'#475569', textAlign:'center', marginBottom:28 }}>Sign in to continue</p>

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
            <label style={{ fontSize:12, color:'#64748b', fontWeight:600, display:'block', marginBottom:6 }}>Password</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({...form, password:e.target.value})}
              onKeyDown={e => e.key==='Enter' && submit()}
              style={inp}/>
          </div>

          <button onClick={submit} disabled={loading}
            style={{ width:'100%', background:'#2563eb', color:'#fff', border:'none', borderRadius:12, padding:'13px', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:F, opacity:loading?0.7:1 }}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>

          <p style={{ textAlign:'center', fontSize:13, color:'#334155', marginTop:20 }}>
            No account yet?{' '}
            <Link to="/signup" style={{ color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>Create one free</Link>
          </p>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#283244', marginTop:20 }}>
          No bank connection · Your data stays private
        </p>
      </div>
    </div>
  )
}
