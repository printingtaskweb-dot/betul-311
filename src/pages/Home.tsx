import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { HeroBanner } from '../components/HeroBanner';
import { StatsSection } from '../components/StatsSection';
import { ServicesGrid } from '../components/ServicesGrid';
import { RecentComplaints } from '../components/RecentComplaints';
import { BottomNav } from '../components/BottomNav';
import { Globe, LogOut } from 'lucide-react';

export const Home: React.FC = () => {
  const { language, setLanguage, user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: 80 }}>
      {/* ── Top bar ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid var(--gray-100)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🏛️</span>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--green-700)', lineHeight: 1 }}>IMC 311</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--gray-400)' }}>Indore Municipal Corporation</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 20,
              border: '1.5px solid var(--green-200)',
              background: 'var(--green-50)',
              color: 'var(--green-700)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Globe size={13} />
            {language === 'en' ? 'हिं' : 'EN'}
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #166534, #22c55e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 700,
              }}>
                {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <button
                onClick={handleLogout}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
              >
                <LogOut size={16} color="var(--gray-400)" />
              </button>
            </div>
          ) : (
            <Link to="/auth" style={{
              padding: '5px 12px', borderRadius: 20,
              background: 'var(--green-600)', color: '#fff',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
            }}>
              {t(language, 'login')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <HeroBanner />

      {/* ── Quick Actions ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link to="/complaint/new" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #166534, #16a34a)',
              borderRadius: 14, padding: '16px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 6px 20px rgba(22,163,74,0.25)',
            }}>
              <span style={{ fontSize: 26 }}>📸</span>
              <div>
                <p style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 14 }}>
                  {t(language, 'reportIssue')}
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                  {language === 'hi' ? 'फोटो + लोकेशन' : 'Photo + Location'}
                </p>
              </div>
            </div>
          </Link>
          <Link to="/track" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid var(--gray-200)',
              borderRadius: 14, padding: '16px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 26 }}>🔍</span>
              <div>
                <p style={{ margin: 0, color: 'var(--gray-800)', fontWeight: 800, fontSize: 14 }}>
                  {t(language, 'trackComplaint')}
                </p>
                <p style={{ margin: 0, color: 'var(--gray-400)', fontSize: 11 }}>
                  {language === 'hi' ? 'टिकट नंबर से' : 'By ticket number'}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <StatsSection />

      {/* ── Divider ── */}
      <div style={{ height: 8, background: 'var(--gray-100)' }} />

      {/* ── Green Dept Feature Card ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <Link to="/department/green" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #16a34a 80%, #22c55e 100%)',
            borderRadius: 16, padding: '20px 18px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
          }}>
            <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 90, opacity: 0.15, lineHeight: 1 }}>
              🌿
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 12, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 600,
              }}>
                ✨ {language === 'hi' ? 'नया' : 'NEW'}
              </span>
            </div>
            <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>
              🌿 {t(language, 'greenDeptTitle')}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 14px', fontSize: 13, lineHeight: 1.5 }}>
              {t(language, 'greenDeptSubtitle')}
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#fff', color: 'var(--green-700)',
              padding: '8px 16px', borderRadius: 20,
              fontWeight: 700, fontSize: 13,
            }}>
              {language === 'hi' ? 'शिकायत दर्ज करें' : 'Report Now'} →
            </span>
          </div>
        </Link>
      </div>

      {/* ── Services Grid ── */}
      <div style={{ height: 8, background: 'var(--gray-100)', marginTop: 20 }} />
      <ServicesGrid />

      {/* ── Recent Complaints ── */}
      <div style={{ height: 8, background: 'var(--gray-100)' }} />
      <RecentComplaints />

      {/* ── Admin shortcut ── */}
      <div style={{ padding: '0 16px 20px', textAlign: 'center' }}>
        <Link to="/admin" style={{ fontSize: 12, color: 'var(--gray-400)', textDecoration: 'none' }}>
          🔐 {t(language, 'adminDashboard')} →
        </Link>
      </div>

      <BottomNav />
    </div>
  );
};
