import React from 'react';
import type { Complaint } from '../../lib/supabase';
import { StatusBadge } from './StatusBadge';
import { MapPin, Clock, Navigation } from 'lucide-react';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  compact?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = React.memo(
  ({ complaint, onClick, compact }) => {
    const dept = complaint.department;

    const date = new Date(complaint.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const interactive = !!onClick;

    return (
      <div
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: compact ? '12px 14px' : '16px 18px',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'var(--transition, box-shadow 0.15s ease)',
          display: 'flex',
          gap: 14,
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!interactive) return;
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            '0 4px 16px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          if (!interactive) return;
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
        onFocus={(e) => {
          if (!interactive) return;
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            '0 0 0 2px var(--theme-primary, #660033)';
        }}
        onBlur={(e) => {
          if (!interactive) return;
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {complaint.photo_url && !compact && (
          <img
            src={complaint.photo_url}
            alt="Complaint"
            loading="lazy"
            style={{
              width: 90,
              height: 90,
              objectFit: 'cover',
              borderRadius: 'var(--radius-sm, 8px)',
              flexShrink: 0,
              border: '1px solid var(--theme-component-border, #bfbfbf)',
            }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--gray-900)',
                fontSize: 14,
                fontFamily: 'monospace',
                letterSpacing: 0.4,
              }}
            >
              #{complaint.ticket_number}
            </span>
            <StatusBadge status={complaint.status} />
          </div>

          {dept && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 14 }}>{dept.icon}</span>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--gray-500)',
                  fontWeight: 500,
                }}
              >
                {dept.name}
              </span>
            </div>
          )}

          <p
            style={{
              fontSize: 13,
              color: 'var(--gray-800)',
              margin: '4px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: compact ? 'nowrap' : 'normal',
              display: compact ? 'block' : '-webkit-box',
              WebkitLineClamp: compact ? undefined : 2,
              WebkitBoxOrient: compact ? undefined : 'vertical',
              lineHeight: 1.4,
            }}
          >
            {complaint.description}
          </p>

          {complaint.address && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 4,
                marginTop: 4,
              }}
            >
              <MapPin
                size={12}
                color="var(--gray-400, #9ca3af)"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--gray-400, #9ca3af)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {complaint.address}
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} color="var(--gray-400, #9ca3af)" />
              <span
                style={{ fontSize: 12, color: 'var(--gray-400, #9ca3af)' }}
              >
                {date}
              </span>
            </div>

            {complaint.latitude && complaint.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.latitude},${complaint.longitude}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  background: 'var(--green-50)',
                  color: 'var(--green-700)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid var(--green-200)',
                  transition: 'var(--transition)',
                }}
              >
                <Navigation size={10} />
                Directions
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ComplaintCard.displayName = 'ComplaintCard';
