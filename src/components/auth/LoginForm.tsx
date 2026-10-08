import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import { FormInput } from './FormInput';
import { PasswordInput } from './PasswordInput';
import { AlertBanner } from './AlertBanner';

interface Props {
  language: 'en' | 'hi';
}

export const LoginForm: React.FC<Props> = ({ language }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authErr) setError(authErr.message);
    else navigate('/');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <AlertBanner type="error" message={error} />
      <FormInput
        required
        type="email"
        icon={Mail}
        placeholder={t(language, 'email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordInput
        required
        placeholder={t(language, 'password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <SubmitButton loading={loading} label={t(language, 'login')} />
    </form>
  );
};

// shared button — could be moved to its own file too
const SubmitButton: React.FC<{ loading: boolean; label: string }> = ({
  loading,
  label,
}) => (
  <button
    type="submit"
    disabled={loading}
    style={{
      width: '100%',
      padding: '14px 0',
      borderRadius: 10,
      border: 'none',
      background: loading
        ? 'var(--gray-300)'
        : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
      color: '#fff',
      fontWeight: 700,
      fontSize: 16,
      cursor: loading ? 'not-allowed' : 'pointer',
      marginTop: 8,
      boxShadow: '0 4px 16px rgba(102,0,51,0.3)',
      transition: 'opacity 0.15s',
    }}
  >
    {loading ? '...' : label}
  </button>
);
