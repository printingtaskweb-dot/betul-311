import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDeptComplaints, type DeptComplaint } from '../hooks/useDeptComplaints';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2, Search, Filter, CheckCircle, Clock,
  AlertCircle, XCircle, Camera,
  Navigation, Phone, User, Calendar, Hash,
  ChevronDown, ChevronUp, LogOut, RefreshCw,
  Inbox, CheckSquare, Plus, Layers, Briefcase,
  UserCheck, Send, FileText, ShieldAlert,
  ArrowRight, Info
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

interface StaffMember {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  staff_code: string | null;
  linked_department_id: string | null;
  authority_role?: string | null;
  hierarchy_code?: string | null;
}

interface Department {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string | null;
  is_active: boolean;
  is_custom?: boolean;
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return s;
  }
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
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--gray-800)' }}>
              📝 {hi ? 'हल का विवरण *' : 'Resolution Note *'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={hi ? 'क्या काम किया गया? कब किया?...' : 'What was done to resolve this issue? When?...'}
              rows={4}
              required
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)', fontSize: '0.88rem',
                background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)',
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--gray-800)' }}>
              📸 {hi ? 'काम का फोटो' : 'Work Done Photo'}{' '}
              <span style={{ fontWeight: 400, color: 'var(--gray-600)', fontSize: '0.78rem' }}>
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
                  borderRadius: 'var(--radius-md)', padding: '30px 20px',
                  textAlign: 'center', cursor: 'pointer',
                  background: 'var(--theme-bg, #fff4e7)',
                }}
              >
                <Camera size={28} color="var(--theme-primary, #660033)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>
                  {hi ? 'फोटो खींचें या अपलोड करें' : 'Take or Upload Photo'}
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

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
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
              }}
            >
              {submitting ? '...' : <><CheckCircle size={16} /> {hi ? 'हल के रूप में चिह्नित करें' : 'Mark as Resolved'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Task Allotment Modal ───────────────────────────────────────────────────
interface AllotModalProps {
  complaint: DeptComplaint;
  staffList: StaffMember[];
  currentUserId: string;
  language: 'en' | 'hi';
  onClose: () => void;
  onAllotted: () => void;
  assignComplaint: (id: string, staffId: string, assignedById?: string, notes?: string) => Promise<boolean>;
}

function AllotModal({ complaint, staffList, currentUserId, language, onClose, onAllotted, assignComplaint }: AllotModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState(complaint.assigned_to || '');
  const [instructions, setInstructions] = useState(complaint.assignment_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hi = language === 'hi';

  const handleAllot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErr(hi ? 'कृपया कार्य सौंपने के लिए एक कर्मचारी चुनें' : 'Please select an officer/staff member to assign.');
      return;
    }
    setSubmitting(true);
    setErr(null);

    const ok = await assignComplaint(complaint.id, selectedStaffId, currentUserId, instructions);
    if (ok) {
      onAllotted();
      onClose();
    } else {
      setErr(hi ? 'कार्य आवंटन में विफल। कृपया पुनः प्रयास करें।' : 'Failed to allot task. Please try again.');
    }
    setSubmitting(false);
  };

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 540,
        background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
      }}>
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', padding: '20px 24px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>
            📌 {hi ? 'शिकायत कार्य आवंटित करें' : 'Allot / Assign Grievance Task'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
            #{complaint.ticket_number} • {complaint.dept_name || 'Department'}
          </p>
        </div>

        <form onSubmit={handleAllot} style={{ padding: '24px' }}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.83rem', marginBottom: 18 }}>
              {err}
            </div>
          )}

          {/* Grievance preview summary */}
          <div style={{
            background: 'var(--theme-bg, #fff4e7)', padding: '12px 14px',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)',
            marginBottom: 20, fontSize: '0.84rem'
          }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>
              {complaint.description}
            </p>
            <div style={{ display: 'flex', gap: 14, color: 'var(--gray-600)', fontSize: '0.78rem', flexWrap: 'wrap' }}>
              {complaint.citizen_name && <span>👤 {complaint.citizen_name}</span>}
              {complaint.citizen_phone && <span>📞 {complaint.citizen_phone}</span>}
              {complaint.address && <span>📍 {complaint.address}</span>}
            </div>
          </div>

          {/* Select Staff Member */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--gray-800)' }}>
              👷 {hi ? 'अधीनस्थ अधिकारी / कर्मचारी चुनें *' : 'Select Officer / Field Staff Member *'}
            </label>
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              required
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #fff4e7)', fontSize: '0.88rem',
                color: 'var(--gray-900)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">-- {hi ? 'कर्मचारी चुनें' : 'Choose staff member'} --</option>
              {staffList.map(st => (
                <option key={st.id} value={st.id}>
                  {st.full_name || st.email || 'Unnamed'} ({st.role?.replace('_', ' ').toUpperCase() || 'STAFF'} {st.staff_code ? `• ${st.staff_code}` : ''} {st.phone ? `• 📞 ${st.phone}` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Staff Card */}
          {selectedStaff && (
            <div style={{
              background: 'var(--theme-bg, #fff4e7)', border: '1px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 18,
            }}>
              <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.88rem', color: 'var(--theme-primary, #660033)' }}>
                👤 {selectedStaff.full_name || 'Staff Member'}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--gray-700)', flexWrap: 'wrap' }}>
                <span><strong>Role:</strong> {selectedStaff.role?.replace('_', ' ')}</span>
                {selectedStaff.staff_code && <span><strong>Code:</strong> {selectedStaff.staff_code}</span>}
                {selectedStaff.phone && <span><strong>Phone:</strong> {selectedStaff.phone}</span>}
              </div>
            </div>
          )}

          {/* Instructions / Allotment Note */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--gray-800)' }}>
              📋 {hi ? 'निर्देश / विशेष टिप्पणी' : 'Site Instructions / Allotment Notes'}
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder={hi ? 'उदाहरण: मौके पर जाकर 3 घंटे में निरीक्षण करें और सुधार रिपोर्ट सबमिट करें...' : 'e.g. Inspect site by 2 PM, coordinate with local ward supervisor...'}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)', fontSize: '0.85rem',
                background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)',
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
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
              }}
            >
              {submitting ? '...' : <><Send size={15} /> {hi ? 'कार्य आवंटित करें' : 'Confirm Allotment'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Department Modal ────────────────────────────────────────────────
interface CreateDeptModalProps {
  language: 'en' | 'hi';
  onClose: () => void;
  onCreated: () => void;
}

const EMOJI_OPTIONS = ['🏢', '🧹', '🚰', '💡', '🛣️', '🌳', '🚒', '🏥', '🏗️', '📋', '⚡', '🚌', '🐕', '🛡️', '🌿', '🚿'];
const COLOR_OPTIONS = ['#660033', '#800040', '#4d0026', '#831843', '#9d174d', '#701a75', '#581c87', '#312e81', '#1e3a8a'];

function CreateDeptModal({ language, onClose, onCreated }: CreateDeptModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('🏢');
  const [color, setColor] = useState('#660033');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hi = language === 'hi';

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr(hi ? 'विभाग का नाम आवश्यक है' : 'Department name is required');
      return;
    }
    const cleanSlug = (slug || name.toLowerCase()).trim().replace(/[^a-z0-9_-]/g, '');
    if (!cleanSlug) {
      setErr(hi ? 'मान्य स्लग आवश्यक है' : 'Valid slug is required');
      return;
    }

    setSubmitting(true);
    setErr(null);

    try {
      const { error: insErr } = await supabase
        .from('departments')
        .insert({
          name: name.trim(),
          slug: cleanSlug,
          icon,
          color,
          description: description.trim() || null,
          is_active: true,
          is_custom: true,
        });

      if (insErr) throw insErr;
      onCreated();
      onClose();
    } catch (error: any) {
      setErr(error?.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
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
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', padding: '20px 24px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>
            🏢 {hi ? 'नया विभाग / श्रेणी जोड़ें' : 'Create New Department / Category'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
            {hi ? 'संस्थान प्रमुख द्वारा नागरिक सेवाओं के लिए नया अनुभाग' : 'Organization Head can add municipal service verticals'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.83rem', marginBottom: 18 }}>
              {err}
            </div>
          )}

          {/* Department Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              {hi ? 'विभाग का नाम *' : 'Department Name *'}
            </label>
            <input
              type="text"
              required
              placeholder={hi ? 'उदा. ठोस अपशिष्ट प्रबंधन या मार्ग प्रकाश' : 'e.g. Parks & Horticulture / Water Works'}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #fff4e7)', fontSize: '0.9rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Department Slug */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              {hi ? 'सिस्टम स्लग (पहचानकर्ता) *' : 'System Slug (Unique identifier) *'}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. parks-horticulture"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #fff4e7)', fontSize: '0.88rem',
                outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Icon Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              {hi ? 'आइकन प्रतीक' : 'Department Icon'}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJI_OPTIONS.map(em => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setIcon(em)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, fontSize: '1.2rem',
                    border: icon === em ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                    background: icon === em ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              {hi ? 'थीम रंग' : 'Department Accent Color'}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: color === c ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 0 2px #660033' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              {hi ? 'विभाग का विवरण' : 'Description'}
            </label>
            <textarea
              rows={3}
              placeholder={hi ? 'इस विभाग द्वारा हल की जाने वाली नागरिक समस्याओं का विवरण...' : 'Scope of work handled by this municipal department...'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)', fontSize: '0.85rem',
                background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)',
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
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
              }}
            >
              {submitting ? '...' : <><Plus size={16} /> {hi ? 'विभाग जोड़ें' : 'Create Department'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Complaint Detail Card ──────────────────────────────────────────────────
function ComplaintDetailCard({
  c, language, onResolve, onAllot
}: { c: DeptComplaint; language: 'en' | 'hi'; onResolve: () => void; onAllot: () => void }) {
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
          borderBottom: expanded ? '1.5px solid var(--theme-component-border, #bfbfbf)' : 'none',
        }}
      >
        {/* Complaint Photo Thumbnail */}
        <div style={{
          width: 60, height: 60, borderRadius: 'var(--radius-md)',
          background: 'var(--theme-bg, #fff4e7)', flexShrink: 0, overflow: 'hidden',
          border: '1px solid var(--theme-component-border, #bfbfbf)',
        }}>
          {c.photo_url ? (
            <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={22} color="var(--gray-500)" />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.8rem', fontWeight: 800, color: 'var(--theme-primary, #660033)',
                background: 'var(--theme-bg, #fff4e7)', padding: '2px 8px', borderRadius: 20,
                border: '1px solid var(--theme-component-border, #bfbfbf)'
              }}>
                #{c.ticket_number}
              </span>
              {c.dept_name && (
                <span style={{
                  fontSize: '0.74rem', fontWeight: 700, color: '#374151',
                  background: 'var(--theme-bg, #fff4e7)', padding: '2px 8px', borderRadius: 20,
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                }}>
                  {c.dept_icon} {c.dept_name}
                </span>
              )}
            </div>

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

          <p style={{ margin: '6px 0 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--gray-900)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.description}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
            {c.citizen_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                <User size={11} /> {c.citizen_name}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
              <Calendar size={11} /> {fmtDate(c.created_at)}
            </span>
          </div>

          {/* Allotment Indicator */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {c.assigned_to ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 6,
                background: 'var(--theme-bg, #fff4e7)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                fontSize: '0.75rem', color: 'var(--theme-primary, #660033)', fontWeight: 700,
              }}>
                <UserCheck size={12} />
                {hi ? 'आवंटित:' : 'Allotted to:'} {c.assigned_name || 'Staff Member'} {c.assigned_code ? `(${c.assigned_code})` : ''}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                background: '#fef3c7', color: '#92400e',
                fontSize: '0.73rem', fontWeight: 700,
              }}>
                <Clock size={11} /> {hi ? 'कार्य अभी आवंटित नहीं' : 'Unallotted'}
              </span>
            )}
          </div>

          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
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
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--theme-bg, #fff4e7)', color: 'var(--theme-primary, #660033)',
                  fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                }}
              >
                <Navigation size={12} /> {hi ? 'दिशा-निर्देश' : 'Get Directions'}
              </a>
            ) : <div />}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Task Allotment Button */}
              {c.status !== 'resolved' && c.status !== 'verified' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAllot();
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--theme-bg, #fff4e7)', color: 'var(--theme-primary, #660033)',
                    border: '1.5px solid var(--theme-primary, #660033)',
                    fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  <Briefcase size={13} />
                  {c.assigned_to ? (hi ? 'पुनः आवंटित करें' : 'Reassign Staff') : (hi ? 'कार्य आवंटित करें' : 'Allot to Staff')}
                </button>
              )}

              {/* Resolve Button */}
              {(c.status === 'pending' || c.status === 'in_progress') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve();
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                    color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  <Camera size={13} />
                  {hi ? 'हल करें' : 'Resolve'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ color: 'var(--gray-500)', flexShrink: 0, marginTop: 4 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ padding: '18px', background: 'rgba(255,255,255,0.2)' }}>
          {/* Assignment Details */}
          {c.assigned_to && (
            <div style={{
              background: 'var(--theme-bg, #fff4e7)', padding: '12px 14px',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)',
              marginBottom: 14,
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                📌 {hi ? 'कार्य आवंटन विवरण' : 'Task Allotment Details'}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--gray-800)', flexWrap: 'wrap' }}>
                <span><strong>Officer:</strong> {c.assigned_name || 'Staff Member'}</span>
                {c.assigned_phone && <span><strong>Phone:</strong> <a href={`tel:${c.assigned_phone}`} style={{ color: 'var(--theme-primary, #660033)' }}>{c.assigned_phone}</a></span>}
                {c.assigned_role && <span><strong>Role:</strong> {c.assigned_role}</span>}
                {c.assigned_at && <span><strong>Allotted:</strong> {fmtDate(c.assigned_at)}</span>}
              </div>
              {c.assignment_notes && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--gray-700)', fontStyle: 'italic' }}>
                  <strong>Note:</strong> "{c.assignment_notes}"
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--theme-bg, #fff4e7)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-800)', lineHeight: 1.6 }}>
              {c.description}
            </p>
          </div>

          {/* Citizen Details */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {c.citizen_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem',
                color: 'var(--gray-700)', background: 'var(--theme-bg, #fff4e7)', padding: '5px 10px',
                borderRadius: 20, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
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
                <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--gray-700)' }}>
                  📍 {c.address}
                </p>
              )}
              {c.latitude && c.longitude && (
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                  Coordinates: {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                </span>
              )}
            </div>
          )}

          {/* Resolution Info if resolved */}
          {c.resolution_note && (
            <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--theme-bg, #fff4e7)',
              borderRadius: 'var(--radius-md)', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary, #660033)', textTransform: 'uppercase' }}>
                ✅ {hi ? 'हल का विवरण' : 'Resolution Note'}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-800)' }}>
                {c.resolution_note}
              </p>
              {c.resolved_at && (
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                  {hi ? 'हल का समय:' : 'Resolved at:'} {fmtDate(c.resolved_at)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Department Dashboard ──────────────────────────────────────────────
export default function DeptDashboard() {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const hi = language === 'hi';

  const [profile, setProfile] = useState<{
    id: string;
    full_name: string | null;
    role: string | null;
    linked_department_id: string | null;
    dept_name: string | null;
    dept_slug: string | null;
    dept_color: string | null;
    dept_icon: string | null;
    is_admin?: boolean;
  } | null>(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'complaints' | 'departments' | 'staff_reports'>('complaints');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  // Modals state
  const [resolving, setResolving] = useState<DeptComplaint | null>(null);
  const [allotting, setAllotting] = useState<DeptComplaint | null>(null);
  const [showCreateDept, setShowCreateDept] = useState(false);

  // Entities state
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Hook for complaints
  const { complaints, loading, error, fetchComplaints, assignComplaint, resolveComplaint } = useDeptComplaints(
    selectedDeptId
  );

  // Load user profile & staff access check
  useEffect(() => {
    if (!user) { navigate('/dept/login', { replace: true }); return; }

    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, linked_department_id, is_admin')
        .eq('id', user.id)
        .single();

      if (!data || !STAFF_ROLES.includes(data.role ?? '')) {
        await supabase.auth.signOut();
        navigate('/dept/login', { replace: true });
        return;
      }

      let dName = hi ? 'समस्त विभाग / संगठन' : 'All Departments / Org Head';
      let dSlug = 'all';
      let dColor = '#660033';
      let dIcon = '🏛️';

      if (data.linked_department_id) {
        const { data: dept } = await supabase
          .from('departments')
          .select('name, slug, color, icon')
          .eq('id', data.linked_department_id)
          .single();
        if (dept) {
          dName = dept.name;
          dSlug = dept.slug;
          dColor = dept.color || '#660033';
          dIcon = dept.icon || '🏢';
        }
      }

      setProfile({
        id: data.id,
        full_name: data.full_name,
        role: data.role,
        linked_department_id: data.linked_department_id,
        dept_name: dName,
        dept_slug: dSlug,
        dept_color: dColor,
        dept_icon: dIcon,
        is_admin: data.is_admin,
      });

      // If user has a linked department, default selected dept to their dept
      if (data.linked_department_id) {
        setSelectedDeptId(data.linked_department_id);
      } else {
        setSelectedDeptId('all');
      }

      setProfileLoading(false);
    })();
  }, [user, navigate, hi]);

  // Load all departments & staff members
  const loadDepartmentsAndStaff = async () => {
    try {
      const { data: depts } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (depts) setAllDepartments(depts);

      const { data: staff } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, role, staff_code, linked_department_id, authority_role, hierarchy_code')
        .in('role', STAFF_ROLES)
        .order('full_name');
      if (staff) setStaffList(staff);
    } catch (e) {
      console.warn('Error loading depts/staff:', e);
    }
  };

  useEffect(() => {
    loadDepartmentsAndStaff();
  }, []);

  // Fetch complaints on filter change
  useEffect(() => {
    if (profile) {
      fetchComplaints(statusFilter, search);
    }
  }, [profile, selectedDeptId, statusFilter, fetchComplaints]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints(statusFilter, search);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/dept/login', { replace: true });
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'pending').length,
      in_progress: complaints.filter(c => c.status === 'in_progress').length,
      resolved: complaints.filter(c => ['resolved', 'verified'].includes(c.status)).length,
      verified: complaints.filter(c => c.status === 'verified').length,
      unallotted: complaints.filter(c => !c.assigned_to && (c.status === 'pending' || c.status === 'in_progress')).length,
    };
  }, [complaints]);

  // Staff Reports Computation
  const staffReports = useMemo(() => {
    return staffList.map(st => {
      const assigned = complaints.filter(c => c.assigned_to === st.id);
      const pending = assigned.filter(c => c.status === 'pending').length;
      const inProg = assigned.filter(c => c.status === 'in_progress').length;
      const done = assigned.filter(c => ['resolved', 'verified'].includes(c.status)).length;
      const rate = assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 100;
      return {
        ...st,
        totalAssigned: assigned.length,
        pending,
        inProg,
        done,
        rate,
      };
    });
  }, [staffList, complaints]);

  if (profileLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--theme-bg, #fff4e7)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--gray-700)', fontWeight: 700 }}>{hi ? 'विभाग डैशबोर्ड लोड हो रहा है...' : 'Loading Department Portal...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)' }}>

      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
        padding: '0 clamp(16px, 4vw, 32px)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 14px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                {profile?.dept_icon} {profile?.dept_name || 'Department'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
                {profile?.full_name ? `${profile.full_name} (${profile.role?.replace('_', ' ')})` : (hi ? 'संस्थान प्रमुख पोर्टल' : 'Organization Head Console')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Department selector */}
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', fontSize: '0.82rem', fontWeight: 700, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all" style={{ color: '#000' }}>🏛️ {hi ? 'समस्त विभाग' : 'All Departments'}</option>
              {allDepartments.map(d => (
                <option key={d.id} value={d.id} style={{ color: '#000' }}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>

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

      {/* ── Main Container ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(16px, 3vw, 28px) clamp(12px, 3vw, 24px)' }}>

        {/* Notice Banner: Constraint Clarification */}
        <div style={{
          background: 'var(--theme-component, #d9d9d9)',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--gray-800)' }}>
            <Info size={16} color="var(--theme-primary, #660033)" style={{ flexShrink: 0 }} />
            <span>
              {hi
                ? 'विभागीय प्रमुख के रूप में आप कार्य आवंटित कर सकते हैं, नई श्रेणियां बना सकते हैं और रिपोर्ट देख सकते हैं। नए स्टाफ पंजीकरण केवल एडमिन पोर्टल द्वारा होते हैं।'
                : 'As Head of Department / Organization, you can view all work, create new service categories, allot tasks to field officers, and inspect performance reports.'}
            </span>
          </div>
          <button
            onClick={() => setShowCreateDept(true)}
            style={{
              padding: '7px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
              color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(102,0,51,0.25)',
            }}
          >
            <Plus size={14} /> {hi ? 'नया विभाग जोड़ें' : 'Create New Department'}
          </button>
        </div>

        {/* ── Dashboard Tabs Navigation ────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--theme-component-border, #bfbfbf)',
          paddingBottom: 4, flexWrap: 'wrap',
        }}>
          {[
            { id: 'complaints', label: hi ? 'शिकायतें एवं कार्य' : 'Complaints & Tasks', icon: Briefcase, count: complaints.length },
            { id: 'departments', label: hi ? 'विभाग और श्रेणियां' : 'Departments & Categories', icon: Layers, count: allDepartments.length },
            { id: 'staff_reports', label: hi ? 'कर्मचारी कार्य रिपोर्ट' : 'Staff Work Reports', icon: FileText, count: staffList.length },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: active ? 'var(--theme-component, #d9d9d9)' : 'transparent',
                  color: active ? 'var(--theme-primary, #660033)' : 'var(--gray-700)',
                  fontWeight: active ? 900 : 700,
                  fontSize: '0.9rem', cursor: 'pointer',
                  borderBottom: active ? '3px solid var(--theme-primary, #660033)' : '3px solid transparent',
                  marginBottom: -6,
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span style={{
                  padding: '2px 7px', borderRadius: 12,
                  background: active ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                  color: active ? '#fff' : 'var(--gray-800)',
                  fontSize: '0.74rem', fontWeight: 800,
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: COMPLAINTS & TASKS ─────────────────────────────────── */}
        {activeTab === 'complaints' && (
          <>
            {/* KPI Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { key: 'all', label: hi ? 'कुल शिकायतें' : 'Total Grievances', val: stats.total, color: '#1e40af', bg: '#dbeafe', icon: Hash },
                { key: 'pending', label: hi ? 'लंबित' : 'Pending', val: stats.pending, color: '#92400e', bg: '#fef3c7', icon: Clock },
                { key: 'in_progress', label: hi ? 'प्रगति में' : 'In Progress', val: stats.in_progress, color: '#1d4ed8', bg: '#bfdbfe', icon: AlertCircle },
                { key: 'resolved', label: hi ? 'हल किए' : 'Resolved', val: stats.resolved, color: '#065f46', bg: '#d1fae5', icon: CheckCircle },
                { key: 'unallotted', label: hi ? 'अनआवंटित' : 'Unallotted', val: stats.unallotted, color: '#dc2626', bg: '#fee2e2', icon: ShieldAlert },
              ].map(s => {
                const Icon = s.icon;
                const isSelected = statusFilter === s.key;
                return (
                  <div
                    key={s.key}
                    onClick={() => {
                      if (s.key === 'unallotted') {
                        setStatusFilter('pending');
                      } else {
                        setStatusFilter(s.key);
                      }
                    }}
                    style={{
                      background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '16px',
                      border: isSelected ? '2px solid var(--theme-primary, #660033)' : '1.5px solid var(--theme-component-border, #bfbfbf)',
                      boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
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

            {/* Search + Filter toolbar */}
            <div style={{
              background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '16px',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)', marginBottom: 20,
              boxShadow: 'var(--shadow-sm)',
            }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative', minWidth: 220 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                  <input
                    type="text"
                    placeholder={hi ? 'टिकट नंबर, नाम या विवरण खोजें...' : 'Search ticket, citizen name, address...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px 10px 36px',
                      border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                      background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)',
                    }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Filter size={13} style={{ position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                      padding: '10px 14px 10px 32px',
                      border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)',
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
                    color: '#fff', fontWeight: 800, fontSize: '0.88rem',
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
                    color: 'var(--gray-800)', fontWeight: 700, fontSize: '0.88rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <RefreshCw size={13} /> {hi ? 'रिफ्रेश' : 'Refresh'}
                </button>
              </form>
            </div>

            {/* Complaints List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 14px' }} />
                <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', fontWeight: 700 }}>
                  {hi ? 'शिकायतें लोड हो रही हैं...' : 'Loading grievances...'}
                </p>
              </div>
            ) : error ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#fef2f2',
                borderRadius: 'var(--radius-lg)', border: '1.5px solid #fecaca' }}>
                <XCircle size={28} color="#dc2626" style={{ margin: '0 auto 10px', display: 'block' }} />
                <p style={{ margin: 0, color: '#dc2626', fontWeight: 700 }}>{error}</p>
              </div>
            ) : complaints.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--theme-component, #d9d9d9)',
                borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
                <Inbox size={40} color="var(--gray-500)" style={{ margin: '0 auto 14px', display: 'block' }} />
                <h3 style={{ margin: '0 0 6px', color: 'var(--gray-800)', fontWeight: 800 }}>
                  {hi ? 'कोई शिकायत नहीं मिली' : 'No grievances found'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  {hi ? 'फिल्टर बदलें या नया चयन करें' : 'Try selecting another status or category'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: 'var(--gray-600)', fontWeight: 700 }}>
                  {complaints.length} {hi ? 'शिकायतें प्रदर्शित' : 'complaints displayed'}
                </p>
                {complaints.map(c => (
                  <ComplaintDetailCard
                    key={c.id}
                    c={c}
                    language={language}
                    onResolve={() => setResolving(c)}
                    onAllot={() => setAllotting(c)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: DEPARTMENTS & CATEGORIES ───────────────────────────── */}
        {activeTab === 'departments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                  {hi ? 'नगर निगम विभाग और सेवा श्रेणियां' : 'Municipal Departments & Service Categories'}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                  {hi ? 'प्रत्येक श्रेणी के अंतर्गत कार्यप्रणाली और दर्ज शिकायतें' : 'All official civic categories configured in the IMC system'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateDept(true)}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                  color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.86rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 3px 10px rgba(102,0,51,0.25)',
                }}
              >
                <Plus size={16} /> {hi ? 'नया विभाग बनाएं' : 'Create New Department'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {allDepartments.map(dept => {
                const deptComplaints = complaints.filter(c => c.department_id === dept.id);
                const deptStaff = staffList.filter(s => s.linked_department_id === dept.id);
                return (
                  <div
                    key={dept.id}
                    style={{
                      background: 'var(--theme-component, #d9d9d9)',
                      border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                      borderRadius: 'var(--radius-lg)', padding: '18px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10,
                          background: 'var(--theme-bg, #fff4e7)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
                        }}>
                          {dept.icon || '🏢'}
                        </div>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12,
                          background: dept.is_active ? '#d1fae5' : '#fee2e2',
                          color: dept.is_active ? '#065f46' : '#991b1b',
                        }}>
                          {dept.is_active ? (hi ? 'सक्रिय' : 'Active') : (hi ? 'निष्क्रिय' : 'Inactive')}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                        {dept.name}
                      </h3>
                      <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: 'var(--gray-600)', fontFamily: 'monospace' }}>
                        slug: {dept.slug}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-700)', lineHeight: 1.4 }}>
                        {dept.description || (hi ? 'कोई विवरण नहीं' : 'No description provided.')}
                      </p>
                    </div>

                    <div style={{
                      marginTop: 16, paddingTop: 12,
                      borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                        <strong>{deptComplaints.length}</strong> {hi ? 'शिकायतें' : 'complaints'}
                        <span style={{ margin: '0 6px' }}>•</span>
                        <strong>{deptStaff.length}</strong> {hi ? 'स्टाफ' : 'staff'}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDeptId(dept.id);
                          setActiveTab('complaints');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6,
                          background: 'var(--theme-bg, #fff4e7)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                          color: 'var(--theme-primary, #660033)', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                        }}
                      >
                        {hi ? 'कार्य देखें' : 'View Work'} <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: STAFF WORK REPORTS ─────────────────────────────────── */}
        {activeTab === 'staff_reports' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                👥 {hi ? 'कर्मचारी कार्य निष्पादन रिपोर्ट' : 'Staff Work Allotment & Performance Reports'}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                {hi ? 'अधीनस्थ कर्मचारियों को सौंपे गए कार्य और निवारण स्थिति' : 'Workload, pending tasks, and resolution performance per officer'}
              </p>
            </div>

            {/* Performance Overview summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div style={{
                background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '16px',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                  {hi ? 'कुल अधिकारी / कर्मचारी' : 'Total Officers & Staff'}
                </span>
                <p style={{ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 900, color: 'var(--theme-primary, #660033)' }}>
                  {staffReports.length}
                </p>
              </div>

              <div style={{
                background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '16px',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                  {hi ? 'सक्रिय कार्य प्रगति में' : 'Tasks In Progress'}
                </span>
                <p style={{ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 900, color: '#1d4ed8' }}>
                  {staffReports.reduce((acc, curr) => acc + curr.inProg, 0)}
                </p>
              </div>

              <div style={{
                background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '16px',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                  {hi ? 'हल किए गए कार्य' : 'Resolved Tasks'}
                </span>
                <p style={{ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 900, color: '#065f46' }}>
                  {staffReports.reduce((acc, curr) => acc + curr.done, 0)}
                </p>
              </div>
            </div>

            {/* Staff Table / Cards */}
            <div style={{
              background: 'var(--theme-component, #d9d9d9)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', color: '#fff' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 800 }}>{hi ? 'कर्मचारी नाम' : 'Staff Member'}</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800 }}>{hi ? 'पद / भूमिका' : 'Role / Tier'}</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800 }}>{hi ? 'संपर्क' : 'Contact'}</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800 }}>{hi ? 'आवंटित कार्य' : 'Assigned Tasks'}</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800 }}>{hi ? 'प्रगति / लंबित' : 'In Progress'}</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800 }}>{hi ? 'हल कार्य' : 'Resolved'}</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800 }}>{hi ? 'सफलता दर' : 'Completion Rate'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffReports.map((st, idx) => (
                      <tr
                        key={st.id}
                        style={{
                          borderBottom: '1px solid var(--theme-component-border, #bfbfbf)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--gray-900)' }}>
                          <div>{st.full_name || 'Officer'}</div>
                          {st.staff_code && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--theme-primary, #660033)', fontFamily: 'monospace' }}>
                              {st.staff_code}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--gray-800)' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4,
                            background: 'var(--theme-bg, #fff4e7)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                            fontSize: '0.76rem', fontWeight: 700, textTransform: 'capitalize',
                          }}>
                            {st.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--gray-700)', fontSize: '0.8rem' }}>
                          {st.phone ? (
                            <a href={`tel:${st.phone}`} style={{ color: 'var(--theme-primary, #660033)', textDecoration: 'none', fontWeight: 700 }}>
                              📞 {st.phone}
                            </a>
                          ) : (
                            st.email || '—'
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--gray-900)' }}>
                          {st.totalAssigned}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: st.inProg > 0 ? '#1d4ed8' : 'var(--gray-600)', fontWeight: 700 }}>
                            {st.inProg + st.pending}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#065f46', fontWeight: 800 }}>
                            {st.done}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 60, height: 8, borderRadius: 4, background: 'var(--theme-component-border, #bfbfbf)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${st.rate}%`, height: '100%',
                                background: st.rate >= 80 ? '#15803d' : st.rate >= 50 ? '#d97706' : '#dc2626',
                              }} />
                            </div>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--gray-800)' }}>
                              {st.rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Allot Task Modal ───────────────────────────────────────────── */}
      {allotting && (
        <AllotModal
          complaint={allotting}
          staffList={staffList}
          currentUserId={user?.id || ''}
          language={language}
          onClose={() => setAllotting(null)}
          onAllotted={() => fetchComplaints(statusFilter, search)}
          assignComplaint={assignComplaint}
        />
      )}

      {/* ── Resolve Modal ──────────────────────────────────────────────── */}
      {resolving && (
        <ResolveModal
          complaint={resolving}
          resolvedBy={profile?.full_name || user?.email || 'dept_staff'}
          language={language}
          onClose={() => setResolving(null)}
          onResolved={() => fetchComplaints(statusFilter, search)}
          resolveComplaint={resolveComplaint}
        />
      )}

      {/* ── Create Department Modal ────────────────────────────────────── */}
      {showCreateDept && (
        <CreateDeptModal
          language={language}
          onClose={() => setShowCreateDept(false)}
          onCreated={() => {
            loadDepartmentsAndStaff();
            fetchComplaints(statusFilter, search);
          }}
        />
      )}

    </div>
  );
}
