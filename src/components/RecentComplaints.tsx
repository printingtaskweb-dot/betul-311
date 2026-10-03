import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Complaint } from '../lib/supabase';
import { StatusBadge } from './common/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { MapPin } from 'lucide-react';

export const RecentComplaints: React.FC = () => {
  const { language } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('complaints')
      .select('*, department:departments(*)')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setComplaints((data as Complaint[]) || []);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ padding: '0 16px 20px' }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 72, borderRadius: 12, marginBottom: 10 }} />
      ))}
    </div>
  );

  if (complaints.length === 0) return null;

  return (
    <div style={{ padding: '0 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)' }}>
          {t(language, 'recentActivity')}
        </h2>
        <Link to="/track" style={{ fontSize: 13, color: 'var(--green-600)', fontWeight: 600 }}>
          {t(language, 'viewAll')} →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {complaints.map((c) => (
          <Link key={c.id} to={`/track?ticket=${c.ticket_number}`} style={{ textDecoration: 'none' }}>
            <div
              className="card-hover"
              style={{
                background: '#fff',
                border: '1.5px solid var(--gray-100)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                cursor: 'pointer',
              }}
            >
              {/* Dept icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: `${c.department?.color || '#16a34a'}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                {c.department?.icon || '📋'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', fontFamily: 'monospace' }}>
                    #{c.ticket_number}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.description}
                </p>
                {c.address && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 3 }}>
                    <MapPin size={11} color="var(--gray-400)" />
                    <span style={{ fontSize: 11, color: 'var(--gray-400)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.address.split(',').slice(0, 2).join(',')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
