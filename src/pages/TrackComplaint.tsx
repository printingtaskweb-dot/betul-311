import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useComplaints } from '../hooks/useComplaints';
import type { Complaint } from '../lib/supabase';
import { StatusBadge } from '../components/common/StatusBadge';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, CheckCircle2, XCircle } from 'lucide-react';

export const TrackComplaint: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getComplaintByTicket } = useComplaints();
  const [ticket, setTicket] = useState(searchParams.get('ticket') || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSearch = async () => {
    if (!ticket.trim()) return;
    setLoading(true);
    setNotFound(false);
    setComplaint(null);
    const result = await getComplaintByTicket(ticket.trim().toUpperCase());
    if (result) setComplaint(result);
    else setNotFound(true);
    setLoading(false);
  };

  const handleCitizenVerify = async (satisfied: boolean) => {
    if (!complaint) return;
    setVerifying(true);

    await supabase.from('verifications').insert({
      complaint_id: complaint.id,
      verified_by: 'citizen',
      is_satisfied: satisfied,
      note: satisfied ? 'Citizen confirmed resolution' : 'Citizen rejected resolution',
    });

    if (satisfied) {
      await supabase.from('complaints').update({ status: 'verified' }).eq('id', complaint.id);
      setComplaint({ ...complaint, status: 'verified' });
    } else {
      await supabase.from('complaints').update({ status: 'in_progress' }).eq('id', complaint.id);
      setComplaint({ ...complaint, status: 'in_progress' });
    }
    setVerified(true);
    setVerifying(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e40af, #4f46e5)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Track Complaint</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Enter your ticket number</p>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '32px auto', padding: '0 16px' }}>
        {/* Search */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="e.g. IMC-2024-00001"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 10,
              border: '1.5px solid #d1d5db', fontSize: 15, outline: 'none',
              fontFamily: 'monospace', letterSpacing: 1,
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: '12px 20px', borderRadius: 10, border: 'none',
              background: '#4f46e5', color: '#fff', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Search size={16} /> {loading ? '…' : 'Search'}
          </button>
        </div>

        {notFound && (
          <div style={{ marginTop: 24, textAlign: 'center', color: '#9ca3af' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p>
            <p>No complaint found for <strong>{ticket}</strong>. Please check the ticket number.</p>
          </div>
        )}

        {complaint && (
          <div style={{ marginTop: 24, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
            {complaint.photo_url && (
              <img src={complaint.photo_url} alt="Complaint" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
            )}
            <div style={{ padding: '20px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>#{complaint.ticket_number}</span>
                <StatusBadge status={complaint.status} />
              </div>

              {complaint.department && (
                <p style={{ margin: '0 0 8px', fontSize: 14, color: '#6b7280' }}>
                  {complaint.department.icon} {complaint.department.name}
                </p>
              )}
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>{complaint.description}</p>
              {complaint.address && (
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#9ca3af' }}>📍 {complaint.address}</p>
              )}
              <p style={{ margin: 0, fontSize: 12, color: '#d1d5db' }}>
                Submitted: {new Date(complaint.created_at).toLocaleString('en-IN')}
              </p>

              {/* Timeline */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: '#f9fafb', borderRadius: 10 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>Status Timeline</h4>
                {(['pending', 'in_progress', 'resolved', 'verified'] as const).map((s, i) => {
                  const statuses = ['pending', 'in_progress', 'resolved', 'verified'];
                  const currentIdx = statuses.indexOf(complaint.status);
                  const stepIdx = statuses.indexOf(s);
                  const done = currentIdx >= stepIdx;
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: done ? '#16a34a' : '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {done && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                      </div>
                      <StatusBadge status={s} />
                    </div>
                  );
                })}
              </div>

              {/* Citizen verification – only when status is resolved */}
              {complaint.status === 'resolved' && !verified && (
                <div style={{
                  marginTop: 20, padding: '14px 16px',
                  background: '#ede9fe', border: '1px solid #c4b5fd',
                  borderRadius: 10,
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>
                    🔔 The department says this issue has been resolved. Is it fixed?
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleCitizenVerify(true)}
                      disabled={verifying}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <CheckCircle2 size={16} /> Yes, it's fixed!
                    </button>
                    <button
                      onClick={() => handleCitizenVerify(false)}
                      disabled={verifying}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #dc2626', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <XCircle size={16} /> No, still an issue
                    </button>
                  </div>
                </div>
              )}

              {verified && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#dcfce7', borderRadius: 10 }}>
                  <p style={{ margin: 0, color: '#166534', fontWeight: 600, fontSize: 14 }}>
                    ✅ Thank you for your feedback! Your response has been recorded.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
