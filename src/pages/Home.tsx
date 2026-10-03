import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { HeroBanner } from '../components/HeroBanner';
import { StatsSection } from '../components/StatsSection';
import { ServicesGrid } from '../components/ServicesGrid';
import { RecentComplaints } from '../components/RecentComplaints';
import { BottomNav } from '../components/BottomNav';
import { Globe, LogOut, ShieldAlert } from 'lucide-react';

export const Home: React.FC = () => {
  const { language, setLanguage, user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: 80 }}>
      {/* ── Top Bar / Header ── */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--gray-200)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="app-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          {/* Logo & City Title */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #15803d, #22c55e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
              }}
            >
              🏛️
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: 'var(--green-800)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                IMC · BETUL 311
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                {language === 'hi' ? 'नागरिक शिकायत पोर्टल' : 'Civic Grievance & Redressal'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links (Visible on screens >= 1024px) */}
          <nav className="desktop-nav-links" style={{ gap: 20, alignItems: 'center' }}>
            <Link
              to="/complaint/new"
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-700)', transition: 'var(--transition)' }}
            >
              {t(language, 'reportIssue')}
            </Link>
            <Link
              to="/department/green"
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--green-700)', transition: 'var(--transition)' }}
            >
              🌿 {language === 'hi' ? 'हरित कचरा' : 'Green Waste'}
            </Link>
            <Link
              to="/track"
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-700)', transition: 'var(--transition)' }}
            >
              {t(language, 'trackComplaint')}
            </Link>
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--indigo-700)',
                  background: 'var(--indigo-50)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--indigo-500)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ShieldAlert size={15} />
                {t(language, 'adminDashboard')}
              </Link>
            )}
          </nav>

          {/* Actions: Language Toggle, Admin badge, Profile/Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--green-200)',
                background: 'var(--green-50)',
                color: 'var(--green-800)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              title="Switch Language"
            >
              <Globe size={14} />
              {language === 'en' ? 'हिन्दी' : 'English'}
            </button>

            {/* Admin Badge & Direct Button - ONLY VISIBLE TO ADMIN USER */}
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, #312e81, #4f46e5)',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                }}
                className="admin-badge-pulse"
                title="Municipal Admin Panel"
              >
                <ShieldAlert size={14} />
                <span>Admin</span>
              </Link>
            )}

            {/* User Avatar / Login */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #15803d, #22c55e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  title={user.email || 'User Profile'}
                >
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    border: 'none',
                    background: 'var(--gray-100)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    padding: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={t(language, 'logout')}
                >
                  <LogOut size={16} color="var(--gray-600)" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, #15803d, #16a34a)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {t(language, 'login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Carousel ── */}
      <HeroBanner />

      {/* ── Quick Action Cards ── */}
      <section className="app-container" style={{ marginTop: 20 }}>
        <div className="two-col-responsive">
          <Link to="/complaint/new" style={{ textDecoration: 'none' }}>
            <div
              className="card-hover"
              style={{
                background: 'linear-gradient(135deg, #15803d 0%, #16a34a 60%, #22c55e 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(16px, 2.5vw, 24px)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 8px 24px rgba(22,163,74,0.22)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                📸
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'clamp(1rem, 1.2vw, 1.2rem)' }}>
                  {t(language, 'reportIssue')}
                </h3>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                  {language === 'hi' ? 'फोटो लें + GPS स्वतः जुड़ेगा' : 'Take photo & auto-attach GPS coordinates'}
                </p>
              </div>
            </div>
          </Link>

          <Link to="/track" style={{ textDecoration: 'none' }}>
            <div
              className="card-hover"
              style={{
                background: '#fff',
                border: '1.5px solid var(--gray-200)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(16px, 2.5vw, 24px)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--green-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0,
                }}
              >
                🔍
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'var(--gray-900)', fontWeight: 800, fontSize: 'clamp(1rem, 1.2vw, 1.2rem)' }}>
                  {t(language, 'trackComplaint')}
                </h3>
                <p style={{ margin: '2px 0 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                  {language === 'hi' ? 'टिकट नंबर से स्थिति देखें व सत्यापित करें' : 'Track real-time timeline & verify resolution'}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Live Stats ── */}
      <StatsSection />

      {/* ── Green Waste Pickup Highlight Card ── */}
      <section className="app-container" style={{ marginTop: 8 }}>
        <Link to="/department/green" style={{ textDecoration: 'none' }}>
          <div
            className="card-hover"
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #166534 40%, #16a34a 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(20px, 3vw, 32px)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(22,163,74,0.25)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 'clamp(90px, 14vw, 160px)',
                opacity: 0.15,
                lineHeight: 1,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              🌿
            </div>

            <div style={{ position: 'relative', zIndex: 2, maxWidth: 640 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    color: '#fff',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  ✨ {language === 'hi' ? 'विशिष्ट सेवा' : 'FEATURED CIVIC SERVICE'}
                </span>
              </div>

              <h2
                style={{
                  color: '#fff',
                  margin: '0 0 8px',
                  fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                }}
              >
                🌿 {t(language, 'greenDeptTitle')}
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  margin: '0 0 16px',
                  fontSize: 'clamp(0.85rem, 1vw, 0.95rem)',
                  lineHeight: 1.6,
                }}
              >
                {t(language, 'greenDeptSubtitle')} (Fallen leaves, tree pruning, garden waste & fallen trees)
              </p>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#fff',
                    color: 'var(--green-900)',
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {language === 'hi' ? 'हरित कचरा रिपोर्ट करें' : 'Request Green Waste Pickup'} →
                </span>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Municipal Services Grid ── */}
      <ServicesGrid />

      {/* ── Recent Complaints Activity ── */}
      <RecentComplaints />

      {/* ── Admin Dashboard Access: ONLY SHOWN IF USER IS ADMIN ── */}
      {isAdmin && (
        <section className="app-container" style={{ textAlign: 'center', marginTop: 12, marginBottom: 20 }}>
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--indigo-50)',
              border: '1.5px dashed var(--indigo-500)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <ShieldAlert size={22} color="var(--indigo-600)" />
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--indigo-900)' }}>
                {language === 'hi' ? 'आप एडमिन के रूप में लॉगिन हैं' : 'Logged in as Municipal Administrator'}
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--indigo-600)' }}>
                {user?.email || 'ouikey41@gmail.com'}
              </p>
            </div>
            <Link
              to="/admin/dashboard"
              style={{
                marginLeft: 12,
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--indigo-600)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {t(language, 'adminDashboard')} →
            </Link>
          </div>
        </section>
      )}

      {/* Bottom Navigation for mobile/tablet */}
      <BottomNav />
    </div>
  );
};
