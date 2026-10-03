import React, { useState } from 'react';
import type { Complaint, ComplaintStatus } from '../../lib/supabase';
import { useComplaints } from '../../hooks/useComplaints';
import { ComplaintCard } from '../common/ComplaintCard';
import { ResolutionForm } from './ResolutionForm';
import { Search, X } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: ComplaintStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Verified', value: 'verified' },
  { label: 'Rejected', value: 'rejected' },
];

interface ComplaintTableProps {
  departmentSlug?: string;
}

export const ComplaintTable: React.FC<ComplaintTableProps> = ({ departmentSlug }) => {
  const { complaints, loading, refetch } = useComplaints(departmentSlug);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [selected, setSelected] = useState<Complaint | null>(null);

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.citizen_name?.toLowerCase().includes(search.toLowerCase()) || false;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'pending').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
    verified: complaints.filter((c) => c.status === 'verified').length,
  };

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Pending', value: stats.pending, color: '#d97706' },
          { label: 'In Progress', value: stats.in_progress, color: '#2563eb' },
          { label: 'Resolved', value: stats.resolved, color: '#7c3aed' },
          { label: 'Verified', value: stats.verified, color: '#16a34a' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: '#fff', border: '1.5px solid #e5e7eb',
              borderRadius: 10, padding: '12px 16px', textAlign: 'center',
              borderTop: `3px solid ${s.color}`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            placeholder="Search by ticket, description, name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px 9px 34px', borderRadius: 8,
              border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: '1.5px solid',
                borderColor: statusFilter === f.value ? '#6366f1' : '#d1d5db',
                background: statusFilter === f.value ? '#eef2ff' : '#fff',
                color: statusFilter === f.value ? '#6366f1' : '#374151',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>No complaints found.</p>
          )}
          {filtered.map((c) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              compact
              onClick={() => setSelected(c)}
            />
          ))}
        </div>

        {/* Side panel */}
        {selected && (
          <div style={{
            width: 380, flexShrink: 0,
            background: '#fff', border: '1.5px solid #e5e7eb',
            borderRadius: 12, padding: '16px 20px',
            position: 'sticky', top: 80, maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Complaint Detail</h3>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} color="#6b7280" />
              </button>
            </div>

            {selected.photo_url && (
              <img
                src={selected.photo_url}
                alt="Complaint"
                style={{ width: '100%', borderRadius: 8, marginBottom: 12, objectFit: 'cover', maxHeight: 200 }}
              />
            )}

            <p style={{ fontSize: 14, color: '#374151', margin: '0 0 8px' }}>{selected.description}</p>
            {selected.address && <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 12px' }}>📍 {selected.address}</p>}
            {selected.citizen_name && <p style={{ fontSize: 13, color: '#374151' }}>👤 {selected.citizen_name} {selected.citizen_phone && `· ${selected.citizen_phone}`}</p>}

            <ResolutionForm
              complaint={selected}
              onUpdate={() => {
                refetch();
                setSelected(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
