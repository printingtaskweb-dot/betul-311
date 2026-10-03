import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDepartments, useComplaints } from '../hooks/useComplaints';
import { useLocation } from '../hooks/useLocation';
import { useStorage } from '../hooks/useStorage';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { LocationPicker } from '../components/common/LocationPicker';
import type { Department } from '../lib/supabase';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ComplaintForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { departments, loading: deptsLoading } = useDepartments();
  const { submitComplaint } = useComplaints();
  const loc = useLocation();
  const { uploadPhoto, uploading } = useStorage();

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-select dept from URL
  useEffect(() => {
    const slug = searchParams.get('dept');
    if (slug && departments.length > 0) {
      const dept = departments.find((d) => d.slug === slug);
      if (dept) setSelectedDept(dept);
    }
  }, [searchParams, departments]);

  const handleFileSelected = (file: File) => {
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return setError('Please select a department.');
    if (!description.trim()) return setError('Please describe the issue.');
    if (!photoFile) return setError('Please attach a photo.');
    if (!loc.latitude) return setError('Please detect your location.');

    setSubmitting(true);
    setError(null);

    try {
      const photoUrl = await uploadPhoto(photoFile);
      const complaint = await submitComplaint({
        department_id: selectedDept.id,
        citizen_name: citizenName || null,
        citizen_phone: citizenPhone || null,
        description,
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
        address: loc.address ?? null,
        photo_url: photoUrl,
      });
      setTicket(complaint.ticket_number);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }

    setSubmitting(false);
  };

  // Success screen
  if (ticket) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <CheckCircle2 size={64} color="#16a34a" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#111827', marginBottom: 8 }}>Complaint Submitted!</h2>
          <p style={{ color: '#6b7280', marginBottom: 4 }}>Your ticket number is:</p>
          <div style={{
            background: '#fff', border: '2px solid #16a34a',
            borderRadius: 12, padding: '16px 24px', marginBottom: 24,
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', letterSpacing: 2 }}>
              {ticket}
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24 }}>
            Save this number to track your complaint status. You'll be notified when it's resolved.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/track?ticket=${ticket}`)}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Track Status
            </button>
            <button
              onClick={() => navigate('/')}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer' }}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af, #4f46e5)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Report an Issue</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Indore Municipal Corporation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 40px' }}>
        {/* Department selector */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Select Department *</label>
          {deptsLoading ? (
            <div style={{ height: 44, background: '#e5e7eb', borderRadius: 8 }} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginTop: 8 }}>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 8px', borderRadius: 10,
                    border: selectedDept?.id === dept.id ? `2px solid ${dept.color}` : '1.5px solid #e5e7eb',
                    background: selectedDept?.id === dept.id ? `${dept.color}18` : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{dept.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{dept.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Photo */}
        <div style={sectionStyle}>
          <label style={labelStyle}>📸 Photo of Issue *</label>
          <div style={{ marginTop: 8 }}>
            <PhotoUploader
              onFileSelected={handleFileSelected}
              preview={preview}
              onClear={() => { setPhotoFile(null); setPreview(null); }}
              uploading={uploading}
            />
          </div>
        </div>

        {/* Location */}
        <div style={sectionStyle}>
          <label style={labelStyle}>📍 Location *</label>
          <div style={{ marginTop: 8 }}>
            <LocationPicker
              latitude={loc.latitude}
              longitude={loc.longitude}
              address={loc.address}
              loading={loc.loading}
              error={loc.error}
              onDetect={loc.detectLocation}
            />
          </div>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>📝 Description *</label>
          <textarea
            placeholder="Describe the issue clearly (e.g. Tree fallen on road near Palasia Square)…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
          />
        </div>

        {/* Optional contact */}
        <div style={sectionStyle}>
          <label style={labelStyle}>👤 Your Details (Optional)</label>
          <input
            placeholder="Name"
            value={citizenName}
            onChange={(e) => setCitizenName(e.target.value)}
            style={{ ...inputStyle, marginTop: 8 }}
          />
          <input
            placeholder="Phone number"
            value={citizenPhone}
            onChange={(e) => setCitizenPhone(e.target.value)}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 10,
            border: 'none', background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#fff', fontWeight: 700, fontSize: 16,
            cursor: submitting || uploading ? 'not-allowed' : 'pointer',
            opacity: submitting || uploading ? 0.7 : 1,
          }}
        >
          {submitting ? 'Submitting…' : '📤 Submit Complaint'}
        </button>
      </form>
    </div>
  );
};

const sectionStyle: React.CSSProperties = { marginBottom: 20 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 700, color: '#374151' };
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #d1d5db', fontSize: 14,
  color: '#111827', outline: 'none', background: '#fff',
};
