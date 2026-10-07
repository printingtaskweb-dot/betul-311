import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';

type Service = {
  slug: string;
  icon?: string;      // emoji fallback / default
  image?: string;     // 👈 custom image path (takes priority if present)
  gradient: string;
  shadow: string;
  route: string;
};

const SERVICES: Service[] = [
  {
    slug: 'green',
    image: '/green.png', // 👈 served from public/green.png
    gradient: 'linear-gradient(135deg, #166534, #16a34a)',
    shadow: 'rgba(22,163,74,0.3)',
    route: '/department/green',
  },
  {
    slug: 'water',
    icon: '💧',
    gradient: 'linear-gradient(135deg, #1e40af, #2563eb)',
    shadow: 'rgba(37,99,235,0.3)',
    route: '/complaint/new?dept=water',
  },
  {
    slug: 'rainwater',
    icon: '🌧️',
    gradient: 'linear-gradient(135deg, #4338ca, #6366f1)',
    shadow: 'rgba(99,102,241,0.3)',
    route: '/complaint/new?dept=rainwater',
  },
  {
    slug: 'cnd',
    icon: '🏗️',
    gradient: 'linear-gradient(135deg, #92400e, #b45309)',
    shadow: 'rgba(180,83,9,0.3)',
    route: '/complaint/new?dept=cnd',
  },
  {
    slug: 'clean',
    icon: '🧹',
    gradient: 'linear-gradient(135deg, #065f46, #059669)',
    shadow: 'rgba(5,150,105,0.3)',
    route: '/complaint/new?dept=clean',
  },
  {
    slug: 'roads',
    icon: '🛣️',
    gradient: 'linear-gradient(135deg, #991b1b, #dc2626)',
    shadow: 'rgba(220,38,38,0.3)',
    route: '/complaint/new?dept=roads',
  },
  {
    slug: 'streetlight',
    icon: '💡',
    gradient: 'linear-gradient(135deg, #78350f, #d97706)',
    shadow: 'rgba(217,119,6,0.3)',
    route: '/complaint/new?dept=streetlight',
  },
  {
    slug: 'sewage',
    icon: '🚰',
    gradient: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
    shadow: 'rgba(124,58,237,0.3)',
    route: '/complaint/new?dept=sewage',
  },
];

export const ServicesGrid: React.FC = () => {
  const { language } = useAuth();

  return (
    <div className="app-container" style={{ paddingTop: 20, paddingBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
            {t(language, 'ourServices')}
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
            {language === 'hi' ? 'सभी नगर निगम विभाग' : 'Indore & Betul Municipal Services'}
          </p>
        </div>
        <Link
          to="/complaint/new"
          style={{
            fontSize: '0.85rem',
            color: 'var(--green-600)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {t(language, 'viewAll')} →
        </Link>
      </div>

      <div className="services-grid-responsive">
        {SERVICES.map((svc) => {
          const label = t(language, svc.slug as any) || svc.slug;
          return (
            <Link key={svc.slug} to={svc.route} style={{ textDecoration: 'none' }}>
              <div
                className="card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 'clamp(10px, 1.5vw, 16px) 6px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--theme-component, #d9d9d9)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 'clamp(42px, 4vw, 52px)',
                    height: 'clamp(42px, 4vw, 52px)',
                    borderRadius: '50%',
                    background: svc.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(20px, 2vw, 24px)',
                    boxShadow: `0 6px 16px ${svc.shadow}`,
                    flexShrink: 0,
                    overflow: 'hidden', // 👈 ensures image stays inside circle
                  }}
                >
                  {svc.image ? (
                    <img
                      src={svc.image}
                      alt={label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    svc.icon
                  )}
                </div>
                <span
                  style={{
                    fontSize: 'clamp(0.72rem, 0.7rem + 0.1vw, 0.82rem)',
                    fontWeight: 700,
                    color: 'var(--gray-800)',
                    lineHeight: 1.25,
                  }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
