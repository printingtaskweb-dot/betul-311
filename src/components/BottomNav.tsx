import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { Home, Plus, Search, ShieldCheck, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { language, user, isAdmin } = useAuth();
  const loc = useLocation();

  const items = [
    { path: '/', icon: <Home size={21} />, label: t(language, 'home') },
    { path: '/complaint/new', icon: <Plus size={21} />, label: t(language, 'reportIssue') },
    { path: '/track', icon: <Search size={21} />, label: t(language, 'trackComplaint') },
    // Admin button visible ONLY to admin users
    ...(isAdmin
      ? [
          {
            path: '/admin/dashboard',
            icon: <ShieldCheck size={21} />,
            label: language === 'hi' ? 'एडमिन' : 'Admin',
            isAdminBadge: true,
          },
        ]
      : [
          {
            path: user ? '/track' : '/auth',
            icon: <User size={21} />,
            label: user ? (language === 'hi' ? 'मेरी स्थिति' : 'Status') : t(language, 'login'),
            isAdminBadge: false,
          },
        ]),
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        borderTop: '1px solid var(--gray-200)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 0 10px',
        boxShadow: '0 -4px 20px rgba(15,23,42,0.06)',
      }}
    >
      {items.map((item) => {
        const active = loc.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              textDecoration: 'none',
              color: active
                ? item.isAdminBadge
                  ? 'var(--indigo-600)'
                  : 'var(--green-600)'
                : 'var(--gray-400)',
              transition: 'var(--transition)',
              minWidth: 64,
            }}
          >
            {item.path === '/complaint/new' ? (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  marginTop: -22,
                  background: 'linear-gradient(135deg, #15803d, #22c55e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(22,163,74,0.4)',
                  border: '3px solid #fff',
                }}
              >
                <Plus size={24} color="#fff" />
              </div>
            ) : (
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: active
                    ? item.isAdminBadge
                      ? 'var(--indigo-50)'
                      : 'var(--green-50)'
                    : 'transparent',
                  color: active
                    ? item.isAdminBadge
                      ? 'var(--indigo-600)'
                      : 'var(--green-600)'
                    : 'var(--gray-400)',
                  transition: 'var(--transition)',
                }}
              >
                {item.icon}
              </div>
            )}
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.2,
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
