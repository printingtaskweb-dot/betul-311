import React from 'react';
import type { ComplaintStatus } from '../../lib/supabase';

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: '#dbeafe' },
  resolved: { label: 'Resolved – Awaiting Verification', color: '#7c3aed', bg: '#ede9fe' },
  verified: { label: '✅ Verified & Closed', color: '#16a34a', bg: '#dcfce7' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
};

interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
};
