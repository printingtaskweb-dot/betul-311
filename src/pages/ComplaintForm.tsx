import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { useDepartments, useComplaints } from '../hooks/useComplaints';
import { useLocation } from '../hooks/useLocation';
import { useStorage } from '../hooks/useStorage';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { LocationPicker } from '../components/common/LocationPicker';
import { BottomNav } from '../components/BottomNav';
import type { Department } from '../lib/supabase';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ComplaintForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useAuth();
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
    if (!selectedDept) {
      return setError(language === 'hi' ? 'कृपया विभाग का चयन करें।' : 'Please select a department.');
    }
    if (!description.trim()) {
      return setError(language === 'hi' ? 'कृपया शिकायत का विवरण दें।' : 'Please describe the issue.');
    }
    if (!photoFile) {
      return setError(language === 'hi' ? 'कृपया समस्या का फोटो अपलोड करें।' : 'Please attach a photo.');
    }
    if (!loc.latitude) {
      return setError(language === 'hi' ? 'कृपया अपना स्थान स्वतः दर्ज करें।' : 'Please auto-detect your location.');
    }

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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--green-50)',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
          <CheckCircle2 size={64} color="var(--green-600)" style={{ marginBottom: 16 }} />
          <h2 style={{ color: 'var(--green-900)', marginBottom: 8, fontSize: 'var(--text-xl)' }}>
            {t(language, 'success')}
          </h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 6, fontSize: '0.9rem' }}>
            {t(language, 'ticketGenerated')}:
          </p>
          <div
            style={{
              background: '#fff',
              border: '2px solid var(--green-400)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 24px',
              marginBottom: 20,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
                fontWeight: 900,
                color: 'var(--green-700)',
                letterSpacing: 2,
                fontFamily: 'monospace',
              }}
            >
              {ticket}
            </span>
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.5 }}>
            {language === 'hi'
              ? 'इस टिकट नंबर को सुरक्षित रखें। विभाग द्वारा समाधान के बाद आपको इसे सत्यापित करने का अवसर मिलेगा।'
              : 'Save this ticket number to track resolution progress. You will be able to verify once resolved.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/track?ticket=${ticket}`)}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--green-600)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {t(language, 'trackStatus')}
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--gray-300)',
                background: '#fff',
                color: 'var(--gray-700)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {t(language, 'home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              {t(language, 'reportIssue')}
            </h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>
              IMC & Betul Municipal Corporation · Swachh 311
            </p>
          </div>
        </div>
      </header>

      <div className="content-container-sm" style={{ paddingTop: 20 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fff',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(16px, 3vw, 28px)',
            border: '1.5px solid var(--gray-200)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Department selector */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              🏢 {t(language, 'selectDept')} *
            </label>
            {deptsLoading ? (
              <div className="shimmer" style={{ height: 48, borderRadius: 10, marginTop: 8 }} />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {departments.map((dept) => {
                  const isSelected = selectedDept?.id === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDept(dept)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '10px 6px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? `2px solid ${dept.color}` : '1.5px solid var(--gray-200)',
                        background: isSelected ? `${dept.color}15` : '#fff',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{dept.icon}</span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? dept.color : 'var(--gray-700)',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {dept.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Photo */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              📸 {t(language, 'uploadPhoto')} *
            </label>
            <div style={{ marginTop: 8 }}>
              <PhotoUploader
                onFileSelected={handleFileSelected}
                preview={preview}
                onClear={() => {
                  setPhotoFile(null);
                  setPreview(null);
                }}
                uploading={uploading}
              />
            </div>
          </div>

          {/* Location */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              📍 {t(language, 'detectLocation')} *
            </label>
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
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              📝 {t(language, 'description')} *
            </label>
            <textarea
              placeholder={
                language === 'hi'
                  ? 'समस्या का स्पष्ट विवरण दें (उदा. वार्ड 12 में मुख्य सड़क पर कचरा जमा है)...'
                  : 'Describe the issue clearly with landmark details…'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
            />
          </div>

          {/* Contact Details (Responsive 2 columns) */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>
              👤 {t(language, 'yourDetails')} ({t(language, 'optional')})
            </label>
            <div className="two-col-responsive" style={{ marginTop: 8 }}>
              <input
                placeholder={t(language, 'name')}
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder={t(language, 'phone')}
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 18,
                color: '#dc2626',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background:
                submitting || uploading
                  ? 'var(--gray-300)'
                  : 'linear-gradient(135deg, #15803d, #22c55e)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: submitting || uploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
              transition: 'var(--transition)',
            }}
          >
            {submitting ? 'Submitting…' : `📤 ${t(language, 'submit')}`}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.88rem',
  fontWeight: 700,
  color: 'var(--gray-800)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--gray-200)',
  fontSize: '0.88rem',
  color: 'var(--gray-900)',
  outline: 'none',
  background: '#fff',
};
