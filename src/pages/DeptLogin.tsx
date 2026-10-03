import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, Lock, LogIn, Eye, EyeOff,
  ShieldCheck, ArrowRight
} from 'lucide-react';

export default function DeptLogin() {
  const { language } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [deptName, setDeptName] = useState('');

  const hi = language === 'hi';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      // Fetch profile to check role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, linked_department_id')
        .eq('id', data.user.id)
        .single();

      if (!profile || !['dept_staff', 'admin'].includes(profile.role ?? '')) {
        await supabase.auth.signOut();
        throw new Error(
          hi
            ? 'आपके पास विभाग पोर्टल की अनुमति नहीं है। कृपया admin से संपर्क करें।'
            : 'No department portal access. Please contact your admin.'
        );
      }
      navigate('/dept/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({ email, password });
      if (signErr) throw signErr;

      if (data.user) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          full_name: deptName,
          role: 'citizen', // Admin must upgrade to dept_staff via SQL
          language: language,
        });
      }

      setMode('login');
      setError(
        hi
          ? '✅ पंजीकरण सफल! Admin आपका रोल सेट करेगा। अभी लॉगिन करें।'
          : '✅ Registered! Admin will assign your department. Please login now.'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px 12px 42px',
    border: '1.5px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.92rem',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-primary)',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #15803d, #16a34a)',
          padding: '28px 32px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Building2 size={28} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>
            {hi ? 'विभाग पोर्टल' : 'Department Portal'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
            {hi ? 'IMC 311 — विभाग स्टाफ लॉगिन' : 'IMC 311 — Staff Login'}
          </p>
        </div>

        {/* Tab Switch */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-100)' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                background: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                color: mode === m ? 'var(--green-700)' : 'var(--gray-400)',
                borderBottom: mode === m ? '2.5px solid var(--green-600)' : '2.5px solid transparent',
                transition: 'all 0.2s',
                marginBottom: -2,
              }}
            >
              {m === 'login'
                ? (hi ? 'लॉगिन' : 'Login')
                : (hi ? 'पंजीकरण' : 'Register')}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          style={{ padding: '28px 28px 24px' }}
        >
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: error.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${error.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
              color: error.startsWith('✅') ? '#15803d' : '#dc2626',
              fontSize: '0.83rem',
              fontWeight: 600,
              marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <Building2 size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder={hi ? 'विभाग/स्टाफ नाम' : 'Department / Staff Name'}
                value={deptName}
                onChange={e => setDeptName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: 18 }}>
            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              type="email"
              placeholder={hi ? 'ईमेल पता' : 'Email Address'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ position: 'relative', marginBottom: 24 }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder={hi ? 'पासवर्ड' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--gray-400)',
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, #15803d, #16a34a)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
            }}
          >
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18 }} />
            ) : (
              <>
                {mode === 'login' ? <LogIn size={16} /> : <ShieldCheck size={16} />}
                {mode === 'login'
                  ? (hi ? 'लॉगिन करें' : 'Login to Portal')
                  : (hi ? 'पंजीकरण करें' : 'Register Account')}
              </>
            )}
          </button>

          {/* Info box for register */}
          {mode === 'register' && (
            <div style={{
              marginTop: 18,
              padding: '10px 14px',
              background: '#f0fdf4',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #bbf7d0',
              fontSize: '0.78rem',
              color: '#15803d',
              lineHeight: 1.6,
            }}>
              <strong>ℹ️ {hi ? 'नोट:' : 'Note:'}</strong>{' '}
              {hi
                ? 'पंजीकरण के बाद admin आपको विभाग असाइन करेगा, तब आप login कर सकते हैं।'
                : 'After registration, admin assigns your department via SQL. Then you can login.'}
            </div>
          )}

          {/* Back to home */}
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '10px',
              border: 'none',
              background: 'none',
              color: 'var(--gray-400)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} />
            {hi ? 'होम पर वापस जाएं' : 'Back to Home'}
          </button>
        </form>
      </div>
    </div>
  );
}
