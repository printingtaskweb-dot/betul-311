import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

// Simple passcode-based admin login (no Supabase Auth needed for now)
const ADMIN_PASSCODE = 'imc311admin';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e40af, #4f46e5)', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '36px 32px',
        width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏛️</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#111827' }}>Admin Login</h2>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>IMC 311 – Department Dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Lock size={16} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="password"
              placeholder="Enter admin passcode"
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value); setError(''); }}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 12px 12px 38px', borderRadius: 8,
                border: `1.5px solid ${error ? '#dc2626' : '#d1d5db'}`,
                fontSize: 15, outline: 'none',
              }}
            />
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

          <button
            type="submit"
            style={{
              width: '100%', padding: '13px 0', borderRadius: 8,
              border: 'none', background: 'linear-gradient(135deg, #1e40af, #4f46e5)',
              color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}
          >
            Login
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#d1d5db' }}>
          Default passcode: <code>imc311admin</code>
        </p>
      </div>
    </div>
  );
};
