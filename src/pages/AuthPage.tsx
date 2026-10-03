import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react';

type Mode = 'login' | 'register';

const LANG_OPTIONS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [showPass, setShowPass] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('');
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi'>(language);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setSelectedLang(lang);
    setLanguage(lang);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigate('/');
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }

    if (data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        full_name: fullName,
        phone,
        ward_number: ward,
        language: selectedLang,
      });
    }
    setSuccess('Account created! Check your email to verify.');
    setLoading(false);
  };

  const handleGuest = () => navigate('/');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, #14532d 0%, #166534 40%, #16a34a 100%)',
        padding: '40px 24px 60px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />
        <div style={{ fontSize: 44, marginBottom: 10 }}>🏛️</div>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: 1 }}>IMC 311</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 13 }}>
          Indore Municipal Corporation
        </p>

        {/* Language switcher */}
        <div style={{
          display: 'inline-flex', gap: 0,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 24, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.25)',
          marginTop: 16,
        }}>
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => handleLanguageChange(opt.code as 'en' | 'hi')}
              style={{
                padding: '7px 18px',
                border: 'none', cursor: 'pointer',
                background: selectedLang === opt.code ? '#fff' : 'transparent',
                color: selectedLang === opt.code ? '#166534' : 'rgba(255,255,255,0.85)',
                fontWeight: selectedLang === opt.code ? 700 : 500,
                fontSize: 13, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {opt.flag} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 440, margin: '-28px auto 0', padding: '0 16px 100px' }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid var(--gray-100)' }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '16px 0',
                  border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  fontWeight: 700, fontSize: 15,
                  color: mode === m ? 'var(--green-700)' : 'var(--gray-400)',
                  borderBottom: mode === m ? '2.5px solid var(--green-600)' : '2.5px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'login' ? t(language, 'login') : t(language, 'register')}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px 24px' }}>
            {error && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '10px 14px',
                color: '#dc2626', fontSize: 13, marginBottom: 16,
              }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{
                background: 'var(--green-50)', border: '1px solid var(--green-200)',
                borderRadius: 10, padding: '10px 14px',
                color: 'var(--green-700)', fontSize: 13, marginBottom: 16,
              }}>
                ✅ {success}
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
              {/* Register-only fields */}
              {mode === 'register' && (
                <>
                  <div style={fieldStyle}>
                    <User size={15} color="var(--gray-400)" style={iconStyle} />
                    <input
                      required placeholder={t(language, 'fullName')}
                      value={fullName} onChange={(e) => setFullName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldStyle}>
                    <Phone size={15} color="var(--gray-400)" style={iconStyle} />
                    <input
                      placeholder={t(language, 'phone')}
                      value={phone} onChange={(e) => setPhone(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldStyle}>
                    <MapPin size={15} color="var(--gray-400)" style={iconStyle} />
                    <input
                      placeholder={`${t(language, 'ward')} (${t(language, 'optional')})`}
                      value={ward} onChange={(e) => setWard(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* Common fields */}
              <div style={fieldStyle}>
                <Mail size={15} color="var(--gray-400)" style={iconStyle} />
                <input
                  required type="email" placeholder={t(language, 'email')}
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ ...fieldStyle, position: 'relative' }}>
                <Lock size={15} color="var(--gray-400)" style={iconStyle} />
                <input
                  required type={showPass ? 'text' : 'password'}
                  placeholder={t(language, 'password')}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showPass ? <EyeOff size={16} color="var(--gray-400)" /> : <Eye size={16} color="var(--gray-400)" />}
                </button>
              </div>

              {mode === 'register' && (
                <div style={fieldStyle}>
                  <Lock size={15} color="var(--gray-400)" style={iconStyle} />
                  <input
                    required type="password" placeholder={t(language, 'confirmPassword')}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px 0',
                  borderRadius: 10, border: 'none',
                  background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg, #166534, #16a34a)',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: 8, boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? '...' : mode === 'login' ? t(language, 'login') : t(language, 'createAccount')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>{t(language, 'orContinueAs')}</span>
            </div>

            <button
              onClick={handleGuest}
              style={{
                width: '100%', padding: '11px 0', marginTop: 12,
                borderRadius: 10, border: '1.5px solid var(--gray-200)',
                background: 'var(--gray-50)', color: 'var(--gray-600)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              👤 {t(language, 'guestMode')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const fieldStyle: React.CSSProperties = {
  position: 'relative', marginBottom: 12,
};
const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 12px 12px 36px',
  borderRadius: 10, border: '1.5px solid var(--gray-200)',
  fontSize: 14, color: 'var(--gray-900)', outline: 'none',
  background: 'var(--gray-50)', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
