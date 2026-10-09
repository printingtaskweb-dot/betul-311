import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDeptComplaints, type DeptComplaint } from '../hooks/useDeptComplaints';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Search, Filter, CheckCircle, Clock,
  AlertCircle, XCircle, Camera,
  Navigation, Phone, User, Calendar, Hash,
  ChevronDown, ChevronUp, LogOut, RefreshCw, Star,
  Inbox, CheckSquare
} from 'lucide-react';


// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; labelHi: string; color: string; bg: string; Icon: typeof Clock }> = {
  pending:     { label: 'Pending',     labelHi: 'लंबित',      color: '#92400e', bg: '#fef3c7', Icon: Clock },
  in_progress: { label: 'In Progress', labelHi: 'प्रगति में',   color: '#1d4ed8', bg: '#dbeafe', Icon: AlertCircle },
  resolved:    { label: 'Resolved',    labelHi: 'हल किया',     color: '#065f46', bg: '#d1fae5', Icon: CheckCircle },
  verified:    { label: 'Verified ✓',  labelHi: 'सत्यापित ✓', color: '#5b21b6', bg: '#ede9fe', Icon: CheckSquare },
  rejected:    { label: 'Rejected',    labelHi: 'अस्वीकृत',   color: '#991b1b', bg: '#fee2e2', Icon: XCircle },
};

