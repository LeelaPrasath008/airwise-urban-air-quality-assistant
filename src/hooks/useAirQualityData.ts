import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAirQuality, fetchPresetLocations } from '../services/api.ts';
import type { AirQualitySnapshot, AQIStandard, GeoLocation } from '../shared/types.ts';

export interface UseAirQualityDataResult {
  presets: GeoLocation[];
  snapshot: AirQualitySnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAirQualityData(
  location: GeoLocation,
  standard: AQIStandard,
  defaultLocation: GeoLocation
): UseAirQualityDataResult {
  const [presets, setPresets] = useState<GeoLocation[]>([defaultLocation]);
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const bypassNextCacheRef = useRef(false);

  // Fetch preset monitoring cities once
  useEffect(() => {
    const controller = new AbortController();
    fetchPresetLocations(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted && list.length > 0) {
          setPresets(list);
        }
      })
      .catch(() => {
        // Fallback already populated with default location
      });
    return () => controller.abort();
  }, []);

  // Fetch live air quality + weather when location, standard, or manual refresh changes
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const bypassCache = bypassNextCacheRef.current;
    bypassNextCacheRef.current = false;

    fetchAirQuality(location, standard, controller.signal, bypassCache)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSnapshot(data);
        }
      })
      .catch((err) => {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError')
        ) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to fetch air quality data. Please try refreshing.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [location, standard, refreshNonce]);

  const refresh = useCallback(() => {
    bypassNextCacheRef.current = true;
    setRefreshNonce((n) => n + 1);
  }, []);

  return {
    presets,
    snapshot,
    loading,
    error,
    refresh,
  };
}
