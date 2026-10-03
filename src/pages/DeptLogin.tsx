import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, Lock, LogIn, Eye, EyeOff,
  ShieldCheck, ArrowRight, User, Phone, ChevronDown,
  Clock, CheckCircle, AlertCircle
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export default function DeptLogin() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const hi = language === 'hi';

  // Form state
  const [mode, setMode] = useState<'login' | 'register' | 'pending'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Load departments for dropdown
  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name, slug, icon')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px 11px 40px',
    border: '1.5px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-primary)',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 13,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--gray-400)',
    pointerEvents: 'none',
  };

  // ── LOGIN ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, linked_department_id, approval_status')
        .eq('id', data.user.id)
        .single();

      // Pending approval
      if (profile?.role === 'pending_staff') {
        await supabase.auth.signOut();
        setMode('pending');
        return;
      }

      // Not approved
      if (!profile || !['dept_staff', 'admin'].includes(profile.role ?? '')) {
        await supabase.auth.signOut();
        throw new Error(
          hi
            ? 'आपके पास विभाग पोर्टल की अनुमति नहीं है। Admin से संपर्क करें।'
            : 'No department portal access. Contact your admin.'
        );
      }

      navigate('/dept/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedDept) {
      setError(hi ? 'कृपया विभाग चुनें' : 'Please select your department');
      return;
    }
    setLoading(true);
    try {
      // 1. Create auth user
      const { data, error: signErr } = await supabase.auth.signUp({ email, password });
      if (signErr) throw signErr;

      if (data.user) {
        // 2. Create profile with role = pending_staff
        const { error: profErr } = await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName,
          phone: phone || null,
          language: language,
          role: 'pending_staff',               // needs admin approval
          linked_department_id: selectedDept,   // dept chosen at registration
          is_admin: false,
        });
        if (profErr) throw profErr;
      }

      // Sign them out immediately — they wait for approval
      await supabase.auth.signOut();
      setMode('pending');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── PENDING SCREEN ───────────────────────────────────────────────────────
  if (mode === 'pending') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 420, width: '100%', background: '#fff',
          borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          padding: 36, textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#fef3c7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Clock size={32} color="#d97706" />
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--gray-900)' }}>
            {hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval'}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
            {hi
              ? 'आपका पंजीकरण सफल हुआ! Admin आपके अनुरोध की समीक्षा करेगा और आपको विभाग पोर्टल की अनुमति देगा।'
              : 'Registration successful! Your request is under review. Admin will approve your account and you can then login.'}
          </p>
          <div style={{
            padding: '14px 18px', background: '#f0fdf4', borderRadius: 'var(--radius-md)',
            border: '1.5px solid #bbf7d0', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
              <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.85rem', color: '#15803d' }}>
                  {hi ? 'क्या होगा अगला?' : 'What happens next?'}
                </p>
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: '0.8rem', color: '#065f46', lineHeight: 1.8 }}>
                  <li>{hi ? 'Admin आपके अनुरोध को Admin Dashboard में देखेगा' : 'Admin reviews your request in Admin Dashboard'}</li>
                  <li>{hi ? 'Approve होने पर आप /dept/login से login कर सकते हैं' : 'Once approved, login at /dept/login'}</li>
                  <li>{hi ? 'आप अपने विभाग की शिकायतें देख व हल कर सकते हैं' : 'Manage your department\'s complaints'}</li>
                </ol>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              width: '100%', padding: '12px', border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #15803d, #16a34a)',
              color: '#fff', fontWeight: 800, fontSize: '0.9rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 7,
            }}
          >
            <LogIn size={15} /> {hi ? 'लॉगिन पर वापस जाएं' : 'Back to Login'}
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 10, width: '100%', padding: '10px', border: 'none',
              background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem', cursor: 'pointer',
            }}
          >
            {hi ? '← होम पर वापस' : '← Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN CARD ────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* ── Header ────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #15803d, #16a34a)',
          padding: '28px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Building2 size={28} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>
            {hi ? 'विभाग पोर्टल' : 'Department Portal'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
            {hi ? 'IMC 311 — विभाग स्टाफ पोर्टल' : 'IMC 311 — Dept Staff Portal'}
          </p>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-100)' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              style={{
                flex: 1, padding: '13px', border: 'none', background: 'none',
                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                color: mode === m ? 'var(--green-700)' : 'var(--gray-400)',
                borderBottom: mode === m ? '2.5px solid var(--green-600)' : '2.5px solid transparent',
                transition: 'all 0.2s', marginBottom: -2,
              }}
            >
              {m === 'login'
                ? (hi ? '🔑 लॉगिन' : '🔑 Login')
                : (hi ? '📝 पंजीकरण' : '📝 Register')}
            </button>
          ))}
        </div>

        {/* ── Form ──────────────────────────────────────────────────── */}
        <form
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          style={{ padding: '24px 24px 20px' }}
        >
          {/* Error / Info banner */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: error.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${error.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
              color: error.startsWith('✅') ? '#15803d' : '#dc2626',
              fontSize: '0.83rem', fontWeight: 600, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* ── REGISTER-ONLY FIELDS ─────────────────────────────── */}
          {mode === 'register' && (
            <>
              {/* Step indicator */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18,
                padding: '10px 14px', background: 'var(--green-50)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--green-200)',
              }}>
                <AlertCircle size={15} color="var(--green-700)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--green-800)', fontWeight: 600 }}>
                  {hi
                    ? 'पंजीकरण के बाद Admin आपका खाता approve करेगा।'
                    : 'Admin will approve your account before you can login.'}
                </span>
              </div>

              {/* Full Name */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <User size={15} style={iconStyle} />
                <input
                  type="text"
                  placeholder={hi ? 'पूरा नाम *' : 'Full Name *'}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {/* Phone */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Phone size={15} style={iconStyle} />
                <input
                  type="tel"
                  placeholder={hi ? 'मोबाइल नंबर' : 'Phone Number (optional)'}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Department Dropdown */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Building2 size={15} style={iconStyle} />
                <ChevronDown size={14} style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--gray-400)',
                  pointerEvents: 'none',
                }} />
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  required
                  style={{
                    ...inputStyle,
                    paddingRight: 36,
                    appearance: 'none',
                    cursor: 'pointer',
                    color: selectedDept ? 'var(--gray-900)' : 'var(--gray-400)',
                  }}
                >
                  <option value="" disabled>
                    {hi ? '— अपना विभाग चुनें *' : '— Select your Department *'}
                  </option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── SHARED FIELDS ──────────────────────────────────────── */}
          {/* Email */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Mail size={15} style={iconStyle} />
            <input
              type="email"
              placeholder={hi ? 'ईमेल पता *' : 'Email Address *'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Lock size={15} style={iconStyle} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder={hi ? 'पासवर्ड *' : 'Password *'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ ...inputStyle, paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)', border: 'none',
                background: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--gray-400)',
              }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', border: 'none',
              borderRadius: 'var(--radius-md)',
              background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, #15803d, #16a34a)',
              color: '#fff', fontWeight: 800, fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18 }} />
              : (
                <>
                  {mode === 'login' ? <LogIn size={16} /> : <ShieldCheck size={16} />}
                  {mode === 'login'
                    ? (hi ? 'लॉगिन करें' : 'Login to Portal')
                    : (hi ? 'अनुमोदन के लिए आवेदन करें' : 'Submit Registration')}
                </>
              )
            }
          </button>

          {/* Back home */}
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '100%', marginTop: 12, padding: '9px',
              border: 'none', background: 'none',
              color: 'var(--gray-400)', fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 5,
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
