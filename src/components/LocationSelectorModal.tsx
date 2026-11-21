import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce.ts';
import { useDialogFocus } from '../hooks/useDialogFocus.ts';
import { searchCities } from '../services/api.ts';
import type { GeoLocation } from '../shared/types.ts';

interface LocationSelectorModalProps {
  open: boolean;
  onClose: () => void;
  currentLocation: GeoLocation;
  presets: GeoLocation[];
  onSelectLocation: (loc: GeoLocation) => void;
}

export function formatCoordinateRegion(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

export function LocationSelectorModal({
  open,
  onClose,
  currentLocation,
  presets,
  onSelectLocation,
}: LocationSelectorModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [sourceLabel, setSourceLabel] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'error'>('idle');
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(open);
  const geoRequestIdRef = useRef(0);
  const queryRef = useRef(query);

  useDialogFocus(open, dialogRef, onClose, inputRef);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    isOpenRef.current = open;
    if (!open) {
      geoRequestIdRef.current += 1;
      setQuery('');
      setResults([]);
      setSourceLabel('');
      setSearching(false);
      setSearchError(null);
      setGeoStatus('idle');
      setGeoMessage(null);
    }
    return () => {
      isOpenRef.current = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2 || queryRef.current.trim().length < 2) {
      setResults([]);
      setSourceLabel('');
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);

    searchCities(trimmed, controller.signal)
      .then((res) => {
        setResults(res.results);
        setSourceLabel(res.source);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchError(err instanceof Error ? err.message : 'Unable to search cities right now.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, open]);

  if (!open) return null;

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoMessage('Browser geolocation is not supported on this device. Please search for your city above.');
      return;
    }

    const requestId = ++geoRequestIdRef.current;
    setGeoStatus('requesting');
    setGeoMessage('Waiting for your browser location permission...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isOpenRef.current || geoRequestIdRef.current !== requestId) return;

        // Round to 2 decimal places (~1.1 km) to avoid collecting precise street-level coordinates
        const lat = Math.round(position.coords.latitude * 100) / 100;
        const lon = Math.round(position.coords.longitude * 100) / 100;
        const isRoughlyIndia = lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98;

        onSelectLocation({
          id: `geo-${lat}-${lon}`,
          name: 'Current Area',
          region: formatCoordinateRegion(lat, lon),
          country: isRoughlyIndia ? 'India' : 'Local Region',
          countryCode: isRoughlyIndia ? 'IN' : 'US',
          latitude: lat,
          longitude: lon,
        });
        setGeoStatus('idle');
        setGeoMessage(null);
        onClose();
      },
      (err) => {
        if (!isOpenRef.current || geoRequestIdRef.current !== requestId) return;

        setGeoStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMessage('Location permission was declined. You can search manually for any city below.');
        } else {
          setGeoMessage('Could not determine location. Please select a city manually.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B261D]/45 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-dialog-title"
        className="w-full max-w-lg bg-white border border-[#E2E8E5] rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8E5]">
          <div>
            <h2 id="location-dialog-title" className="text-lg font-semibold text-[#111C18]">
              Select monitoring location
            </h2>
            <p className="text-xs text-[#5E7068] mt-0.5">
              Active: {currentLocation.name}, {currentLocation.country}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location selector"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#4A5B54] hover:bg-[#F2FAF6] hover:text-[#11382B] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Manual city search */}
          <div>
            <label htmlFor="city-search-input" className="block text-sm font-medium text-[#111C18] mb-1.5">
              Search city or urban area
            </label>
            <div className="relative">
              <Search
                className="h-4 w-4 text-[#5E7068] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                id="city-search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type at least 2 characters (e.g., Delhi, Pune, London)"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CBD5D0] rounded-lg text-[#111C18] placeholder:text-[#5E7068] focus:border-[#11382B]"
              />
            </div>

            {searching && (
              <p className="text-xs text-[#5E7068] mt-2" role="status" aria-live="polite">
                Searching cities...
              </p>
            )}
            {searchError && (
              <p className="text-xs text-[#991B1B] mt-2" role="alert">
                {searchError}
              </p>
            )}

            {results.length > 0 && (
              <div className="mt-3 border border-[#E2E8E5] rounded-lg divide-y divide-[#E2E8E5]">
                {results.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[#F2FAF6] transition-colors flex items-center justify-between gap-4"
                  >
                    <span className="text-sm font-medium text-[#111C18]">
                      {loc.name}
                      {loc.region ? `, ${loc.region}` : ''}
                    </span>
                    <span className="text-xs text-[#5E7068] whitespace-nowrap">{loc.country}</span>
                  </button>
                ))}
                {sourceLabel && (
                  <div className="px-4 py-2 text-xs text-[#5E7068] bg-[#F6F8F7]">
                    Source: {sourceLabel}
                  </div>
                )}
              </div>
            )}

            {!searching && debouncedQuery.trim().length >= 2 && results.length === 0 && !searchError && (
              <p className="text-xs text-[#5E7068] mt-2">
                No matching cities found for &ldquo;{debouncedQuery.trim()}&rdquo;. Try another spelling or pick a city below.
              </p>
            )}
          </div>

          {/* Privacy-respecting optional browser geolocation */}
          <div className="p-4 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111C18]">Use approximate browser location</h3>
                <p className="text-xs text-[#4A5B54] mt-0.5">
                  Requires explicit browser permission. Coordinates are rounded to ~1 km and never stored on our server.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUseBrowserLocation}
                disabled={geoStatus === 'requesting'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-[#11382B] bg-white border border-[#CBD5D0] rounded-lg hover:bg-[#E6F4EE] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <LocateFixed className="h-4 w-4" aria-hidden="true" />
                {geoStatus === 'requesting' ? 'Requesting...' : 'Use my location'}
              </button>
            </div>
            {geoMessage && (
              <p
                className={`text-xs mt-2 ${geoStatus === 'error' ? 'text-[#991B1B]' : 'text-[#4A5B54]'}`}
                role={geoStatus === 'error' ? 'alert' : 'status'}
              >
                {geoMessage}
              </p>
            )}
          </div>

          {/* Quick preset cities */}
          <div>
            <h3 className="text-sm font-semibold text-[#111C18] mb-2">Featured urban monitoring cities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((city) => {
                const isSelected = city.name === currentLocation.name && city.countryCode === currentLocation.countryCode;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onSelectLocation(city);
                      onClose();
                    }}
                    className={`text-left px-3.5 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-[#11382B] bg-[#F2FAF6] text-[#11382B]'
                        : 'border-[#E2E8E5] bg-white text-[#111C18] hover:bg-[#F6F8F7]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-4 w-4 shrink-0 text-[#1F7A5C]" aria-hidden="true" />
                      <span className="text-sm font-medium truncate">{city.name}</span>
                    </span>
                    <span className="text-xs text-[#5E7068] shrink-0">{city.countryCode}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
