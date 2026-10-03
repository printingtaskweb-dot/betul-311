import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Mail, Lock, LogIn, Eye, EyeOff,
  ShieldCheck, ArrowRight, User, Phone, ChevronDown,
  Clock, CheckCircle, AlertCircle, ArrowUpCircle, LogOut
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export default function DeptLogin() {
  const { user, profile, refreshProfile, signOut, language } = useAuth();
  const navigate = useNavigate();
  const hi = language === 'hi';

  // Navigation states: 'login' | 'register' | 'upgrade' | 'pending'
  const [mode, setMode] = useState<'login' | 'register' | 'upgrade' | 'pending'>('login');
  const [registerType, setRegisterType] = useState<'existing' | 'new'>('existing');

  // Fields
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [fullName, setFullName]         = useState('');
  const [phone, setPhone]               = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [departments, setDepartments]   = useState<Department[]>([]);

  // Load departments
  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name, slug, icon')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  // Detect already logged in user's role
  useEffect(() => {
    if (!user) return;

    if (profile?.role === 'dept_staff' || profile?.role === 'admin') {
      navigate('/dept/dashboard', { replace: true });
    } else if (profile?.role === 'pending_staff') {
      setMode('pending');
    } else {
      // User is logged in as a normal citizen -> direct them to upgrade their existing profile!
      setMode('upgrade');
      setEmail(user.email || '');
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.phone) setPhone(profile.phone);
    }
  }, [user, profile, navigate]);

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

  // ── 1. LOGIN HANDLER ───────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      // Check profile
      const { data: userProf } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userProf?.role === 'dept_staff' || userProf?.role === 'admin') {
        navigate('/dept/dashboard');
      } else if (userProf?.role === 'pending_staff') {
        setMode('pending');
      } else {
        // User is registered as a citizen! Do not block them; offer upgrade!
        if (userProf?.full_name) setFullName(userProf.full_name);
        if (userProf?.phone) setPhone(userProf.phone);
        setMode('upgrade');
        setError(
          hi
            ? 'आपका खाता एक नागरिक के रूप में पंजीकृत है। कृपया विभाग स्टाफ में अपग्रेड करने के लिए अपना विभाग चुनें।'
            : 'Welcome! Your account is registered as a citizen. Please select your department below to upgrade to Department Staff.'
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── 2. UPGRADE EXISTING PROFILE HANDLER (NO NEW ACCOUNT CREATED!) ──────────
  const handleUpgradeExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDept) {
      setError(hi ? 'कृपया अपना विभाग चुनें' : 'Please select your department');
      return;
    }

    setLoading(true);
    try {
      let targetUserId = user?.id;
      let targetEmail = user?.email || email;

      // If not currently logged in, sign in first with credentials
      if (!targetUserId) {
        const { data: signinData, error: signinErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signinErr) throw signinErr;
        targetUserId = signinData.user.id;
        targetEmail = signinData.user.email || email;
      }

      // Upgrade existing profile in-place!
      const { error: upsertErr } = await supabase.from('user_profiles').upsert({
        id: targetUserId,
        email: targetEmail.trim().toLowerCase(),
        full_name: fullName.trim() || profile?.full_name || 'Staff Member',
        phone: phone.trim() || profile?.phone || null,
        language: language,
        role: 'pending_staff',               // elevated to pending department staff
        linked_department_id: selectedDept,   // linked department added
      });

      if (upsertErr) throw upsertErr;

      await refreshProfile();
      setMode('pending');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upgrade request failed');
    } finally {
      setLoading(false);
    }
  };

  // ── 3. REGISTER NEW USER HANDLER ──────────────────────────────────────────
  const handleRegisterNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDept) {
      setError(hi ? 'कृपया अपना विभाग चुनें' : 'Please select your department');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      // If user is already registered, automatically switch to upgrade mode!
      if (signErr) {
        if (
          signErr.message.toLowerCase().includes('already registered') ||
          signErr.message.toLowerCase().includes('already exists')
        ) {
          setRegisterType('existing');
          setError(
            hi
              ? 'यह ईमेल पहले से पंजीकृत है! कृपया अपना पासवर्ड दर्ज करके अपने मौजूदा खाते को विभाग में अपग्रेड करें।'
              : 'This email is already registered! Please enter your password to upgrade your existing account.'
          );
          return;
        }
        throw signErr;
      }

      if (data.user) {
        const { error: profErr } = await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          language: language,
          role: 'pending_staff',
          linked_department_id: selectedDept,
        });
        if (profErr) throw profErr;
      }

      await supabase.auth.signOut();
      setMode('pending');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutUser = async () => {
    await signOut();
    setMode('login');
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setSelectedDept('');
    setError(null);
  };

  // ── PENDING APPROVAL SCREEN ───────────────────────────────────────────────
  if (mode === 'pending') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 440, width: '100%', background: '#fff',
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

          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900, color: 'var(--gray-900)' }}>
            {hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval'}
          </h2>

          <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
            {hi
              ? 'आपका विभाग आवेदन दर्ज कर लिया गया है! एडमिन द्वारा स्वीकृति के बाद आप विभाग पोर्टल में प्रवेश कर सकेंगे।'
              : 'Your department upgrade request has been submitted! Once approved by the municipal admin, you can access the department portal.'}
          </p>

          <div style={{
            padding: '14px 18px', background: '#f0fdf4', borderRadius: 'var(--radius-md)',
            border: '1.5px solid #bbf7d0', marginBottom: 22,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
              <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.85rem', color: '#15803d' }}>
                  {hi ? 'खाता स्थिति:' : 'Account Status:'}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#065f46', lineHeight: 1.6 }}>
                  {user?.email ? `${user.email} • ` : ''}
                  {hi ? 'आवेदन एडमिन कंसोल में समीक्षाधीन है।' : 'Application under review in Admin Console.'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', padding: '12px', border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #15803d, #16a34a)',
              color: '#fff', fontWeight: 800, fontSize: '0.9rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 7,
            }}
          >
            {hi ? 'होम पर जाएं' : 'Go to Home'}
          </button>

          <button
            onClick={handleSignOutUser}
            style={{
              marginTop: 10, width: '100%', padding: '10px', border: 'none',
              background: 'none', color: 'var(--gray-400)', fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 5,
            }}
          >
            <LogOut size={13} /> {hi ? 'लॉगआउट करें' : 'Log out / Switch User'}
          </button>
        </div>
      </div>
    );
  }

  // ── 4. LOGGED IN CITIZEN UPGRADE VIEW ──────────────────────────────────────
  if (mode === 'upgrade' && user) {
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
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            padding: '26px 28px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <ArrowUpCircle size={28} color="#fff" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
              {hi ? 'मौजूदा खाता अपग्रेड करें' : 'Upgrade Existing Account'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
              {hi ? 'नागरिक खाते में विभाग की जानकारी जोड़ें' : 'Add Department role to your profile'}
            </p>
          </div>

          <form onSubmit={handleUpgradeExisting} style={{ padding: '24px' }}>
            {/* Account Info Badge */}
            <div style={{
              padding: '12px 14px', background: '#f0fdf4',
              borderRadius: 'var(--radius-md)', border: '1.5px solid #bbf7d0',
              marginBottom: 18,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                {hi ? 'मौजूदा लॉगिन खाता' : 'Logged-in Account'}
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#065f46' }}>
                {user.email}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--gray-500)' }}>
                {hi
                  ? 'कोई नया खाता नहीं बनेगा। यही प्रोफ़ाइल विभाग स्टाफ में अपग्रेड होगी।'
                  : 'No new account will be created. Your existing profile will simply be upgraded.'}
              </p>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', fontSize: '0.83rem', fontWeight: 600, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* Department Selection */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-700)' }}>
                🏢 {hi ? 'विभाग चुनें *' : 'Select Department to Join *'}
              </label>
              <div style={{ position: 'relative' }}>
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
                    {hi ? '— अपना विभाग चुनें —' : '— Select your Department —'}
                  </option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Full Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-700)' }}>
                👤 {hi ? 'अधिकारी / कर्मचारी का नाम' : 'Staff Member Name'}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={iconStyle} />
                <input
                  type="text"
                  placeholder={hi ? 'पूरा नाम' : 'Full Name'}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-700)' }}>
                📞 {hi ? 'संपर्क नंबर' : 'Official Phone Number'}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={iconStyle} />
                <input
                  type="tel"
                  placeholder={hi ? 'मोबाइल नंबर' : 'Phone Number'}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

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
              }}
            >
              {loading ? (
                <span className="spinner" style={{ width: 18, height: 18 }} />
              ) : (
                <>
                  <ShieldCheck size={16} />
                  {hi ? 'प्रोफ़ाइल अपग्रेड का अनुरोध करें' : 'Submit Upgrade Request'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOutUser}
              style={{
                width: '100%', marginTop: 14, padding: '10px',
                border: 'none', background: 'none',
                color: 'var(--gray-500)', fontSize: '0.82rem',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <LogOut size={13} />
              {hi ? 'दूसरे खाते से लॉगिन करें' : 'Use a different account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── 5. NOT LOGGED IN: LOGIN & REGISTER/APPLY TABS ─────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f4c2a 0%, #16a34a 50%, #4ade80 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 450,
        background: '#fff', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* Header */}
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
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
            {hi ? 'IMC 311 — नगर निगम विभागीय समाधान' : 'IMC 311 — Municipal Department Console'}
          </p>
        </div>

        {/* Tab Switch: Login vs Apply */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-100)' }}>
          {[
            { id: 'login', label: hi ? '🔑 स्टाफ लॉगिन' : '🔑 Staff Login' },
            { id: 'register', label: hi ? '🏢 विभाग के लिए आवेदन' : '🏢 Apply for Dept' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id as 'login' | 'register'); setError(null); }}
              style={{
                flex: 1, padding: '13px', border: 'none', background: 'none',
                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                color: mode === tab.id ? 'var(--green-700)' : 'var(--gray-400)',
                borderBottom: mode === tab.id ? '2.5px solid var(--green-600)' : '2.5px solid transparent',
                transition: 'all 0.2s', marginBottom: -2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
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

          {/* ── MODE: LOGIN ────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
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

              <div style={{ position: 'relative', marginBottom: 20 }}>
                <Lock size={15} style={iconStyle} />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder={hi ? 'पासवर्ड *' : 'Password *'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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
                }}
              >
                {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <><LogIn size={16} /> {hi ? 'लॉगिन करें' : 'Login to Department'}</>}
              </button>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: '#15803d', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {hi ? 'नागरिक खाता है? विभाग में अपग्रेड करें →' : 'Have a citizen account? Upgrade to Department →'}
                </button>
              </div>
            </form>
          )}

          {/* ── MODE: REGISTER / UPGRADE ────────────────────────────── */}
          {mode === 'register' && (
            <div>
              {/* Toggle: Existing Citizen Account vs Brand New User */}
              <div style={{
                display: 'flex',
                background: 'var(--gray-100)',
                padding: 4,
                borderRadius: 'var(--radius-md)',
                marginBottom: 16,
              }}>
                <button
                  type="button"
                  onClick={() => { setRegisterType('existing'); setError(null); }}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: registerType === 'existing' ? '#fff' : 'transparent',
                    color: registerType === 'existing' ? '#15803d' : 'var(--gray-600)',
                    fontWeight: registerType === 'existing' ? 800 : 600,
                    fontSize: '0.8rem', cursor: 'pointer',
                    boxShadow: registerType === 'existing' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {hi ? '👤 मौजूदा खाता अपग्रेड' : '👤 Upgrade Existing Account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setRegisterType('new'); setError(null); }}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: registerType === 'new' ? '#fff' : 'transparent',
                    color: registerType === 'new' ? '#15803d' : 'var(--gray-600)',
                    fontWeight: registerType === 'new' ? 800 : 600,
                    fontSize: '0.8rem', cursor: 'pointer',
                    boxShadow: registerType === 'new' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {hi ? '✨ नया खाता' : '✨ Brand New Account'}
                </button>
              </div>

              {/* Helpful Banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                padding: '10px 12px', background: 'var(--green-50)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--green-200)',
              }}>
                <AlertCircle size={15} color="var(--green-700)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--green-900)', fontWeight: 600, lineHeight: 1.4 }}>
                  {registerType === 'existing'
                    ? (hi ? 'आपका पुराना खाता नहीं बदलेगा, सिर्फ विभाग की जानकारी और स्टाफ रोल जुड़ेगा।' : 'Your existing account stays the same. We just link your department information.')
                    : (hi ? 'नए स्टाफ सदस्य के लिए खाता बनाया जाएगा।' : 'Creates a new account for a staff member.')}
                </span>
              </div>

              <form onSubmit={registerType === 'existing' ? handleUpgradeExisting : handleRegisterNew}>
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
                      {hi ? '— अपना विभाग चुनें * —' : '— Select your Department * —'}
                    </option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.icon} {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Full Name */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <User size={15} style={iconStyle} />
                  <input
                    type="text"
                    placeholder={hi ? 'पूरा नाम' : 'Full Name'}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Phone */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Phone size={15} style={iconStyle} />
                  <input
                    type="tel"
                    placeholder={hi ? 'मोबाइल नंबर (वैकल्पिक)' : 'Phone Number (optional)'}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={inputStyle}
                  />
                </div>

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
                  }}
                >
                  {loading ? (
                    <span className="spinner" style={{ width: 18, height: 18 }} />
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      {registerType === 'existing'
                        ? (hi ? 'खाता अपग्रेड का आवेदन करें' : 'Submit Upgrade Request')
                        : (hi ? 'नया स्टाफ खाता बनाएं' : 'Submit Registration')}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Back to Home */}
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '100%', marginTop: 14, padding: '8px',
              border: 'none', background: 'none',
              color: 'var(--gray-400)', fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} />
            {hi ? 'होम पर वापस जाएं' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
