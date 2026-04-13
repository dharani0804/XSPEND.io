import { Link } from 'react-router-dom'

const F = 'DM Sans, Inter, sans-serif'
const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' })

export default function Landing() {
  return (
    <div style={{ minHeight:'100vh', background:'#080b0f', color:'#fff', fontFamily:F, overflowX:'hidden' }}>

      {/* NAV */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 64px', height:68, background:'rgba(8,11,15,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid #1e2030', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:15 }}>x</div>
          <span style={{ fontWeight:800, fontSize:17, color:'#fff' }}>xspend</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {[['Features','features'],['How it works','howitworks'],['About','about']].map(([label,id]) => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background:'none', border:'none', color:'#64748b', fontSize:14, fontWeight:500, padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Link to="/signup" style={{ color:'#64748b', fontSize:14, fontWeight:500, textDecoration:'none' }}>Sign in</Link>
          <Link to="/signup" style={{ background:'#2563eb', color:'#fff', fontSize:14, fontWeight:700, padding:'9px 20px', borderRadius:10, textDecoration:'none' }}>Get started free</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding:'100px 64px 80px', maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:99, padding:'6px 16px', marginBottom:32 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', display:'inline-block' }}/>
          <span style={{ fontSize:13, color:'#3b82f6', fontWeight:600 }}>AI-Powered Personal Finance</span>
        </div>

        <h1 style={{ fontSize:64, fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', marginBottom:24, maxWidth:800, margin:'0 auto 24px' }}>
          See exactly where your<br/>
          <span style={{ background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>money goes</span>
          {' '}— in seconds
        </h1>

        <p style={{ fontSize:20, color:'#64748b', lineHeight:1.7, maxWidth:580, margin:'0 auto 40px' }}>
          Upload your bank statement and instantly understand your spending — what's fixed, what's flexible, and where you can save.
        </p>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:24 }}>
          <Link to="/signup" style={{ background:'#2563eb', color:'#fff', fontSize:16, fontWeight:700, padding:'14px 32px', borderRadius:14, textDecoration:'none', boxShadow:'0 4px 24px rgba(37,99,235,0.4)', display:'flex', alignItems:'center', gap:8 }}>
            Try it on your data →
          </Link>
          <button onClick={() => scrollTo('howitworks')}
            style={{ background:'none', border:'1px solid #1e2030', color:'#94a3b8', fontSize:15, fontWeight:600, padding:'14px 28px', borderRadius:14, cursor:'pointer', fontFamily:F }}>
            See how it works
          </button>
        </div>

        <p style={{ fontSize:13, color:'#334155' }}>
          No bank connection &nbsp;•&nbsp; Your data stays private &nbsp;•&nbsp; Works in seconds
        </p>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section style={{ padding:'0 64px 80px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ background:'linear-gradient(180deg,#0f1117 0%,#080b0f 100%)', border:'1px solid #1e2030', borderRadius:24, padding:3, boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ background:'#0f1117', borderRadius:22, padding:'32px', position:'relative' }}>
            {/* Fake browser bar */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:24 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444' }}/>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b' }}/>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#10b981' }}/>
              <div style={{ flex:1, background:'#1e2030', borderRadius:6, height:24, marginLeft:12, display:'flex', alignItems:'center', paddingLeft:12 }}>
                <span style={{ fontSize:11, color:'#334155' }}>app.financeai.com/dashboard</span>
              </div>
            </div>

            {/* Mini dashboard mockup */}
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr', gap:12, marginBottom:12 }}>
              {[
                { label:'LEFT TO SPEND', value:'$2,483', color:'#3b82f6', sub:'17% used · on pace' },
                { label:'TOTAL EXPENSES', value:'$4,573', color:'#ef4444', sub:'12 transactions' },
                { label:'WHERE IT GOES', value:'$517 flexible', color:'#10b981', sub:'$4,065 fixed' },
              ].map((k,i) => (
                <div key={i} style={{ background:'#080b0f', border:'1px solid #1e2030', borderRadius:14, padding:'18px 20px' }}>
                  <p style={{ fontSize:9, color:'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>{k.label}</p>
                  <p style={{ fontSize:26, fontWeight:800, color:k.color, fontFamily:'monospace', marginBottom:6 }}>{k.value}</p>
                  <p style={{ fontSize:11, color:'#334155' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:12 }}>
              <div style={{ background:'#080b0f', border:'1px solid #1e2030', borderRadius:14, padding:'18px 20px' }}>
                <p style={{ fontSize:9, color:'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>Where your money went</p>
                {[
                  { name:'Rent & Utilities', pct:72, color:'#3b82f6', amt:'$4,065' },
                  { name:'Food & Dining', pct:14, color:'#10b981', amt:'$772' },
                  { name:'Shopping', pct:8, color:'#f59e0b', amt:'$430' },
                  { name:'Transport', pct:4, color:'#8b5cf6', amt:'$185' },
                ].map((c,i) => (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'#94a3b8' }}>{c.name}</span>
                      <span style={{ fontSize:12, color:'#e2e8f0', fontFamily:'monospace' }}>{c.amt}</span>
                    </div>
                    <div style={{ background:'#1e2030', borderRadius:99, height:5 }}>
                      <div style={{ width:c.pct+'%', height:'100%', background:c.color, borderRadius:99 }}/>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#080b0f', border:'1px solid #1e2030', borderRadius:14, padding:'18px 20px' }}>
                <p style={{ fontSize:9, color:'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>Insights</p>
                {[
                  { icon:'🍽️', color:'#f59e0b', title:'You dined out 34 times this month', body:'Cutting to 28 saves ~$125/mo' },
                  { icon:'📱', color:'#8b5cf6', title:'7 active subscriptions · $127/mo', body:'That is $1,524/year — worth auditing' },
                  { icon:'✅', color:'#10b981', title:'Food & Dining down 17% vs last month', body:'You saved $158. Keep it up!' },
                ].map((ins,i) => (
                  <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background:'#0f1117', borderRadius:10, borderLeft:`3px solid ${ins.color}`, marginBottom:8 }}>
                    <span style={{ fontSize:14 }}>{ins.icon}</span>
                    <div>
                      <p style={{ fontSize:11, fontWeight:600, color:'#e2e8f0', marginBottom:2 }}>{ins.title}</p>
                      <p style={{ fontSize:10, color:'#475569' }}>{ins.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating callouts */}
            <div style={{ position:'absolute', top:80, right:-20, background:'#10b981', borderRadius:12, padding:'8px 14px', boxShadow:'0 8px 24px rgba(16,185,129,0.3)' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#fff' }}>Fixed vs Flexible — instantly</p>
            </div>
            <div style={{ position:'absolute', bottom:100, right:-20, background:'#3b82f6', borderRadius:12, padding:'8px 14px', boxShadow:'0 8px 24px rgba(59,130,246,0.3)' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#fff' }}>Smart insights — personalized</p>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section style={{ padding:'80px 64px', maxWidth:900, margin:'0 auto', textAlign:'center' }} id="features">
        <p style={{ fontSize:12, color:'#475569', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', marginBottom:20 }}>Sound familiar?</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:40 }}>
          {[
            { icon:'😕', text:'You see transactions... but don\'t know what it all adds up to' },
            { icon:'😬', text:'You realize you overspent only after the month ends' },
            { icon:'🤯', text:'Your money is spread across accounts and cards' },
            { icon:'😮‍💨', text:'You know you should track things — but it\'s too much effort' },
          ].map((p,i) => (
            <div key={i} style={{ background:'#0f1117', border:'1px solid #1e2030', borderRadius:16, padding:'24px 28px', textAlign:'left', display:'flex', gap:14, alignItems:'flex-start' }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{p.icon}</span>
              <p style={{ fontSize:15, color:'#94a3b8', lineHeight:1.6 }}>{p.text}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize:22, fontWeight:700, color:'#f1f5f9' }}>You don't need more tools. You need clarity.</p>
      </section>

      {/* SOLUTION */}
      <section style={{ padding:'80px 64px', background:'rgba(59,130,246,0.03)', borderTop:'1px solid #1e2030', borderBottom:'1px solid #1e2030' }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:12, color:'#3b82f6', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', marginBottom:16 }}>The solution</p>
          <h2 style={{ fontSize:40, fontWeight:800, letterSpacing:'-1px', marginBottom:16 }}>Finally understand your spending</h2>
          <p style={{ fontSize:18, color:'#64748b', marginBottom:48, lineHeight:1.7 }}>
            xspend turns your bank statement into a clear, simple view of your money — in seconds.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {[
              { icon:'📍', title:'See exactly where your money is going', body:'Every dollar categorized automatically — groceries, dining, shopping, subscriptions.' },
              { icon:'⚖️', title:'Understand what\'s fixed vs flexible', body:'Know what you\'re committed to and what you can actually control.' },
              { icon:'💡', title:'Know how much you have left to spend', body:'A single clear number updated in real time as you upload statements.' },
            ].map((f,i) => (
              <div key={i} style={{ background:'#0f1117', border:'1px solid #1e2030', borderRadius:18, padding:'28px 24px', textAlign:'left' }}>
                <div style={{ fontSize:28, marginBottom:16 }}>{f.icon}</div>
                <p style={{ fontSize:15, fontWeight:700, color:'#f1f5f9', marginBottom:10, lineHeight:1.4 }}>{f.title}</p>
                <p style={{ fontSize:13, color:'#475569', lineHeight:1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding:'80px 64px', maxWidth:900, margin:'0 auto' }} id="howitworks">
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <p style={{ fontSize:12, color:'#475569', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', marginBottom:16 }}>How it works</p>
          <h2 style={{ fontSize:40, fontWeight:800, letterSpacing:'-1px' }}>Up and running in seconds</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
          {[
            { step:'01', icon:'📎', title:'Upload your statement', body:'CSV, PDF, or Excel — no bank connection required. Works with any bank.' },
            { step:'02', icon:'📊', title:'See your spending clearly', body:'Categories, fixed vs flexible, and totals — all in one clean dashboard.' },
            { step:'03', icon:'🎯', title:'Take action', body:'Know exactly where to adjust. Get personalized insights to save more.' },
          ].map((s,i) => (
            <div key={i} style={{ textAlign:'center', padding:'32px 24px', background:'#0f1117', border:'1px solid #1e2030', borderRadius:18, position:'relative' }}>
              <div style={{ fontSize:11, color:'#3b82f6', fontWeight:700, letterSpacing:'2px', marginBottom:16 }}>{s.step}</div>
              <div style={{ fontSize:36, marginBottom:16 }}>{s.icon}</div>
              <p style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:10 }}>{s.title}</p>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EMOTIONAL INSIGHT */}
      <section style={{ padding:'80px 64px', background:'rgba(139,92,246,0.03)', borderTop:'1px solid #1e2030', borderBottom:'1px solid #1e2030' }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:36, fontWeight:800, letterSpacing:'-1px', marginBottom:20, lineHeight:1.2 }}>
            Most people don't overspend —<br/>they just don't see it
          </h2>
          <p style={{ fontSize:17, color:'#64748b', lineHeight:1.8, marginBottom:36 }}>
            Once you see your spending clearly, decisions become easy.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:36 }}>
            {[
              '"I didn\'t realize I spent $600 on dining last month."',
              '"This makes everything so much clearer."',
              '"Finally understand where my paycheck actually goes."',
            ].map((q,i) => (
              <div key={i} style={{ background:'#0f1117', border:'1px solid #1e2030', borderRadius:14, padding:'18px 24px' }}>
                <p style={{ fontSize:15, color:'#94a3b8', fontStyle:'italic' }}>{q}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize:20, fontWeight:700, color:'#f1f5f9' }}>Clarity changes behavior.</p>
        </div>
      </section>

      {/* PRIVACY */}
      <section style={{ padding:'80px 64px', maxWidth:900, margin:'0 auto', textAlign:'center' }} id="about">
        <div style={{ background:'#0f1117', border:'1px solid #1e2030', borderRadius:24, padding:'48px 56px' }}>
          <div style={{ fontSize:36, marginBottom:16 }}>🔐</div>
          <h2 style={{ fontSize:32, fontWeight:800, marginBottom:16 }}>Private by default</h2>
          <p style={{ fontSize:16, color:'#64748b', lineHeight:1.8, maxWidth:500, margin:'0 auto 32px' }}>
            Your financial data stays on your device. No bank connections. No unnecessary access. No ads. Ever.
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:32, flexWrap:'wrap' }}>
            {['No bank login', 'No data selling', 'No subscriptions', 'Works offline'].map((t,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:'#10b981', fontSize:14 }}>✓</span>
                <span style={{ fontSize:14, color:'#64748b' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'80px 64px 100px', textAlign:'center' }}>
        <h2 style={{ fontSize:48, fontWeight:900, letterSpacing:'-1.5px', marginBottom:20, lineHeight:1.1 }}>
          Start understanding your<br/>money today
        </h2>
        <p style={{ fontSize:18, color:'#64748b', marginBottom:36 }}>Takes 30 seconds. No signup required.</p>
        <Link to="/signup" style={{ background:'#2563eb', color:'#fff', fontSize:17, fontWeight:700, padding:'16px 40px', borderRadius:16, textDecoration:'none', boxShadow:'0 4px 32px rgba(37,99,235,0.5)', display:'inline-block' }}>
          Try it on your data →
        </Link>
        <p style={{ fontSize:13, color:'#334155', marginTop:20 }}>No bank connection · Free · Private</p>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid #1e2030', padding:'32px 64px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13 }}>x</div>
          <span style={{ fontWeight:700, fontSize:15, color:'#fff' }}>xspend</span>
        </div>
        <p style={{ fontSize:13, color:'#334155' }}>Built for clarity. Not complexity.</p>
        <p style={{ fontSize:13, color:'#334155' }}>© 2026 xspend</p>
      </footer>

    </div>
  )
}