const STAFF_ROLES = [
  'dept_staff', 'admin', 'department_head', 'supervisor', 'control_room',
  'management_viewer', 'field_employee', 'municipal_administrator',
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(s: string) {
  return new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Resolution Modal ────────────────────────────────────────────────────────
interface ResolveModalProps {
  complaint: DeptComplaint;
  resolvedBy: string;
  language: 'en' | 'hi';
  onClose: () => void;
  onResolved: () => void;
  resolveComplaint: (id: string, note: string, photo: File | null, by: string) => Promise<boolean>;
}

function ResolveModal({ complaint, resolvedBy, language, onClose, onResolved, resolveComplaint }: ResolveModalProps) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hi = language === 'hi';

  const handlePhoto = (f: File) => {
    setPhoto(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) { setErr(hi ? 'नोट आवश्यक है' : 'Resolution note is required'); return; }
    setSubmitting(true);
    const ok = await resolveComplaint(complaint.id, note, photo, resolvedBy);
    if (ok) { onResolved(); onClose(); }
    else { setErr(hi ? 'कुछ गड़बड़ हुई। दोबारा कोशिश करें।' : 'Something went wrong. Try again.'); }
    setSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
      }}>
        {/* Modal Header */}
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', padding: '20px 24px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
            ✅ {hi ? 'शिकायत हल करें' : 'Mark as Resolved'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
            #{complaint.ticket_number}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.83rem', marginBottom: 18 }}>
              {err}
            </div>
          )}

          {/* Resolution Note */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8,
              color: 'var(--gray-700)' }}>
              📝 {hi ? 'हल का विवरण *' : 'Resolution Note *'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={hi ? 'क्या काम किया गया? कब किया? ...' : 'What was done to resolve this issue? When?...'}
              rows={4}
              required
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--gray-200)', fontSize: '0.88rem',
                fontFamily: 'var(--font-primary)', resize: 'vertical',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {/* Work Done Photo */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8,
              color: 'var(--gray-700)' }}>
              📸 {hi ? 'काम का फोटो' : 'Work Done Photo'}{' '}
              <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: '0.78rem' }}>
                ({hi ? 'अनुशंसित' : 'Recommended'})
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileRef}
              onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              style={{ display: 'none' }}
            />
            {!preview ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--theme-bg, #fff4e7)',
                  transition: 'background 0.2s',
                }}
              >
                <Camera size={28} color="var(--theme-primary, #660033)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>
                  {hi ? 'फोटो खींचें या अपलोड करें' : 'Take or Upload Photo'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  JPG, PNG, WEBP
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <img src={preview} alt="work done" style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: 200, objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPreview(null); }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                    width: 28, height: 28, cursor: 'pointer', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)', fontWeight: 700, cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              {hi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2, padding: '12px', border: 'none',
                borderRadius: 'var(--radius-md)',
                background: submitting ? 'var(--gray-300)' : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 7,
                boxShadow: submitting ? 'none' : '0 4px 12px rgba(102,0,51,0.3)',
              }}
            >
              {submitting ? (
                <span className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                <>
                  <CheckCircle size={16} />
                  {hi ? 'हल के रूप में चिह्नित करें' : 'Mark as Resolved'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Complaint Detail Card ──────────────────────────────────────────────────
function ComplaintDetailCard({
  c, language, onResolve
}: { c: DeptComplaint; language: 'en' | 'hi'; onResolve: () => void }) {
  const hi = language === 'hi';
  const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.Icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'var(--theme-component, #d9d9d9)',
      border: '1.5px solid var(--theme-component-border, #bfbfbf)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Card Header Row */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          padding: '16px 18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          borderBottom: expanded ? '1.5px solid var(--gray-100)' : 'none',
        }}
      >
        {/* Complaint Photo */}
        <div style={{
          width: 60, height: 60, borderRadius: 'var(--radius-md)',
          background: 'var(--gray-100)', flexShrink: 0, overflow: 'hidden',
        }}>
          {c.photo_url ? (
            <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={22} color="var(--gray-300)" />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--theme-primary, #660033)',
              background: 'var(--theme-bg, #fff4e7)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
              #{c.ticket_number}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 20,
              background: cfg.bg, color: cfg.color,
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              <StatusIcon size={11} />
              {hi ? cfg.labelHi : cfg.label}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-800)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
            {c.citizen_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                <User size={11} /> {c.citizen_name}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gray-400)' }}>
              <Calendar size={11} /> {fmtDate(c.created_at)}
            </span>
          </div>

          {/* Always Visible Action Bar on Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--gray-100)',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {c.latitude && c.longitude ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--theme-bg, #fff4e7)',
                  color: 'var(--theme-primary, #660033)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                }}
              >
                <Navigation size={12} /> {hi ? 'दिशा-निर्देश' : 'Get Directions'}
              </a>
            ) : <div />}

            {(c.status === 'pending' || c.status === 'in_progress') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(102,0,51,0.3)',
                }}
              >
                <Camera size={14} />
                {hi ? 'हल करें (फोटो अपलोड करें)' : 'Mark Resolved (Upload Photo)'}
              </button>
            )}

            {c.status === 'resolved' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                <CheckCircle size={13} /> {hi ? 'काम पूरा — सत्यापन प्रतीक्षा' : 'Resolved — Awaiting Verification'}
              </span>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--gray-400)', flexShrink: 0, marginTop: 4 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ padding: '18px' }}>
          {/* Photos row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {c.photo_url && (
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                  📷 {hi ? 'शिकायत फोटो' : 'Complaint Photo'}
                </p>
                <a href={c.photo_url} target="_blank" rel="noreferrer">
                  <img src={c.photo_url} alt="complaint" style={{
                    width: '100%', borderRadius: 'var(--radius-md)', maxHeight: 160, objectFit: 'cover',
                    border: '1.5px solid var(--gray-200)',
                  }} />
                </a>
              </div>
            )}
            {c.resolution_photo && (
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary, #660033)', textTransform: 'uppercase' }}>
                  ✅ {hi ? 'काम का फोटो' : 'Work Done Photo'}
                </p>
                <a href={c.resolution_photo} target="_blank" rel="noreferrer">
                  <img src={c.resolution_photo} alt="resolution" style={{
                    width: '100%', borderRadius: 'var(--radius-md)', maxHeight: 160, objectFit: 'cover',
                    border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  }} />
                </a>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--theme-bg, #fff4e7)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>
              {c.description}
            </p>
          </div>

          {/* Citizen Info */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {c.citizen_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem',
                color: 'var(--gray-600)', background: 'var(--theme-bg, #fff4e7)', padding: '5px 10px', borderRadius: 20, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                <User size={13} /> {c.citizen_name}
              </span>
            )}
            {c.citizen_phone && (
              <a href={`tel:${c.citizen_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5,
                fontSize: '0.8rem', color: 'var(--theme-primary, #660033)', background: 'var(--theme-bg, #fff4e7)',
                padding: '5px 10px', borderRadius: 20, textDecoration: 'none', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                <Phone size={13} /> {c.citizen_phone}
              </a>
            )}
          </div>

          {/* Location */}
          {(c.address || (c.latitude && c.longitude)) && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--theme-bg, #fff4e7)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
              {c.address && (
                <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--gray-700)' }}>
                  📍 {c.address}
                </p>
              )}
              {c.latitude && c.longitude && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                    target="_blank" rel="noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', color: '#fff',
                      fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none',
                    }}
                  >
                    <Navigation size={12} /> {hi ? 'दिशा-निर्देश' : 'Get Directions'}
                  </a>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem',
                    color: 'var(--gray-500)', alignSelf: 'center' }}>
                    {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Resolution Info (if resolved) */}
          {c.resolution_note && (
            <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--theme-bg, #fff4e7)',
              borderRadius: 'var(--radius-md)', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary, #660033)', textTransform: 'uppercase' }}>
                ✅ {hi ? 'हल का विवरण' : 'Resolution Note'}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                {c.resolution_note}
              </p>
              {c.resolved_at && (
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                  {hi ? 'हल का समय:' : 'Resolved at:'} {fmtDate(c.resolved_at)}
                </p>
              )}
            </div>
          )}

          {/* Citizen Verification Status */}
          {c.citizen_satisfied !== null && (
            <div style={{ marginBottom: 14, padding: '10px 14px', 
              background: c.citizen_satisfied ? '#f0fdf4' : '#fef2f2',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${c.citizen_satisfied ? '#bbf7d0' : '#fecaca'}` }}>
              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700,
                color: c.citizen_satisfied ? '#15803d' : '#dc2626' }}>
                {c.citizen_satisfied
                  ? (hi ? '👍 नागरिक ने संतुष्टि की पुष्टि की' : '👍 Citizen verified & satisfied')
                  : (hi ? '👎 नागरिक असंतुष्ट' : '👎 Citizen not satisfied')}
              </p>
              {c.citizen_verified_at && (
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                  {fmtDate(c.citizen_verified_at)}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {(c.status === 'pending' || c.status === 'in_progress') && (
              <button
                onClick={onResolve}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  boxShadow: '0 3px 10px rgba(102,0,51,0.3)',
                }}
              >
                <CheckCircle size={15} />
                {hi ? 'हल के रूप में चिह्नित करें' : 'Mark as Resolved'}
              </button>
            )}
            {c.status === 'resolved' && c.citizen_satisfied === null && (
              <div style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: '#fef3c7', border: '1px solid #fcd34d',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#92400e" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
                  {hi ? 'नागरिक सत्यापन की प्रतीक्षा' : 'Awaiting citizen verification'}
                </span>
              </div>
            )}
            {c.status === 'verified' && (
              <div style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: '#ede9fe', border: '1px solid #c4b5fd',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={14} color="#5b21b6" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6' }}>
                  {hi ? '🎉 पूर्ण रूप से सत्यापित!' : '🎉 Fully Verified & Complete!'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DeptDashboard() {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const hi = language === 'hi';

  const [profile, setProfile] = useState<{
    full_name: string | null;
    role: string | null;
    linked_department_id: string | null;
    dept_name: string | null;
    dept_slug: string | null;
    dept_color: string | null;
    dept_icon: string | null;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [resolving, setResolving] = useState<DeptComplaint | null>(null);

  const { complaints, loading, error, fetchComplaints, resolveComplaint } = useDeptComplaints(
    profile?.linked_department_id ?? null
  );

  // Load profile
  useEffect(() => {
    if (!user) { navigate('/dept/login'); return; }
    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name, role, linked_department_id, is_admin')
        .eq('id', user.id)
        .single();

      if (!data || !STAFF_ROLES.includes(data.role ?? '')) {
        await supabase.auth.signOut();
        navigate('/dept/login');
        return;
      }

      if (data.linked_department_id) {
        const { data: dept } = await supabase
          .from('departments')
          .select('name, slug, color, icon')
          .eq('id', data.linked_department_id)
          .single();
        setProfile({ ...data, dept_name: dept?.name ?? null, dept_slug: dept?.slug ?? null,
          dept_color: dept?.color ?? null, dept_icon: dept?.icon ?? null });
      } else {
        const defaultName = data.role === 'municipal_administrator'
          ? (hi ? 'नगर निगम प्रशासन' : 'Municipal Administration')
          : (hi ? 'समस्त विभाग / संचालन' : 'All Departments / Operations');
        setProfile({
          ...data,
          dept_name: defaultName,
          dept_slug: 'all',
          dept_color: '#660033',
          dept_icon: '🏛️',
        });
      }
      setProfileLoading(false);
    })();
  }, [user, navigate, hi]);

  // Fetch complaints whenever profile/filters change
  useEffect(() => {
    if (profile) {
      fetchComplaints(statusFilter, search);
    }
  }, [profile, statusFilter, fetchComplaints]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints(statusFilter, search);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/dept/login');
  };

  // Stats
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => ['resolved', 'verified'].includes(c.status)).length,
    verified: complaints.filter(c => c.status === 'verified').length,
  };

  if (profileLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--theme-bg, #fff4e7)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--gray-500)' }}>{hi ? 'लोड हो रहा है...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)' }}>

      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
        padding: '0 clamp(16px, 4vw, 32px)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                {profile?.dept_icon} {profile?.dept_name ?? (hi ? 'विभाग डैशबोर्ड' : 'Dept Dashboard')}
              </h1>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                {hi ? 'शिकायत प्रबंधन पोर्टल' : 'Complaint Management Portal'} • IMC 311
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', display: 'none' }}
              className="hide-mobile">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              <LogOut size={14} /> {hi ? 'लॉगआउट' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px, 3vw, 28px) clamp(12px, 3vw, 24px)' }}>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: hi ? 'कुल' : 'Total', val: stats.total, color: '#1e40af', bg: '#dbeafe', icon: Hash },
            { label: hi ? 'लंबित' : 'Pending', val: stats.pending, color: '#92400e', bg: '#fef3c7', icon: Clock },
            { label: hi ? 'प्रगति में' : 'In Progress', val: stats.in_progress, color: '#1d4ed8', bg: '#bfdbfe', icon: AlertCircle },
            { label: hi ? 'हल किए' : 'Resolved', val: stats.resolved, color: '#065f46', bg: '#d1fae5', icon: CheckCircle },
            { label: hi ? 'सत्यापित' : 'Verified', val: stats.verified, color: '#5b21b6', bg: '#ede9fe', icon: Star },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{
                background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '16px',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.label}
                  </span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={s.color} />
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, color: s.color }}>
                  {s.val}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Search + Filter ─────────────────────────────────────────── */}
        <div style={{
          background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '18px',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)', marginBottom: 20,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder={hi ? 'टिकट नंबर, नाम या विवरण खोजें...' : 'Search by ticket, name, or description...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px 10px 36px',
                  border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--font-primary)',
                }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <Filter size={13} style={{ position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '10px 12px 10px 32px',
                  border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem', background: 'var(--theme-bg, #fff4e7)', outline: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-primary)',
                }}
              >
                <option value="all">{hi ? 'सभी स्थिति' : 'All Status'}</option>
                <option value="pending">{hi ? 'लंबित' : 'Pending'}</option>
                <option value="in_progress">{hi ? 'प्रगति में' : 'In Progress'}</option>
                <option value="resolved">{hi ? 'हल किए' : 'Resolved'}</option>
                <option value="verified">{hi ? 'सत्यापित' : 'Verified'}</option>
                <option value="rejected">{hi ? 'अस्वीकृत' : 'Rejected'}</option>
              </select>
            </div>
            <button
              type="submit"
              style={{
                padding: '10px 18px', border: 'none', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Search size={14} /> {hi ? 'खोजें' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('all'); setTimeout(() => fetchComplaints(), 50); }}
              style={{
                padding: '10px 14px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-700)', fontWeight: 600, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <RefreshCw size={13} /> {hi ? 'रिफ्रेश' : 'Refresh'}
            </button>
          </form>
        </div>

        {/* ── Complaint List ─────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 14px' }} />
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
              {hi ? 'शिकायतें लोड हो रही हैं...' : 'Loading complaints...'}
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '28px', textAlign: 'center', background: '#fef2f2',
            borderRadius: 'var(--radius-lg)', border: '1.5px solid #fecaca' }}>
            <XCircle size={28} color="#dc2626" style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ margin: 0, color: '#dc2626', fontWeight: 700 }}>{error}</p>
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
            <Inbox size={40} color="var(--gray-300)" style={{ margin: '0 auto 14px', display: 'block' }} />
            <h3 style={{ margin: '0 0 6px', color: 'var(--gray-500)', fontWeight: 700 }}>
              {hi ? 'कोई शिकायत नहीं मिली' : 'No complaints found'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
              {hi ? 'फिल्टर बदलें या बाद में जांचें' : 'Try changing filters or check back later'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 600 }}>
              {complaints.length} {hi ? 'शिकायतें मिलीं' : 'complaints found'}
            </p>
            {complaints.map(c => (
              <ComplaintDetailCard
                key={c.id}
                c={c}
                language={language}
                onResolve={() => setResolving(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Resolution Modal ────────────────────────────────────────── */}
      {resolving && (
        <ResolveModal
          complaint={resolving}
          resolvedBy={user?.email ?? 'dept_staff'}
          language={language}
          onClose={() => setResolving(null)}
          onResolved={() => fetchComplaints(statusFilter, search)}
          resolveComplaint={resolveComplaint}
        />
      )}
    </div>
  );
}
