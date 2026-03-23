import { useState } from 'react';
import { useAuth } from './AuthContext';

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60);
}

export default function Login() {
  const { login, register } = useAuth();
  const [tab, setTab]       = useState('login');   // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  // Login state
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');

  // Register state
  const [reg, setReg] = useState({
    org_name: '', org_slug: '', name: '', email: '', password: '', confirm: ''
  });

  const handleReg = (k, v) => setReg(p => ({
    ...p, [k]: v,
    ...(k === 'org_name' ? { org_slug: slugify(v) } : {})
  }));

  const submitLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); }
    catch (err) { setError(err.response?.data?.detail || 'Login failed.'); }
    finally { setLoading(false); }
  };

  const submitRegister = async (e) => {
    e.preventDefault(); setError(''); 
    const pwdRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!pwdRegex.test(reg.password)) {
      setError('Password must contain at least 8 characters, including a number and a letter.');
      return;
    }
    if (reg.password !== reg.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await register({ org_name: reg.org_name, org_slug: reg.org_slug,
                       name: reg.name, email: reg.email, password: reg.password });
    } catch (err) { setError(err.response?.data?.detail || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--clr-bg)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/favicon.png" alt="Logo" style={{
            width: 48, height: 48, borderRadius: 10,
            margin: '0 auto 12px', display: 'block'
          }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--clr-text)', margin: 0 }}>HR Intelligence</h1>
          <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', marginTop: 4 }}>Attrition Prediction Platform</p>
        </div>

        <div className="card" style={{ padding: '28px 28px 24px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--clr-bg)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 5, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  background: tab === t ? '#fff' : 'transparent',
                  color: tab === t ? 'var(--clr-text)' : 'var(--clr-text-muted)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '9px 12px', background: 'var(--clr-danger-muted)',
              border: '1px solid var(--clr-danger)', borderRadius: 'var(--radius-sm)',
              color: 'var(--clr-danger)', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* ── Login ─────────────────── */}
          {tab === 'login' && (
            <form onSubmit={submitLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" required
                  value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
              </div>
              <button className="btn btn--primary btn--full" type="submit" disabled={loading} style={{ marginTop: 4, padding: '10px' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── Register ──────────────── */}
          {tab === 'register' && (
            <form onSubmit={submitRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" required value={reg.name}
                  onChange={e => handleReg('name', e.target.value)} placeholder="Alok Sharma" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" required value={reg.email}
                  onChange={e => handleReg('email', e.target.value)} placeholder="alok@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Organisation Name</label>
                <input className="form-input" required value={reg.org_name}
                  onChange={e => handleReg('org_name', e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="form-group">
                <label className="form-label">Organisation Slug <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400 }}>(unique ID)</span></label>
                <input className="form-input" required value={reg.org_slug}
                  onChange={e => handleReg('org_slug', e.target.value)} placeholder="acme-corp"
                  style={{ fontFamily: 'monospace', fontSize: 12 }} />
                <span style={{ fontSize: 10, color: 'var(--clr-text-muted)', marginTop: 2 }}>Auto-generated from org name. Must be unique.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Password <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400 }}>(min. 8 chars, 1 letter, 1 number)</span></label>
                <input className="form-input" type="password" required value={reg.password}
                  onChange={e => handleReg('password', e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" required value={reg.confirm}
                  onChange={e => handleReg('confirm', e.target.value)} placeholder="Repeat password" />
              </div>
              <button className="btn btn--primary btn--full" type="submit" disabled={loading} style={{ marginTop: 4, padding: '10px' }}>
                {loading ? 'Creating account…' : 'Create Account & Organisation'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--clr-text-muted)', marginTop: 16 }}>
          Each organisation's data is isolated — only your team can see your employees.
        </p>
      </div>
    </div>
  );
}
