import React from 'react';
import { MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  onDetect: () => void; // still used for retry on failure
  language?: 'en' | 'hi';
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  address,
  loading,
  error,
  onDetect,
  language = 'en',
}) => {
  const locationReady = !!latitude && !!longitude;

  return (
    <div
      style={{
        background: locationReady ? 'var(--green-50, #f0fdf4)' : 'var(--theme-bg, #fff4e7)',
        border: locationReady
          ? '1.5px solid var(--green-300, #86efac)'
          : '1.5px solid var(--theme-component-border, #bfbfbf)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'var(--transition)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {loading ? (
          <>
            <Loader2 size={20} className="spin" color="var(--green-600)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--gray-800)',
                  fontSize: '0.9rem',
                }}
              >
                {language === 'hi'
                  ? 'स्थान का पता लगाया जा रहा है…'
                  : 'Detecting your location…'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {language === 'hi'
                  ? 'कृपया कुछ क्षण प्रतीक्षा करें'
                  : 'Please wait a moment'}
              </span>
            </div>
          </>
        ) : locationReady ? (
          <>
            <MapPin size={20} color="var(--green-600)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 800,
                  color: 'var(--green-800)',
                  fontSize: '0.9rem',
                }}
              >
                {language === 'hi'
                  ? 'स्थान सफलतापूर्वक दर्ज हो गया'
                  : 'Location detected successfully'}
              </span>
              {address && (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--gray-600)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {address}
                </span>
              )}
            </div>
            <CheckCircle2 size={20} color="var(--green-600)" />
          </>
        ) : (
          <>
            <AlertCircle size={20} color="#dc2626" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 800,
                  color: '#dc2626',
                  fontSize: '0.9rem',
                }}
              >
                {language === 'hi'
                  ? 'स्थान दर्ज नहीं हो सका'
                  : 'Could not detect location'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {error ||
                  (language === 'hi'
                    ? 'कृपया स्थान अनुमति दें और पुनः प्रयास करें'
                    : 'Please allow location access and retry')}
              </span>
              <button
                type="button"
                onClick={onDetect}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #dc2626',
                  background: '#fff',
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Privacy note */}
      <p
        style={{
          margin: '10px 0 0',
          fontSize: '0.72rem',
          color: 'var(--gray-500)',
          lineHeight: 1.4,
        }}
      >
        🔒{' '}
        {language === 'hi'
          ? 'आपका स्थान आपकी शिकायत के साथ सुरक्षित रूप से संलग्न किया जाएगा।'
          : 'Your location will be securely attached to your complaint.'}
      </p>
    </div>
  );
};
