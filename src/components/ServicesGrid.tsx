import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';

const SERVICES = [
  {
    slug: 'green',
    icon: '🌿',
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
    <div style={{ padding: '0 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)' }}>
          {t(language, 'ourServices')}
        </h2>
        <Link to="/complaint/new" style={{ fontSize: 13, color: 'var(--green-600)', fontWeight: 600 }}>
          {t(language, 'viewAll')} →
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
      }}>
        {SERVICES.map((svc) => {
          const label = t(language, svc.slug as any) || svc.slug;
          return (
            <Link key={svc.slug} to={svc.route} style={{ textDecoration: 'none' }}>
              <div
                className="card-hover"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '14px 6px',
                  borderRadius: 14,
                  background: '#fff',
                  border: '1.5px solid var(--gray-100)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                {/* Icon circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: svc.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: `0 6px 16px ${svc.shadow}`,
                }}>
                  {svc.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-700)', lineHeight: 1.2 }}>
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
