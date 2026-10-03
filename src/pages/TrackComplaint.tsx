import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { useComplaints } from '../hooks/useComplaints';
import type { Complaint } from '../lib/supabase';
import { StatusBadge } from '../components/common/StatusBadge';
import { supabase } from '../lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { ArrowLeft, Search, CheckCircle2, XCircle } from 'lucide-react';

export const TrackComplaint: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useAuth();
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
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: 90 }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
          padding: '14px 20px',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="app-container" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 'var(--radius-sm)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 800, color: '#fff' }}>
              {t(language, 'trackComplaint')}
            </h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
              {language === 'hi' ? 'शिकायत का टिकट नंबर दर्ज करें' : 'Enter ticket number to track progress'}
            </p>
          </div>
        </div>
      </header>

      <div className="content-container-sm" style={{ paddingTop: 24 }}>
        {/* Search Input Box */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            background: '#fff',
            padding: 8,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            border: '1.5px solid var(--gray-200)',
          }}
        >
          <input
            placeholder="e.g. IMC-2024-00001"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              fontSize: '0.95rem',
              outline: 'none',
              fontFamily: 'monospace',
              letterSpacing: 1,
              background: 'transparent',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--green-600)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.88rem',
            }}
          >
            <Search size={16} /> {loading ? '...' : language === 'hi' ? 'खोजें' : 'Search'}
          </button>
        </div>

        {notFound && (
          <div
            style={{
              marginTop: 24,
              textAlign: 'center',
              padding: '36px 20px',
              background: '#fff',
              borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--gray-200)',
              color: 'var(--gray-500)',
            }}
          >
            <p style={{ fontSize: 36, margin: '0 0 10px' }}>🔍</p>
            <p style={{ fontWeight: 700, color: 'var(--gray-800)', margin: '0 0 4px' }}>
              {language === 'hi' ? 'कोई शिकायत नहीं मिली' : 'No complaint found'}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', margin: 0 }}>
              {language === 'hi'
                ? `टिकट नंबर '${ticket}' की पुनः जांच करें।`
                : `Please check the ticket number '${ticket}' and try again.`}
            </p>
          </div>
        )}

        {complaint && (
          <div
            style={{
              marginTop: 20,
              background: '#fff',
              border: '1.5px solid var(--gray-200)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {complaint.photo_url && (
              <img
                src={complaint.photo_url}
                alt="Complaint"
                style={{ width: '100%', height: 220, objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '20px clamp(16px, 2.5vw, 24px)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    color: 'var(--gray-900)',
                    fontFamily: 'monospace',
                  }}
                >
                  #{complaint.ticket_number}
                </span>
                <StatusBadge status={complaint.status} />
              </div>

              {complaint.department && (
                <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--gray-600)', fontWeight: 600 }}>
                  {complaint.department.icon} {complaint.department.name} Department
                </p>
              )}
              <p style={{ margin: '0 0 10px', fontSize: '0.92rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                {complaint.description}
              </p>
              {complaint.address && (
                <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                  📍 {complaint.address}
                </p>
              )}
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                {language === 'hi' ? 'शिकायत का समय:' : 'Submitted on:'}{' '}
                {new Date(complaint.created_at).toLocaleString('en-IN')}
              </p>

              {/* Status Timeline */}
              <div
                style={{
                  marginTop: 20,
                  padding: '16px 18px',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--gray-200)',
                }}
              >
                <h4 style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--gray-800)', fontWeight: 800 }}>
                  {language === 'hi' ? 'निराकरण समयरेखा' : 'Redressal Timeline'}
                </h4>
                {(['pending', 'in_progress', 'resolved', 'verified'] as const).map((s, i) => {
                  const statuses = ['pending', 'in_progress', 'resolved', 'verified'];
                  const currentIdx = statuses.indexOf(complaint.status);
                  const stepIdx = statuses.indexOf(s);
                  const isDone = currentIdx >= stepIdx;
                  return (
                    <div
                      key={s}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: i < 3 ? 10 : 0,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: isDone ? 'var(--green-600)' : 'var(--gray-200)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {isDone ? '✓' : i + 1}
                      </div>
                      <StatusBadge status={s} />
                    </div>
                  );
                })}
              </div>

              {/* Citizen Verification Panel – when status is 'resolved' */}
              {complaint.status === 'resolved' && !verified && (
                <div
                  style={{
                    marginTop: 20,
                    padding: '16px 18px',
                    background: 'var(--indigo-50)',
                    border: '1.5px solid var(--indigo-500)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 12px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--indigo-900)',
                      lineHeight: 1.4,
                    }}
                  >
                    🔔 {language === 'hi'
                      ? 'नगर निगम टीम द्वारा समस्या का समाधान किया गया है। क्या आप संतुष्ट हैं?'
                      : 'The municipal team marked this issue as resolved. Is the problem fixed at your location?'}
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleCitizenVerify(true)}
                      disabled={verifying}
                      style={{
                        flex: 1,
                        padding: '11px 0',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'var(--green-600)',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: '0.85rem',
                      }}
                    >
                      <CheckCircle2 size={16} /> {language === 'hi' ? 'हाँ, हल हो गया!' : 'Yes, Fixed!'}
                    </button>
                    <button
                      onClick={() => handleCitizenVerify(false)}
                      disabled={verifying}
                      style={{
                        flex: 1,
                        padding: '11px 0',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--red-600)',
                        background: '#fff',
                        color: 'var(--red-600)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: '0.85rem',
                      }}
                    >
                      <XCircle size={16} /> {language === 'hi' ? 'नहीं, अभी भी समस्या है' : 'Not Fixed Yet'}
                    </button>
                  </div>
                </div>
              )}

              {verified && (
                <div
                  style={{
                    marginTop: 18,
                    padding: '14px 18px',
                    background: 'var(--green-50)',
                    border: '1px solid var(--green-200)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <p style={{ margin: 0, color: 'var(--green-800)', fontWeight: 700, fontSize: '0.88rem' }}>
                    ✅ {language === 'hi'
                      ? 'धन्यवाद! आपकी प्रतिक्रिया दर्ज कर ली गई है।'
                      : 'Thank you! Your verification feedback has been updated.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
