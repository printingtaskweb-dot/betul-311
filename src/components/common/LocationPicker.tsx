import React from 'react';
import { MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  onDetect: () => void; //import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertCircle, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CityOption {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
}

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  address: string | null;
  cityId: string | null;
  cityName: string | null;
  loading: boolean;
  error: string | null;
  onDetect: () => void;
  onManualCitySelect: (city: CityOption) => void;
  language?: 'en' | 'hi';
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  address,
  cityId,
  cityName,
  loading,
  error,
  onDetect,
  onManualCitySelect,
  language = 'en',
}) => {
  const locationReady = !!latitude && !!longitude;
  const [showManual, setShowManual] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [searching, setSearching] = useState(false);

  // Auto-search on typing (debounced)
  useEffect(() => {
    if (!showManual) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.rpc('search_cities', { p_query: cityQuery });
      setCityResults((data ?? []) as CityOption[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [cityQuery, showManual]);

  const pickCity = (city: CityOption) => {
    onManualCitySelect(city);
    setShowManual(false);
    setCityQuery('');
    setCityResults([]);
  };

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
              <span style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: '0.9rem' }}>
                {language === 'hi' ? 'स्थान का पता लगाया जा रहा है…' : 'Detecting your location…'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {language === 'hi' ? 'कृपया कुछ क्षण प्रतीक्षा करें' : 'Please wait a moment'}
              </span>
            </div>
          </>
        ) : locationReady ? (
          <>
            <MapPin size={20} color="var(--green-600)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 800, color: 'var(--green-800)', fontSize: '0.9rem' }}>
                {cityName
                  ? (language === 'hi' ? `स्थान: ${cityName}` : `Location: ${cityName}`)
                  : (language === 'hi' ? 'स्थान दर्ज हो गया' : 'Location detected')}
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
              <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.9rem' }}>
                {language === 'hi' ? 'स्थान दर्ज नहीं हो सका' : 'Could not detect location'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {error || (language === 'hi'
                  ? 'कृपया स्थान अनुमति दें और पुनः प्रयास करें'
                  : 'Please allow location access and retry')}
              </span>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={onDetect}
                  style={{
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
                <button
                  type="button"
                  onClick={() => setShowManual(v => !v)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--gray-300)',
                    background: '#fff',
                    color: 'var(--gray-700)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {language === 'hi' ? 'शहर मैन्युअल चुनें' : 'Choose city manually'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manual city search */}
      {showManual && (
        <div style={{ marginTop: 12, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              autoFocus
              placeholder={language === 'hi' ? 'शहर का नाम लिखें' : 'Type city name'}
              value={cityQuery}
              onChange={e => setCityQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 32px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--gray-200)',
                fontSize: '0.85rem',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {cityResults.length > 0 && (
            <div
              style={{
                marginTop: 6,
                maxHeight: 200,
                overflowY: 'auto',
                background: '#fff',
                border: '1.5px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {cityResults.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCity(c)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: 'none',
                    borderBottom: '1px solid var(--gray-100)',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                      {c.name}
                    </p>
                    {(c.district || c.state) && (
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                        {[c.district, c.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronDown size={14} color="var(--gray-400)" style={{ transform: 'rotate(-90deg)' }} />
                </button>
              ))}
            </div>
          )}

          {searching && (
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--gray-400)' }}>
              {language === 'hi' ? 'खोज रहे हैं…' : 'Searching…'}
            </p>
          )}
        </div>
      )}

      <p style={{ margin: '10px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)', lineHeight: 1.4 }}>
        🔒{' '}
        {language === 'hi'
          ? 'आपका स्थान आपकी शिकायत के साथ सुरक्षित रूप से संलग्न किया जाएगा।'
          : 'Your location will be securely attached to your complaint.'}
      </p>
    </div>
  );
}; still used for retry on failure
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
