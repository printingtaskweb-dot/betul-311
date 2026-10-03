import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { Home, Plus, Search, User, LayoutDashboard } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { language, user } = useAuth();
  const loc = useLocation();

  const items = [
    { path: '/', icon: <Home size={21} />, label: t(language, 'home') },
    { path: '/complaint/new', icon: <Plus size={21} />, label: t(language, 'reportIssue') },
    { path: '/track', icon: <Search size={21} />, label: t(language, 'trackComplaint') },
    user
      ? { path: '/admin/dashboard', icon: <LayoutDashboard size={21} />, label: t(language, 'adminDashboard') }
      : { path: '/auth', icon: <User size={21} />, label: t(language, 'login') },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: 'rgba(255,255,255,0.95)',
      borderTop: '1px solid var(--gray-200)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 0 12px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
    }}>
      {items.map((item) => {
        const active = loc.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, textDecoration: 'none',
              color: active ? 'var(--green-600)' : 'var(--gray-400)',
              transition: 'color 0.15s',
              minWidth: 60,
            }}
          >
            {item.path === '/complaint/new' ? (
              <div style={{
                width: 48, height: 48, borderRadius: '50%', marginTop: -20,
                background: 'linear-gradient(135deg, #166534, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(22,163,74,0.4)',
                border: '3px solid #fff',
              }}>
                <Plus size={22} color="#fff" />
              </div>
            ) : (
              <div style={{
                padding: '4px 12px', borderRadius: 20,
                background: active ? 'var(--green-50)' : 'transparent',
                color: active ? 'var(--green-600)' : 'var(--gray-400)',
                transition: 'all 0.15s',
              }}>
                {item.icon}
              </div>
            )}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.2 }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
