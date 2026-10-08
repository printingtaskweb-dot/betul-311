import React from 'react';
import { MapPin, Loader2, Navigation, Compass, ExternalLink } from 'lucide-react';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  onDetect: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  accuracy,
  address,
  loading,
  error,
  onDetect,
}) => {
  const directionsUrl =
    latitude && longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : null;

  return (
    <div
      style={{
        background: 'var(--green-50)',
        border: '1.5px solid var(--green-200)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="var(--green-600)" />
          <span style={{ fontWeight: 800, color: 'var(--green-900)', fontSize: '0.9rem' }}>
            GPS Location & Navigation
          </span>
        </div>
        <button
          type="button"
          onClick={onDetect}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'var(--green-600)',
            color: '#fff',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            opacity: loading ? 0.75 : 1,
            boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
            transition: 'var(--transition)',
          }}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <Navigation size={14} />}
          {loading ? 'Detecting GPS…' : latitude ? 'Update Location' : 'Auto-detect Location'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.82rem',
            lineHeight: 1.4,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {latitude && longitude && (
        <div style={{ marginTop: 12 }}>
          {/* Coordinates and accuracy badge */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--theme-primary, #660033)',
                background: 'var(--theme-bg, #fff4e7)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--theme-component-border, #bfbfbf)',
              }}
            >
              📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
            {accuracy !== undefined && accuracy !== null && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: accuracy <= 15 ? 'var(--green-700)' : 'var(--amber-500)',
                  background: accuracy <= 15 ? 'var(--green-100)' : '#fef3c7',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                🎯 Accuracy: ±{accuracy}m {accuracy <= 15 ? '(High Precision)' : '(Approximate)'}
              </span>
            )}
          </div>

          {/* Resolved street address */}
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--gray-700)',
              margin: '4px 0 10px',
              lineHeight: 1.4,
            }}
          >
            {address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
          </p>

          {/* Action buttons including Get Directions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--blue-600)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                }}
              >
                <Compass size={14} /> Get Directions (Google Maps)
              </a>
            )}
            <a
              href={`https://maps.google.com/?q=${latitude},${longitude}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.78rem',
                color: 'var(--gray-600)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <ExternalLink size={12} /> View Pin on Map
            </a>
          </div>
        </div>
      )}

      {!latitude && !loading && !error && (
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '8px 0 0' }}>
          Tap "Auto-detect Location" to record accurate GPS coordinates so municipal teams can navigate directly to the spot.
        </p>
      )}
    </div>
  );
};
