import React from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  onDetect: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude, longitude, address, loading, error, onDetect,
}) => {
  return (
    <div
      style={{
        background: '#f0fdf4',
        border: '1.5px solid #bbf7d0',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="#16a34a" />
          <span style={{ fontWeight: 600, color: '#166534', fontSize: 14 }}>Location</span>
        </div>
        <button
          type="button"
          onClick={onDetect}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: '#16a34a', color: '#fff', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <Navigation size={14} />}
          {loading ? 'Detecting…' : latitude ? 'Re-detect' : 'Auto-detect'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>⚠️ {error}</p>
      )}

      {latitude && longitude && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
            📍 {address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
          </p>
          <a
            href={`https://maps.google.com/?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}
          >
            View on map ↗
          </a>
        </div>
      )}

      {!latitude && !loading && !error && (
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
          Tap "Auto-detect" to capture your current location automatically.
        </p>
      )}
    </div>
  );
};
