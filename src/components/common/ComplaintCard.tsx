import React from 'react';
import type { Complaint } from '../../lib/supabase';
import { StatusBadge } from './StatusBadge';
import { MapPin, Clock } from 'lucide-react';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  compact?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onClick, compact }) => {
  const dept = complaint.department;
  const date = new Date(complaint.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: 12,
        padding: compact ? '12px 14px' : '16px 18px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        display: 'flex',
        gap: 14,
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.boxShadow = 'none')}
    >
      {complaint.photo_url && !compact && (
        <img
          src={complaint.photo_url}
          alt="Complaint"
          style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>#{complaint.ticket_number}</span>
          <StatusBadge status={complaint.status} />
        </div>

        {dept && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{dept.icon}</span>
            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{dept.name}</span>
          </div>
        )}

        <p style={{ fontSize: 13, color: '#374151', margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: compact ? 'nowrap' : 'normal' }}>
          {complaint.description}
        </p>

        {complaint.address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
            <MapPin size={12} color="#9ca3af" style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {complaint.address}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Clock size={11} color="#9ca3af" />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{date}</span>
        </div>
      </div>
    </div>
  );
};
