
import React from 'react';
import { MapPin, Loader2, Navigation, ExternalLink } from 'lucide-react';

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
  // Check null explicitly because 0 is a valid coordinate.
  const locationReady =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const directionsUrl = locationReady
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : null;

  return (
    <div
      style={{
        background: 'var(--green-50)',
        border: '1px solid var(--green-200)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--green-900)',
          }}
        >
          {loading ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <MapPin size={17} />
          )}

          <span>
            {loading
              ? 'Getting location...'
              : locationReady
                ? 'Location ready'
                : 'Location unavailable'}
          </span>
        </div>

        <button
          type="button"
          onClick={onDetect}
          disabled={loading}
          aria-label="Refresh GPS location"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--green-600)',
            color: '#fff',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '0.78rem',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Navigation size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: '10px 0 0',
            color: '#b91c1c',
            fontSize: '0.8rem',
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}

      {locationReady && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 700,
              overflowWrap: 'anywhere',
              color: 'var(--theme-primary, #660033)',
            }}
          >
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>

          {accuracy != null && Number.isFinite(accuracy) && (
            <p
              style={{
                margin: '5px 0',
                fontSize: '0.75rem',
                color: 'var(--gray-600)',
              }}
            >
              Reported GPS accuracy: ±{Math.round(accuracy)} m
            </p>
          )}

          {address && (
            <p
              style={{
                margin: '5px 0 0',
                fontSize: '0.8rem',
                color: 'var(--gray-700)',
                lineHeight: 1.5,
                overflowWrap: 'anywhere',
              }}
            >
              {address}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 10,
            }}
          >
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                <Navigation size={13} />
                Directions
              </a>
            )}

            <a
              href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              <ExternalLink size={13} />
              View map
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  color: 'var(--green-700)',
  fontSize: '0.78rem',
  fontWeight: 700,
  textDecoration: 'none',
};
