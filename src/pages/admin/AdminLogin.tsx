import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';

const ADMIN_PASSCODE = 'imc311admin';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  // If already logged in as designated admin (e.g. ouikey41@gmail.com), redirect directly
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      sessionStorage.setItem('imc_admin', '1');
      navigate('/admin/dashboard');
    } else {
      setError('Incorrect passcode. Please try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4338ca 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(28px, 4vw, 40px) clamp(20px, 3vw, 36px)',
          width: '100%',
          maxWidth: 400,
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.82rem',
            color: 'var(--gray-500)',
            marginBottom: 20,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Citizen Portal
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--indigo-50)',
              color: 'var(--indigo-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
            Admin Console
          </h2>
          <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            Indore & Betul Municipal Corporation
          </p>
        </div>

        {user && (
          <div
            style={{
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: '0.8rem',
              color: 'var(--gray-600)',
            }}
          >
            Logged in as: <strong>{user.email}</strong>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Lock
              size={16}
              color="var(--gray-400)"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="password"
              placeholder="Enter admin passcode"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px 12px 40px',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${error ? '#dc2626' : 'var(--gray-200)'}`,
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0 0 12px', fontWeight: 600 }}>{error}</p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'linear-gradient(135deg, #312e81, #4f46e5)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            Access Dashboard
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.78rem', color: 'var(--gray-400)' }}>
          Admin account <code>ouikey41@gmail.com</code> can access directly when logged in.
        </p>
      </div>
    </div>
  );
};
