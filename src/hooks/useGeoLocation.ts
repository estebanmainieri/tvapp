import { useEffect } from 'react';
import { useFilterStore } from './useFilterStore';

export function useGeoLocation() {
  const { initialized, initialize } = useFilterStore();

  useEffect(() => {
    if (initialized) return;

    const controller = new AbortController();
    fetch('https://api.country.is/', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        const countryCode = (data.country || 'US').toUpperCase();
        console.log(`[Geo] Detected country: ${countryCode}`);
        initialize(countryCode);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          console.warn('[Geo] Failed to detect location, defaulting to US');
          initialize('US');
        }
      });

    // Timeout fallback — don't block UI
    const timeout = setTimeout(() => {
      controller.abort();
      if (!useFilterStore.getState().initialized) {
        console.warn('[Geo] Timeout, defaulting to US');
        initialize('US');
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [initialized, initialize]);
}
