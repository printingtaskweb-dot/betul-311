import { useState } from 'react';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // Accuracy in meters (e.g. ± 3.5m)
  address: string | null;
  loading: boolean;
  error: string | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: null,
    loading: false,
    error: null,
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation is not supported by your browser.' }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));

    // High accuracy settings:
    // - enableHighAccuracy: true forces hardware GPS / satellite lock
    // - maximumAge: 0 forces fresh location reading (prevents cached/stale coordinates)
    // - timeout: 20000 allows GPS chip time to achieve satellite triangulation
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en,hi',
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              address = data.display_name;
            }
          }
        } catch {
          // fallback to coordinates if reverse geocode is slow/unavailable
        }

        setState({
          latitude,
          longitude,
          accuracy: accuracy ? Math.round(accuracy * 10) / 10 : null,
          address,
          loading: false,
          error: null,
        });
      },
      (err) => {
        let msg = err.message;
        if (err.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (err.code === 2) {
          msg = 'Position unavailable. Please ensure GPS / Location is turned ON.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        setState((s) => ({ ...s, loading: false, error: msg }));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  return { ...state, detectLocation };
}
