import { useEffect } from 'react';
import { useFilterStore } from './useFilterStore';

export function useGeoLocation() {
  const { initialized, initialize } = useFilterStore();

  useEffect(() => {
    if (initialized) return;

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const countryCode = (data.country_code || 'US').toUpperCase();
        console.log(`[Geo] Detected country: ${countryCode}`);
        initialize(countryCode);
      })
      .catch(() => {
        console.warn('[Geo] Failed to detect location, defaulting to US');
        initialize('US');
      });
  }, [initialized, initialize]);
}
