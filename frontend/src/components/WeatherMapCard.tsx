import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { useStore } from '../state/store';
import { CloseIcon } from './icons';
import type { Location } from '../types';

const SINGAPORE: [number, number] = [1.3521, 103.8198];

function formatTemperature(value: number | null): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}°` : '--°';
}

function locationLabel(location: Location): string {
  const temperature = formatTemperature(location.weather.temperature_c);
  const condition = location.weather.condition?.trim();
  return `${temperature} · ${condition && condition.toLowerCase() !== 'unavailable' ? condition : 'Unavailable'}`;
}

function makeLocationIcon(selected: boolean) {
  return L.divIcon({
    className: 'weather-map-marker',
    html: `<span class="weather-map-marker-pin${selected ? ' is-selected' : ''}"><span></span></span>`,
    iconSize: [26, 32],
    iconAnchor: [13, 30],
  });
}

function FitLocations({ locations, fullscreen }: { locations: Location[]; fullscreen: boolean }) {
  const map = useMap();
  const points = useMemo(
    () => locations.map((location) => [location.latitude, location.longitude] as [number, number]),
    [locations],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (points.length === 0) {
        map.setView(SINGAPORE, 11);
      } else if (points.length === 1) {
        map.setView(points[0], 13);
      } else {
        map.fitBounds(points as LatLngBoundsExpression, { padding: [48, 48], maxZoom: 13 });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [fullscreen, map, points]);

  return null;
}

function WeatherMap({ fullscreen }: { fullscreen: boolean }) {
  const { locations, selectedId, select } = useStore();

  return (
    <MapContainer
      center={SINGAPORE}
      zoom={11}
      scrollWheelZoom={fullscreen}
      className={`weather-map-canvas h-full w-full${fullscreen ? ' is-fullscreen' : ''}`}
      zoomControl={fullscreen}
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
      />
      <FitLocations locations={locations} fullscreen={fullscreen} />
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
          icon={makeLocationIcon(location.id === selectedId)}
          eventHandlers={{ click: () => select(location.id) }}
          keyboard
          title={`${location.weather.area || 'Saved location'}: ${locationLabel(location)}`}
        >
          <Tooltip direction="top" offset={[0, -26]} permanent className="weather-map-label">
            <span className="weather-map-label-content">
              <span className="weather-map-label-temperature">
                {formatTemperature(location.weather.temperature_c)}
              </span>
              <span className="weather-map-label-condition">
                {location.weather.condition?.trim() &&
                location.weather.condition.toLowerCase() !== 'unavailable'
                  ? location.weather.condition
                  : 'Unavailable'}
              </span>
            </span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

export function WeatherMapCard() {
  const { locations, selectedId } = useStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const selected = locations.find((location) => location.id === selectedId);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  if (locations.length === 0) {
    return (
      <section className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
            Weather Map
          </h2>
        </header>
        <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-slate-900/20 text-sm text-white/65">
          Add a location to see it on the map.
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-[1.5rem] border border-white/15 bg-white/[0.08] p-4 shadow-[0_16px_45px_rgba(25,48,72,0.12)] backdrop-blur-xl sm:p-5">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white/90">
              Weather Map
            </h2>
            <p className="mt-0.5 text-xs text-white/60">{locations.length} saved locations</p>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="rounded-lg border border-white/80 bg-white px-3.5 py-2 text-xs font-medium text-[#1a73e8] shadow-sm hover:bg-slate-50"
            aria-label="Expand weather map to fullscreen"
          >
            Open map <span aria-hidden="true">↗</span>
          </button>
        </header>
        <div className="h-56 overflow-hidden rounded-[1.25rem] border border-white/35 shadow-inner sm:h-64">
          <WeatherMap fullscreen={false} />
        </div>
      </section>

      {isFullscreen && (
        <div
          className="weather-map-fullscreen fixed inset-0 z-[2000] bg-[#e8edf1]"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen weather map"
        >
          <WeatherMap fullscreen />
          <div className="pointer-events-none absolute left-4 right-4 top-4 z-[1000] flex items-start justify-between gap-3 sm:left-6 sm:right-6 sm:top-6">
            <div className="rounded-lg border border-white/80 bg-white px-4 py-3 text-slate-800 shadow-lg shadow-slate-900/15">
              <h2 className="text-sm font-semibold">Weather Map</h2>
              <p className="mt-0.5 text-xs text-slate-600">{locations.length} saved locations</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white text-slate-700 shadow-lg shadow-slate-900/15 hover:bg-slate-50"
              aria-label="Close fullscreen map"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          {selected && (
            <div className="pointer-events-none absolute bottom-5 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-white/80 bg-white px-5 py-3 text-slate-800 shadow-xl shadow-slate-900/15 sm:bottom-8">
              <p className="truncate text-sm font-semibold">
                {selected.weather.area || 'Saved location'}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {formatTemperature(selected.weather.temperature_c)}
                {' · '}
                {selected.weather.condition || 'Conditions unavailable'}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
