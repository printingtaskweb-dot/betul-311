import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Complaint } from '../../lib/supabase';
import { PhotoUploader } from '../common/PhotoUploader';
import { useStorage } from '../../hooks/useStorage';
import { StatusBadge } from '../common/StatusBadge';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ResolutionFormProps {
  complaint: Complaint;
  onUpdate: () => void;
}

export const ResolutionForm: React.FC<ResolutionFormProps> = ({ complaint, onUpdate }) => {
  const [note, setNote] = useState('');
  const [resolvedBy, setResolvedBy] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { uploadPhoto, uploading } = useStorage();

  const handleFileSelected = (file: File) => {
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleResolve = async () => {
    if (!resolvedBy.trim()) return alert('Please enter resolver name.');
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile);
    }

    const { error: resErr } = await supabase.from('resolutions').insert({
      complaint_id: complaint.id,
      admin_note: note,
      resolution_photo_url: photoUrl,
      resolved_by: resolvedBy,
    });

    if (!resErr) {
      await supabase.from('complaints').update({ status: 'resolved' }).eq('id', complaint.id);
    }

    setSubmitting(false);
    onUpdate();
  };

  const handleReject = async () => {
    if (!confirm('Mark this complaint as Rejected?')) return;
    await supabase.from('complaints').update({ status: 'rejected' }).eq('id', complaint.id);
    onUpdate();
  };

  const handleAdminVerify = async () => {
    await supabase.from('verifications').insert({
      complaint_id: complaint.id,
      verified_by: 'admin',
      is_satisfied: true,
      note: 'Verified by admin',
    });
    await supabase.from('complaints').update({ status: 'verified' }).eq('id', complaint.id);
    onUpdate();
  };

  const handleMarkInProgress = async () => {
    await supabase.from('complaints').update({ status: 'in_progress' }).eq('id', complaint.id);
    onUpdate();
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
          #{complaint.ticket_number}
        </h3>
        <StatusBadge status={complaint.status} />
      </div>

      {/* Action buttons based on status */}
      {complaint.status === 'pending' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={handleMarkInProgress} style={btnStyle('#2563eb')}>
            Mark In Progress
          </button>
          <button onClick={handleReject} style={btnStyle('#dc2626')}>
            <XCircle size={15} /> Reject
          </button>
        </div>
      )}

      {complaint.status === 'in_progress' && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12, color: '#374151' }}>Submit Resolution</h4>
          <input
            placeholder="Resolved by (name)"
            value={resolvedBy}
            onChange={(e) => setResolvedBy(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Resolution notes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', marginTop: 10 }}
          />
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Resolution Photo</label>
            <div style={{ marginTop: 6 }}>
              <PhotoUploader
                onFileSelected={handleFileSelected}
                preview={preview}
                onClear={() => { setPhotoFile(null); setPreview(null); }}
                uploading={uploading}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={handleResolve}
              disabled={submitting || uploading}
              style={btnStyle('#16a34a')}
            >
              <CheckCircle2 size={15} /> Submit as Resolved
            </button>
            <button onClick={handleReject} style={btnStyle('#dc2626')}>
              <XCircle size={15} /> Reject
            </button>
          </div>
        </div>
      )}

      {complaint.status === 'resolved' && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: '#7c3aed', fontSize: 14, fontWeight: 500 }}>
            ⏳ Awaiting citizen verification. You can also verify as admin:
          </p>
          <button onClick={handleAdminVerify} style={{ ...btnStyle('#16a34a'), marginTop: 10 }}>
            <CheckCircle2 size={15} /> Admin Verify & Close
          </button>
        </div>
      )}

      {complaint.status === 'verified' && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <p style={{ margin: 0, color: '#166534', fontWeight: 600, fontSize: 14 }}>
            ✅ This complaint is fully resolved and verified.
          </p>
        </div>
      )}
    </div>
  );
};

const btnStyle = (bg: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 8, border: 'none',
  background: bg, color: '#fff', fontWeight: 600,
  cursor: 'pointer', fontSize: 14,
});

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #d1d5db', fontSize: 14,
  color: '#111827', outline: 'none',
};
