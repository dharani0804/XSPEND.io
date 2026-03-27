import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const name = localStorage.getItem('user_name') || 'You'
  const isActive = (path) => location.pathname.startsWith(path)

  const handleProfileClick = () => {
    // Go to onboarding without clearing — just navigate
    navigate('/onboarding')
  }

  const S = {
    nav: { background:'#12121e', borderBottom:'1px solid #1e1e2e', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:52, fontFamily:'DM Sans, Inter, sans-serif', position:'sticky', top:0, zIndex:100 },
    logo: { display:'flex', alignItems:'center', gap:10, textDecoration:'none' },
    logoBox: { width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14 },
    logoText: { color:'#fff', fontWeight:700, fontSize:15 },
    navLinks: { display:'flex', alignItems:'center', gap:4 },
    navLink: (active) => ({ padding:'6px 14px', borderRadius:8, textDecoration:'none', fontSize:13, fontWeight:500, color:active?'#fff':'#6a6a8a', background:active?'#2563eb':'transparent', transition:'all 0.15s' }),
    avatar: { width:32, height:32, borderRadius:'50%', background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', border:'2px solid #1e1e2e' },
  }

  return (
    <nav style={S.nav}>
      <Link to="/app/upload" style={S.logo}>
        <div style={S.logoBox}>F</div>
        <span style={S.logoText}>FinanceAI</span>
      </Link>

      <div style={S.navLinks}>
        <Link to="/app/upload" style={S.navLink(isActive('/app/upload'))}>📎 Upload</Link>
        <Link to="/app/dashboard" style={S.navLink(isActive('/app/dashboard'))}>📊 Dashboard</Link>
        <Link to="/app/chat" style={S.navLink(isActive('/app/chat'))}>💬 AI Chat</Link>
        <Link to="/app/goals" style={S.navLink(isActive('/app/goals'))}>🎯 Goals</Link>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Settings / profile shortcut */}
        <button
          onClick={handleProfileClick}
          style={{ background:'none', border:'1px solid #2a2a3a', borderRadius:8, padding:'5px 12px', fontSize:12, color:'#6a6a8a', cursor:'pointer', fontFamily:'inherit' }}
          title="Edit profile & preferences"
        >
          ⚙ Settings
        </button>

        {/* Avatar */}
        <div style={S.avatar} onClick={handleProfileClick} title="Edit profile">
          {name.charAt(0).toUpperCase()}
        </div>
      </div>
    </nav>
  )
}
