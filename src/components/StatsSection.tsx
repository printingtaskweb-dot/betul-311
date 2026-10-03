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
    const duration = 1000;
    const step = end / (duration / 16);

    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

export const StatsSection: React.FC = () => {
  const { language } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, in_progress: 0, resolved: 0, verified: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('complaints').select('status').then(({ data }) => {
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
      icon: <TrendingUp size={22} />,
      bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '#86efac',
      color: '#166534',
      iconBg: '#16a34a',
    },
    {
      key: 'pending',
      label: t(language, 'pendingComplaints'),
      value: stats.pending,
      icon: <Clock size={22} />,
      bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      border: '#fcd34d',
      color: '#92400e',
      iconBg: '#f59e0b',
    },
    {
      key: 'resolved',
      label: t(language, 'resolvedComplaints'),
      value: stats.resolved,
      icon: <CheckCircle2 size={22} />,
      bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      border: '#93c5fd',
      color: '#1e40af',
      iconBg: '#2563eb',
    },
    {
      key: 'verified',
      label: t(language, 'verifiedComplaints'),
      value: stats.verified,
      icon: <ShieldCheck size={22} />,
      bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '#4ade80',
      color: '#15803d',
      iconBg: '#16a34a',
    },
  ];

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        {cards.map((card, i) => (
          <div
            key={card.key}
            style={{
              background: card.bg,
              border: `1.5px solid ${card.border}`,
              borderRadius: 14,
              padding: '14px 14px',
              animation: loaded ? `fadeIn 0.4s ease ${i * 0.1}s forwards` : 'none',
              opacity: loaded ? 1 : 0,
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: card.iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', marginBottom: 10,
            }}>
              {card.icon}
            </div>
            <div style={{
              fontSize: 30, fontWeight: 900,
              color: card.color, lineHeight: 1,
              marginBottom: 4,
            }}>
              {loaded ? <AnimatedNumber value={card.value} /> : '—'}
            </div>
            <div style={{ fontSize: 12, color: card.color, fontWeight: 600, opacity: 0.8 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
