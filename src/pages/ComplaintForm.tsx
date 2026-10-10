import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { ArrowLeft, CheckCircle2, MapPin, Loader2, ChevronDown, Search, X } from 'lucide-react';

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

  // 🔹 Dropdown state
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState('');
  const deptBoxRef = useRef<HTMLDivElement>(null);

  // Location is considered "ready" only when we have coordinates
  const locationReady = !!loc.latitude && !!loc.longitude;

  // 🔹 Auto-detect location on mount (no manual button needed)
  useEffect(() => {
    loc.detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-select dept from URL
  useEffect(() => {
    const slug = searchParams.get('dept');
    if (slug && departments.length > 0) {
      const dept = departments.find((d) => d.slug === slug);
      if (dept) setSelectedDept(dept);
    }
  }, [searchParams, departments]);

  // 🔹 If location gets cleared, drop any attached photo
  useEffect(() => {
    if (!locationReady && photoFile) {
      setPhotoFile(null);
      setPreview(null);
    }
  }, [locationReady, photoFile]);

  // 🔹 Close dropdown on outside click / Escape
  useEffect(() => {
    if (!deptOpen) return;

    const onDocClick = (e: MouseEvent) => {
      if (deptBoxRef.current && !deptBoxRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeptOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [deptOpen]);

  // 🔹 Filter departments by search query
  const filteredDepts = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    if (!q) return departments;

    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.slug ?? '').toLowerCase().includes(q)
    );
  }, [departments, deptQuery]);

  const handleFileSelected = (file: File) => {
    if (!locationReady) return; // guard
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDept) {
      return setError(
        language === 'hi'
          ? 'कृपया विभाग का चयन करें।'
          : 'Please select a department.'
      );
    }

    // Location check BEFORE photo check
    if (!locationReady) {
      return setError(
        language === 'hi'
          ? 'कृपया पहले अपना स्थान स्वतः दर्ज होने दें।'
          : 'Please wait for your location to be auto-detected.'
      );
    }

    if (!photoFile) {
      return setError(
        language === 'hi'
          ? 'कृपया समस्या का फोटो अपलोड करें।'
          : 'Please attach a photo.'
      );
    }

    if (!description.trim()) {
      return setError(
        language === 'hi'
          ? 'कृपया शिकायत का विवरण दें।'
          : 'Please describe the issue.'
      );
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
          <CheckCircle2
            size={64}
            color="var(--green-600)"
            style={{ marginBottom: 16 }}
          />
          <h2
            style={{
              color: 'var(--green-900)',
              marginBottom: 8,
              fontSize: 'var(--text-xl)',
            }}
          >
            {t(language, 'success')}
          </h2>
          <p
            style={{
              color: 'var(--gray-500)',
              marginBottom: 6,
              fontSize: '0.9rem',
            }}
          >
            {t(language, 'ticketGenerated')}:
          </p>
          <div
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              border: '2px solid var(--theme-primary, #660033)',
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
                color: 'var(--theme-primary, #660033)',
                letterSpacing: 2,
                fontFamily: 'monospace',
              }}
            >
              {ticket}
            </span>
          </div>
          <p
            style={{
              color: 'var(--gray-600)',
              fontSize: '0.85rem',
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            {language === 'hi'
              ? 'इस टिकट नंबर को सुरक्षित रखें। विभाग द्वारा समाधान के बाद आपको इसे सत्यापित करने का अवसर मिलेगा।'
              : 'Save this ticket number to track resolution progress. You will be able to verify once resolved.'}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => navigate(`/track?ticket=${ticket}`)}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background:
                  'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
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
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-component, #d9d9d9)',
                color: 'var(--gray-800)',
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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--gray-50)',
        paddingBottom: 90,
      }}
    >
      {/* Header */}
      <header
        style={{
          background:
            'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
          padding: '14px 20px',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="app-container"
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
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
            <h1
              style={{
                margin: 0,
                fontSize: 'var(--text-lg)',
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {t(language, 'reportIssue')}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              IMC & Betul Municipal Corporation · Swachh 311
            </p>
          </div>
        </div>
      </header>

      <div className="content-container-sm" style={{ paddingTop: 20 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(16px, 3vw, 28px)',
            border: '1.5px solid var(--theme-component-border, #bfbfbf)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* ===== Department selector — DROPDOWN ===== */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              🏢 {t(language, 'selectDept')} *
            </label>

            {deptsLoading ? (
              <div
                className="shimmer"
                style={{ height: 48, borderRadius: 10, marginTop: 8 }}
              />
            ) : (
              <div
                ref={deptBoxRef}
                style={{ position: 'relative', marginTop: 8 }}
              >
                {/* Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setDeptOpen((o) => !o);
                    setDeptQuery('');
                  }}
                  style={{
                    ...inputStyle,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: selectedDept
                      ? `2px solid ${selectedDept.color}`
                      : '1.5px solid var(--theme-component-border, #bfbfbf)',
                  }}
                >
                  {selectedDept ? (
                    <>
                      <span style={{ fontSize: 20, lineHeight: 1 }}>
                        {selectedDept.icon}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontWeight: 700,
                          color: selectedDept.color,
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {selectedDept.name}
                      </span>
                    </>
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        color: 'var(--gray-500)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {language === 'hi'
                        ? '-- विभाग चुनें --'
                        : '-- Select a department --'}
                    </span>
                  )}
                  <ChevronDown
                    size={18}
                    style={{
                      flexShrink: 0,
                      color: 'var(--gray-500)',
                      transition: 'transform 0.2s ease',
                      transform: deptOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Menu */}
                {deptOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      zIndex: 60,
                      background: 'var(--theme-bg, #fff4e7)',
                      border:
                        '1.5px solid var(--theme-component-border, #bfbfbf)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Search box */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--gray-200)',
                        background: '#fff',
                      }}
                    >
                      <Search size={15} color="var(--gray-500)" />
                      <input
                        autoFocus
                        value={deptQuery}
                        onChange={(e) => setDeptQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        placeholder={
                          language === 'hi'
                            ? 'विभाग खोजें…'
                            : 'Search department…'
                        }
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontSize: '0.88rem',
                          color: 'var(--gray-900)',
                        }}
                      />
                      {deptQuery && (
                        <button
                          type="button"
                          onClick={() => setDeptQuery('')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                          }}
                        >
                          <X size={14} color="var(--gray-500)" />
                        </button>
                      )}
                    </div>

                    {/* Options list */}
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {filteredDepts.length === 0 ? (
                        <div
                          style={{
                            padding: '14px 16px',
                            fontSize: '0.85rem',
                            color: 'var(--gray-500)',
                            textAlign: 'center',
                          }}
                        >
                          {language === 'hi'
                            ? 'कोई विभाग नहीं मिला'
                            : 'No departments found'}
                        </div>
                      ) : (
                        filteredDepts.map((dept) => {
                          const isSelected = selectedDept?.id === dept.id;

                          return (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => {
                                setSelectedDept(dept);
                                setDeptOpen(false);
                                setDeptQuery('');
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '11px 14px',
                                border: 'none',
                                borderLeft: isSelected
                                  ? `3px solid ${dept.color}`
                                  : '3px solid transparent',
                                background: isSelected
                                  ? `${dept.color}1A`
                                  : 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.88rem',
                                fontWeight: isSelected ? 800 : 600,
                                color: isSelected
                                  ? dept.color
                                  : 'var(--gray-800)',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = 'var(--gray-100)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = 'transparent';
                                }
                              }}
                            >
                              <span style={{ fontSize: 20, lineHeight: 1 }}>
                                {dept.icon}
                              </span>
                              <span style={{ flex: 1 }}>{dept.name}</span>
                              {isSelected && (
                                <CheckCircle2 size={16} color={dept.color} />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* ===== /Department selector ===== */}

          {/* Location — moved ABOVE photo, auto-detected on mount */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              📍 {t(language, 'detectLocation')} *
            </label>
            <div style={{ marginTop: 8 }}>
              <LocationPicker
  latitude={loc.latitude}
  longitude={loc.longitude}
  accuracy={loc.accuracy}
  address={loc.address}
  loading={loc.loading}
  error={loc.error}
  onDetect={loc.detectLocation}
/>
              
            </div>
            {locationReady && !loc.loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  fontSize: '0.78rem',
                  color: 'var(--green-700)',
                  fontWeight: 600,
                }}
              >
                <MapPin size={12} />
                {language === 'hi'
                  ? 'स्थान सफलतापूर्वक दर्ज हो गया'
                  : 'Location detected successfully'}
              </div>
            )}
          </div>

          {/* Photo — disabled until location ready */}
          <div style={{ marginBottom: 22 }}>
            <label
              style={{
                ...labelStyle,
                opacity: locationReady ? 1 : 0.5,
              }}
            >
              📸 {t(language, 'uploadPhoto')} *
            </label>
            <div style={{ marginTop: 8, position: 'relative' }}>
              <div
                style={{
                  opacity: locationReady ? 1 : 0.5,
                  pointerEvents: locationReady ? 'auto' : 'none',
                }}
              >
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

              {!locationReady && (
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.78rem',
                    color: 'var(--gray-600)',
                    fontWeight: 600,
                  }}
                >
                  {loc.loading ? (
                    <>
                      <Loader2 size={12} className="spin" />
                      {language === 'hi'
                        ? 'स्थान का पता लगाया जा रहा है… फोटो अपलोड करने के लिए कृपया प्रतीक्षा करें'
                        : 'Detecting location… please wait before uploading a photo'}
                    </>
                  ) : (
                    <>
                      <MapPin size={12} />
                      {language === 'hi'
                        ? 'फोटो अपलोड करने के लिए पहले स्थान दर्ज होना आवश्यक है'
                        : 'Location must be detected before uploading a photo'}
                    </>
                  )}
                </div>
              )}
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
              style={{
                ...inputStyle,
                marginTop: 8,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Contact Details */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>
              👤 {t(language, 'yourDetails')} ({t(language, 'optional')})
            </label>
            <div
              className="two-col-responsive"
              style={{ marginTop: 8 }}
            >
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
            disabled={submitting || uploading || !locationReady}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background:
                submitting || uploading || !locationReady
                  ? 'var(--gray-300)'
                  : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              cursor:
                submitting || uploading || !locationReady
                  ? 'not-allowed'
                  : 'pointer',
              boxShadow: '0 4px 16px rgba(102,0,51,0.3)',
              transition: 'var(--transition)',
            }}
          >
            {submitting
              ? 'Submitting…'
              : !locationReady
              ? language === 'hi'
                ? 'स्थान दर्ज होने की प्रतीक्षा…'
                : 'Waiting for location…'
              : `📤 ${t(language, 'submit')}`}
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
  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
  fontSize: '0.88rem',
  color: 'var(--gray-900)',
  outline: 'none',
  background: 'var(--theme-bg, #fff4e7)',
};
