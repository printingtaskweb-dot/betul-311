import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, ArrowLeft, ShieldCheck, LogIn, UserPlus } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  // If already logged in as admin, go straight to dashboard
  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  // While auth state is loading, show nothing (or a spinner)
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
        }}
      >
        <div style={{ color: '#fff', fontWeight: 700 }}>Checking authentication…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(28px, 4vw, 40px) clamp(20px, 3vw, 36px)',
          width: '100%',
          maxWidth: 420,
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

        {/* Case 1: Not logged in at all */}
        {!user && (
          <>
            <div
              style={{
                background: 'var(--indigo-50)',
                border: '1px solid var(--indigo-200)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: 18,
                fontSize: '0.85rem',
                color: 'var(--indigo-900)',
                lineHeight: 1.5,
              }}
            >
              <Lock size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              You must sign in with an <strong>administrator account</strong> to access the dashboard.
            </div>

            <button
              onClick={() => navigate('/auth?redirect=/admin/dashboard')}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <LogIn size={16} /> Login
            </button>

            <button
              onClick={() => navigate('/auth?mode=register&redirect=/admin/dashboard')}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--gray-300)',
                background: 'var(--gray-50)',
                color: 'var(--gray-700)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <UserPlus size={16} /> Register
            </button>
          </>
        )}

        {/* Case 2: Logged in but NOT admin */}
        {user && !isAdmin && (
          <>
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: '0.85rem',
                color: '#dc2626',
                lineHeight: 1.5,
              }}
            >
              ⚠️ You are logged in as <strong>{user.email}</strong>, but this account does not have
              administrator privileges.
            </div>

            <div
              style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: '0.82rem',
                color: 'var(--gray-600)',
              }}
            >
              Please sign in with an authorized admin account, or contact the municipal IT cell
              to request admin access.
            </div>

            <button
              onClick={() => navigate('/auth?redirect=/admin/dashboard')}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <LogIn size={16} /> Switch Account
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.78rem', color: 'var(--gray-400)' }}>
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
};
