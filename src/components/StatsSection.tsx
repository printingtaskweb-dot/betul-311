import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { TrendingUp, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  verified: number;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) return;
    const duration = 900;
    const step = Math.max(1, end / (duration / 16));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

export const StatsSection: React.FC = () => {
  const { language } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    verified: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('complaints')
      .select('status')
      .then(({ data }) => {
        if (!data) return;
        const s: Stats = { total: data.length, pending: 0, in_progress: 0, resolved: 0, verified: 0 };
        data.forEach((c) => {
          if (c.status === 'pending') s.pending++;
          else if (c.status === 'in_progress') s.in_progress++;
          else if (c.status === 'resolved') s.resolved++;
          else if (c.status === 'verified') s.verified++;
        });
        setStats(s);
        setLoaded(true);
      });
  }, []);

  const cards = [
    {
      key: 'total',
      label: t(language, 'totalComplaints'),
      value: stats.total,
      icon: <TrendingUp size={20} />,
      bg: 'var(--theme-component, #d9d9d9)',
      border: 'var(--theme-component-border, #bfbfbf)',
      color: 'var(--theme-primary, #660033)',
      iconBg: 'var(--theme-primary, #660033)',
    },
    {
      key: 'pending',
      label: t(language, 'pendingComplaints'),
      value: stats.pending,
      icon: <Clock size={20} />,
      bg: 'var(--theme-component, #d9d9d9)',
      border: 'var(--theme-component-border, #bfbfbf)',
      color: '#92400e',
      iconBg: 'var(--amber-500, #f59e0b)',
    },
    {
      key: 'resolved',
      label: t(language, 'resolvedComplaints'),
      value: stats.resolved,
      icon: <CheckCircle2 size={20} />,
      bg: 'var(--theme-component, #d9d9d9)',
      border: 'var(--theme-component-border, #bfbfbf)',
      color: 'var(--theme-primary, #660033)',
      iconBg: 'var(--theme-primary, #660033)',
    },
    {
      key: 'verified',
      label: t(language, 'verifiedComplaints'),
      value: stats.verified,
      icon: <ShieldCheck size={20} />,
      bg: 'var(--theme-component, #d9d9d9)',
      border: 'var(--theme-component-border, #bfbfbf)',
      color: 'var(--theme-primary, #660033)',
      iconBg: 'var(--theme-primary, #660033)',
    },
  ];

  return (
    <div className="app-container" style={{ paddingTop: 16, paddingBottom: 16 }}>
      <div className="stats-grid-responsive">
        {cards.map((card, i) => (
          <div
            key={card.key}
            className="card-hover"
            style={{
              background: card.bg,
              border: `1.5px solid ${card.border}`,
              borderRadius: 'var(--radius-md)',
              padding: 'clamp(12px, 2vw, 18px)',
              animation: loaded ? `fadeIn 0.3s ease ${i * 0.08}s forwards` : 'none',
              opacity: loaded ? 1 : 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: card.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                marginBottom: 8,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {card.icon}
            </div>
            <div
              style={{
                fontSize: 'clamp(1.5rem, 2vw, 2.2rem)',
                fontWeight: 900,
                color: card.color,
                lineHeight: 1.1,
                marginBottom: 4,
                letterSpacing: '-0.02em',
              }}
            >
              {loaded ? <AnimatedNumber value={card.value} /> : '—'}
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: card.color,
                fontWeight: 600,
                opacity: 0.85,
              }}
            >
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
