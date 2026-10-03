import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { useDepartments, useComplaints } from '../hooks/useComplaints';
import { useLocation as useGPS } from '../hooks/useLocation';
import { useStorage } from '../hooks/useStorage';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { LocationPicker } from '../components/common/LocationPicker';
import { ComplaintCard } from '../components/common/ComplaintCard';
import { ArrowLeft, Recycle, Info } from 'lucide-react';

const WASTE_TYPES = [
  { id: 'leaves', label: 'Fallen Leaves / गिरे पत्ते', hi: 'गिरे पत्ते', icon: '🍂' },
  { id: 'branches', label: 'Tree Branches / टहनियाँ', hi: 'टहनियाँ', icon: '🌿' },
  { id: 'garden', label: 'Garden Waste / बगीचा कचरा', hi: 'बगीचा कचरा', icon: '🌱' },
  { id: 'biodegradable', label: 'Biodegradable Waste / जैविक कचरा', hi: 'जैविक कचरा', icon: '♻️' },
  { id: 'tree_fall', label: 'Fallen Tree / गिरा पेड़', hi: 'गिरा पेड़', icon: '🌳', urgent: true },
  { id: 'other', label: 'Other Green Waste / अन्य', hi: 'अन्य', icon: '🗂️' },
];

export const GreenDepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useAuth();
  const { departments } = useDepartments();
  const { complaints, submitComplaint } = useComplaints('green');
  const gps = useGPS();
  const { uploadPhoto, uploading } = useStorage();

  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'report' | 'status'>('report');

  const greenDept = departments.find((d) => d.slug === 'green');

  const handleFileSelected = (file: File) => {
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return setError(language === 'hi' ? 'कचरे का प्रकार चुनें' : 'Please select waste type.');
    if (!photoFile) return setError(language === 'hi' ? 'फोटो जरूरी है' : 'Please attach a photo of the waste.');
    if (!gps.latitude) return setError(language === 'hi' ? 'स्थान पता करें' : 'Please detect your location.');
    if (!greenDept) return setError('Department not found. Please run the SQL setup.');

    setSubmitting(true); setError(null);
    try {
      const photoUrl = await uploadPhoto(photoFile);
      const wasteLabel = WASTE_TYPES.find((w) => w.id === selectedType)?.label || selectedType;
      const fullDesc = `[${wasteLabel}] ${description}`.trim();

      const result = await submitComplaint({
        department_id: greenDept.id,
        citizen_name: citizenName || null,
        citizen_phone: citizenPhone || null,
        description: fullDesc,
        latitude: gps.latitude ?? null,
        longitude: gps.longitude ?? null,
        address: gps.address ?? null,
        photo_url: photoUrl,
      });
      setTicket(result.ticket_number);
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  // ─── Success screen ───────────────────────────────────────
  if (ticket) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 70, animation: 'bounceIn 0.6s ease', marginBottom: 16 }}>✅</div>
          <h2 style={{ color: 'var(--green-800)', marginBottom: 8, fontSize: 22, fontWeight: 800 }}>
            {language === 'hi' ? 'शिकायत दर्ज हुई!' : 'Complaint Submitted!'}
          </h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 12, fontSize: 14 }}>
            {language === 'hi' ? 'आपका टिकट नंबर:' : 'Your ticket number:'}
          </p>
          <div style={{
            background: '#fff', border: '2px solid var(--green-400)',
            borderRadius: 14, padding: '16px 24px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--green-700)', letterSpacing: 2 }}>
              {ticket}
            </span>
          </div>
          <p style={{ color: 'var(--gray-400)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            {language === 'hi'
              ? 'IMC टीम जल्द संपर्क करेगी। कचरा उठान के बाद आपको सत्यापित करने को कहा जाएगा।'
              : 'The IMC Green team will contact you soon. You will be asked to verify after waste is collected.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/track?ticket=${ticket}`)}
              style={{ padding: '11px 20px', borderRadius: 10, border: 'none', background: 'var(--green-600)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              {language === 'hi' ? 'स्थिति देखें' : 'Track Status'}
            </button>
            <button
              onClick={() => { setTicket(null); setPhotoFile(null); setPreview(null); setDescription(''); setSelectedType(''); }}
              style={{ padding: '11px 20px', borderRadius: 10, border: '1.5px solid var(--gray-200)', background: '#fff', color: 'var(--gray-700)', fontWeight: 700, cursor: 'pointer' }}
            >
              {language === 'hi' ? 'नई शिकायत' : 'New Report'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main page ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #16a34a 80%, #22c55e 100%)',
        padding: '16px 20px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'rgba(255,255,255,0.15)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
              🌿 {language === 'hi' ? t(language, 'greenDeptTitle') : t(language, 'greenDeptTitle')}
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              {language === 'hi' ? t(language, 'greenDeptSubtitle') : t(language, 'greenDeptSubtitle')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'report', label: language === 'hi' ? '📸 शिकायत दर्ज' : '📸 Report' },
            { id: 'status', label: language === 'hi' ? '📋 स्थिति' : '📋 Status' },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id as any)}
              style={{
                padding: '8px 18px', borderRadius: 20,
                border: 'none', cursor: 'pointer',
                background: tab === tb.id ? '#fff' : 'rgba(255,255,255,0.2)',
                color: tab === tb.id ? 'var(--green-700)' : '#fff',
                fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: REPORT ──────────────────────────────────────── */}
      {tab === 'report' && (
        <form onSubmit={handleSubmit} style={{ padding: '20px 16px' }}>
          {/* Tip box */}
          <div style={{
            background: 'var(--green-50)', border: '1.5px solid var(--green-200)',
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', gap: 10, marginBottom: 20,
          }}>
            <Info size={18} color="var(--green-600)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--green-700)', lineHeight: 1.5 }}>
              {t(language, 'greenDeptTip')}
            </p>
          </div>

          {/* Waste type selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              🗂️ {language === 'hi' ? 'कचरे का प्रकार चुनें *' : 'Select Waste Type *'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              {WASTE_TYPES.map((wt) => (
                <button
                  key={wt.id} type="button"
                  onClick={() => setSelectedType(wt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 10,
                    border: selectedType === wt.id ? '2px solid var(--green-500)' : '1.5px solid var(--gray-200)',
                    background: selectedType === wt.id ? 'var(--green-50)' : '#fff',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{wt.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedType === wt.id ? 'var(--green-700)' : 'var(--gray-700)', lineHeight: 1.3 }}>
                    {language === 'hi' ? wt.hi : wt.label.split(' / ')[0]}
                  </span>
                  {wt.urgent && (
                    <span style={{
                      position: 'absolute', top: -6, right: 6,
                      background: '#dc2626', color: '#fff',
                      fontSize: 9, fontWeight: 700, padding: '2px 5px',
                      borderRadius: 4,
                    }}>
                      URGENT
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Photo */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              📸 {language === 'hi' ? 'फोटो अपलोड करें *' : 'Upload Photo *'}
            </label>
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
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              📍 {language === 'hi' ? 'स्थान *' : 'Location *'}
            </label>
            <div style={{ marginTop: 8 }}>
              <LocationPicker
                latitude={gps.latitude}
                longitude={gps.longitude}
                address={gps.address}
                loading={gps.loading}
                error={gps.error}
                onDetect={gps.detectLocation}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              📝 {language === 'hi' ? 'विवरण' : 'Additional Details'} ({language === 'hi' ? 'वैकल्पिक' : 'Optional'})
            </label>
            <textarea
              placeholder={language === 'hi' ? 'कचरे का और विवरण दें...' : 'Describe the issue in more detail...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
            />
          </div>

          {/* Contact */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              👤 {t(language, 'yourDetails')} ({t(language, 'optional')})
            </label>
            <input
              placeholder={t(language, 'name')}
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }}
            />
            <input
              placeholder={t(language, 'phone')}
              value={citizenPhone}
              onChange={(e) => setCitizenPhone(e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              color: '#dc2626', fontSize: 14,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit" disabled={submitting || uploading}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12,
              border: 'none',
              background: submitting || uploading
                ? 'var(--gray-300)'
                : 'linear-gradient(135deg, #14532d, #16a34a)',
              color: '#fff', fontWeight: 800, fontSize: 16,
              cursor: submitting || uploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(22,163,74,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              letterSpacing: 0.3,
            }}
          >
            <Recycle size={18} />
            {submitting ? 'Submitting…' : (language === 'hi' ? '📤 शिकायत जमा करें' : '📤 Submit Green Waste Report')}
          </button>
        </form>
      )}

      {/* ── TAB: STATUS ──────────────────────────────────────── */}
      {tab === 'status' && (
        <div style={{ padding: '20px 16px' }}>
          <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 700, color: 'var(--gray-800)' }}>
            {language === 'hi' ? 'हाल की शिकायतें' : 'Recent Green Complaints'}
          </h3>
          {complaints.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>🌿</p>
              <p>{language === 'hi' ? 'अभी कोई शिकायत नहीं' : 'No complaints yet.'}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {complaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} onClick={() => navigate(`/track?ticket=${c.ticket_number}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--gray-700)' };
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 12px', borderRadius: 10,
  border: '1.5px solid var(--gray-200)', fontSize: 14,
  color: 'var(--gray-900)', outline: 'none', background: '#fff',
};
