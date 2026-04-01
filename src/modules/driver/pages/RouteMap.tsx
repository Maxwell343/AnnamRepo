import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Flag, MapPin, Navigation, Package, Truck } from 'lucide-react';
import Map, { Layer, Marker, Source } from 'react-map-gl/mapbox';
import { API_ENDPOINTS } from '../../../config/api';
import './RouteMap.css';
import 'mapbox-gl/dist/mapbox-gl.css';

type Stage = 'PICKUP' | 'DELIVERY';

type LngLat = {
  lng: number;
  lat: number;
};

type RouteGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

type DirectionsApiResponse = {
  routes: Array<{
    geometry: RouteGeometry;
    distance?: number;
  }>;
};

type DriverTask = {
  id: string;
  listing_id: string;
  title?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | string;
  pickup_address?: string;
  delivery_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  pickup_location?: {
    lat?: number;
    lng?: number;
  };
  delivery_location?: {
    lat?: number;
    lng?: number;
  };
  current_location?: {
    lat?: number;
    lng?: number;
  };
};

type ListingTrackingPayload = {
  listing?: any;
  task?: DriverTask | null;
};

const MAX_SERVICE_DISTANCE_KM = 5;

const readRuntimeMapboxToken = (): string => {
  if (typeof window === 'undefined') return '';

  const localToken = window.localStorage.getItem('MAPBOX_TOKEN') || '';
  const windowToken = (window as any).MAPBOX_TOKEN || '';
  return localToken || windowToken;
};

const MAPBOX_TOKEN = (
  (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_MAPBOX_TOKEN ||
  (globalThis as any)?.process?.env?.REACT_APP_MAPBOX_TOKEN ||
  readRuntimeMapboxToken() ||
  'pk.eyJ1IjoicGFyYWJhYWRpdHlhNzg1IiwiYSI6ImNtbmVwNm15MjAxc2kyc3M5M3NlMHlja24ifQ.iQEjYpmyZB8WYBgJRPDqUw'
).trim();

const DEFAULT_VIEW_CENTER: LngLat = { lng: 78.9629, lat: 20.5937 };

const routeLineLayer = {
  id: 'routeLine',
  type: 'line',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 5,
    'line-opacity': 0.9,
  },
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
} as const;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

const getDistanceKm = (from: LngLat, to: LngLat): number => {
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const geocodeAddress = async (address: string, token: string): Promise<LngLat | null> => {
  if (!address.trim() || !token) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&access_token=${token}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const center = data?.features?.[0]?.center;
    if (!Array.isArray(center) || center.length < 2) return null;
    return { lng: Number(center[0]), lat: Number(center[1]) };
  } catch {
    return null;
  }
};

const toNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveTaskPoint = (
  directLat?: unknown,
  directLng?: unknown,
  nested?: { lat?: unknown; lng?: unknown }
): LngLat | null => {
  const lat = toNumber(directLat) ?? toNumber(nested?.lat);
  const lng = toNumber(directLng) ?? toNumber(nested?.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
};

const RouteMap: React.FC = () => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<DriverTask | null>(null);
  const [driverLocation, setDriverLocation] = useState<LngLat | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LngLat | null>(null);
  const [dropLocation, setDropLocation] = useState<LngLat | null>(null);
  const [viewState, setViewState] = useState({
    longitude: DEFAULT_VIEW_CENTER.lng,
    latitude: DEFAULT_VIEW_CENTER.lat,
    zoom: 12,
  });
  const [stage, setStage] = useState<Stage>('PICKUP');
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/auth');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'driver') {
      navigate('/home');
      return;
    }

    setDriverId(String(parsedUser.id));
  }, [navigate]);

  useEffect(() => {
    if (!driverId) return;

    const fetchActiveTask = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.driverTasks(driverId));
        if (!response.ok) {
          setActiveTaskId(null);
          setActiveTask(null);
          return;
        }

        const data = await response.json();
        const tasks: DriverTask[] = data.tasks || [];
        const selectedTask = tasks.find((task) =>
          ['pending', 'picked_up', 'in_transit', 'assigned'].includes(task.status)
        );

        setActiveTaskId(selectedTask ? String(selectedTask.id) : null);
        setActiveTask(selectedTask || null);
      } catch {
        setActiveTaskId(null);
        setActiveTask(null);
      }
    };

    fetchActiveTask();
  }, [driverId]);

  useEffect(() => {
    if (!activeTask) {
      setPickupLocation(null);
      setDropLocation(null);
      return;
    }

    const resolveStops = async () => {
      const pickupFromTask = resolveTaskPoint(
        activeTask.pickup_lat,
        activeTask.pickup_lng,
        activeTask.pickup_location
      );
      const dropFromTask = resolveTaskPoint(
        activeTask.delivery_lat,
        activeTask.delivery_lng,
        activeTask.delivery_location
      );

      let fallbackPickup: LngLat | null = null;
      let fallbackDrop: LngLat | null = null;
      let pickupAddressFallback = activeTask.pickup_address || '';
      let dropAddressFallback = activeTask.delivery_address || '';

      if ((!pickupFromTask || !dropFromTask) && activeTask.listing_id) {
        try {
          const trackingRes = await fetch(API_ENDPOINTS.listingTracking(String(activeTask.listing_id)));
          if (trackingRes.ok) {
            const trackingData = (await trackingRes.json()) as ListingTrackingPayload;
            const listing = trackingData?.listing || {};
            const claimedBy = listing?.claimed_by || {};

            fallbackPickup = resolveTaskPoint(
              listing?.pickup_lat,
              listing?.pickup_lng,
              listing?.pickup_location || listing?.location
            );

            fallbackDrop = resolveTaskPoint(
              listing?.delivery_lat,
              listing?.delivery_lng,
              listing?.delivery_location || claimedBy?.location
            );

            pickupAddressFallback =
              pickupAddressFallback ||
              listing?.pickup_address ||
              listing?.location_address ||
              listing?.location?.address ||
              '';

            dropAddressFallback =
              dropAddressFallback ||
              listing?.delivery_address ||
              claimedBy?.ngo_address ||
              claimedBy?.address ||
              claimedBy?.location?.address ||
              '';
          }
        } catch {
          // Best-effort fallback only.
        }
      }

      const [pickupGeo, dropGeo] = await Promise.all([
        pickupFromTask || fallbackPickup
          ? Promise.resolve(null)
          : geocodeAddress(pickupAddressFallback, MAPBOX_TOKEN),
        dropFromTask || fallbackDrop
          ? Promise.resolve(null)
          : geocodeAddress(dropAddressFallback, MAPBOX_TOKEN),
      ]);

      const resolvedPickup = pickupFromTask || fallbackPickup || pickupGeo;
      const resolvedDrop = dropFromTask || fallbackDrop || dropGeo;

      setPickupLocation(resolvedPickup || null);
      setDropLocation(resolvedDrop || null);

      // Keep the map centered near delivery area once coordinates are known.
      const center = resolvedDrop || resolvedPickup;
      if (center) {
        setViewState((prev) => ({
          ...prev,
          longitude: center.lng,
          latitude: center.lat,
          zoom: Math.max(prev.zoom, 11),
        }));
      }
    };

    resolveStops();
  }, [activeTask]);

  useEffect(() => {
    if (!activeTask) return;
    setStage(['picked_up', 'in_transit'].includes(activeTask.status) ? 'DELIVERY' : 'PICKUP');
  }, [activeTask]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported in this browser. Using default location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation: LngLat = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };
        setDriverLocation(currentLocation);
        setLocationError(null);
        setViewState((prev) => ({
          ...prev,
          longitude: currentLocation.lng,
          latitude: currentLocation.lat,
          zoom: Math.max(prev.zoom, 12),
        }));
      },
      () => {
        setLocationError('Location permission denied. Using default location.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  useEffect(() => {
    if (!activeTaskId || !driverLocation) return;

    const updateLocation = async () => {
      try {
        await fetch(API_ENDPOINTS.deliveryTaskLocation(activeTaskId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: driverLocation.lat,
            lng: driverLocation.lng,
          }),
        });
      } catch {
        // Best-effort update; UI remains functional even if tracking update fails.
      }
    };

    updateLocation();
  }, [activeTaskId, driverLocation]);

  const origin = useMemo<LngLat | null>(
    () => driverLocation ?? resolveTaskPoint(activeTask?.current_location?.lat, activeTask?.current_location?.lng),
    [activeTask?.current_location?.lat, activeTask?.current_location?.lng, driverLocation]
  );

  const destination = useMemo<LngLat | null>(
    () => (stage === 'PICKUP' ? pickupLocation : dropLocation),
    [stage, pickupLocation, dropLocation]
  );

  const straightDistanceKm = useMemo(() => {
    if (!origin || !destination) return null;
    return getDistanceKm(origin, destination);
  }, [origin, destination]);
  const withinServiceRange =
    straightDistanceKm !== null && straightDistanceKm <= MAX_SERVICE_DISTANCE_KM;

  const routeFeature = useMemo(() => {
    if (!routeGeometry) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: routeGeometry,
    };
  }, [routeGeometry]);

  const fetchRoute = useCallback(
    async (signal?: AbortSignal) => {
      if (!origin || !destination) {
        setRouteGeometry(null);
        setRouteDistanceKm(null);
        setRouteError('Task coordinates are unavailable. Update pickup and delivery addresses.');
        return;
      }

      if (!MAPBOX_TOKEN) {
        setRouteError('Mapbox token missing. Set VITE_MAPBOX_TOKEN in your .env file.');
        setRouteGeometry(null);
        setRouteDistanceKm(null);
        return;
      }

      setIsRouteLoading(true);
      setRouteError(null);

      try {
        const from = `${origin.lng},${origin.lat}`;
        const to = `${destination.lng},${destination.lat}`;
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${from};${to}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(directionsUrl, { signal });
        if (!response.ok) {
          throw new Error(`Directions API failed with status ${response.status}`);
        }

        const data = (await response.json()) as DirectionsApiResponse;
        const firstRoute = data.routes?.[0];
        const geometry = firstRoute?.geometry;

        if (!geometry || geometry.type !== 'LineString' || !geometry.coordinates?.length) {
          throw new Error('No valid route geometry returned by Mapbox.');
        }

        setRouteGeometry(geometry);
        setRouteDistanceKm(typeof firstRoute.distance === 'number' ? firstRoute.distance / 1000 : null);
      } catch (error) {
        if (signal?.aborted) return;
        console.error('Route fetch failed:', error);
        setRouteGeometry(null);
        setRouteDistanceKm(null);
        setRouteError('Unable to fetch route right now. Please try again.');
      } finally {
        if (!signal?.aborted) {
          setIsRouteLoading(false);
        }
      }
    },
    [destination, origin]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchRoute(controller.signal);

    return () => controller.abort();
  }, [fetchRoute]);

  const stageTitle = stage === 'PICKUP' ? 'Go to Pickup' : 'Deliver Order';
  const stageSubtitle =
    stage === 'PICKUP'
      ? 'Driver route is currently optimized to pickup location.'
      : 'Driver route is currently optimized to drop location.';
  const hasMapboxToken = MAPBOX_TOKEN.length > 0;

  return (
    <div className="routemap-container">
      <div className="routemap-page-content">
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">
              <Navigation size={22} /> Route Map
            </h1>
            <p className="page-subtitle">Live driver routing with Mapbox directions</p>
          </div>

          <div className="header-right map-stage-actions">
            <button
              className={`view-toggle ${stage === 'PICKUP' ? 'active' : ''}`}
              onClick={() => setStage('PICKUP')}
              type="button"
            >
              <Package size={14} /> Pickup Stage
            </button>
            <button
              className={`view-toggle ${stage === 'DELIVERY' ? 'active' : ''}`}
              onClick={() => setStage('DELIVERY')}
              type="button"
            >
              <Flag size={14} /> Delivery Stage
            </button>
          </div>
        </header>

        <section className="map-section enlarged">
          <div className="map-placeholder mapbox-live-map">
            {hasMapboxToken ? (
              <Map
                {...viewState}
                onMove={(evt: any) => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                reuseMaps
              >
                {origin && (
                  <Marker longitude={origin.lng} latitude={origin.lat} anchor="bottom">
                    <span className="map-emoji-marker" title="Current Location">
                      {'\u{1F4CD}'}
                    </span>
                  </Marker>
                )}

                {pickupLocation && (
                  <Marker longitude={pickupLocation.lng} latitude={pickupLocation.lat} anchor="bottom">
                    <span className="map-emoji-marker" title="Pickup">
                      {'\u{1F4E6}'}
                    </span>
                  </Marker>
                )}

                {dropLocation && (
                  <Marker longitude={dropLocation.lng} latitude={dropLocation.lat} anchor="bottom">
                    <span className="map-emoji-marker" title="Drop">
                      {'\u{1F3C1}'}
                    </span>
                  </Marker>
                )}

                {routeFeature && (
                  <Source id="route" type="geojson" data={routeFeature}>
                    <Layer {...routeLineLayer} />
                  </Source>
                )}
              </Map>
            ) : null}

            <div className="mapbox-stage-overlay">
              <h3 className="mapbox-stage-title">{stageTitle}</h3>
              {activeTask?.title && <p className="mapbox-stage-subtitle">Order: {activeTask.title}</p>}
              <p className="mapbox-stage-subtitle">{stageSubtitle}</p>
              {isRouteLoading && <p className="mapbox-stage-subtitle">Updating route...</p>}
              {driverLocation && <p className="mapbox-stage-subtitle">Using your current location</p>}
              {routeDistanceKm !== null && (
                <p className="mapbox-stage-subtitle">Distance to destination: {routeDistanceKm.toFixed(2)} km</p>
              )}
              {straightDistanceKm !== null && !withinServiceRange && (
                <p className="mapbox-stage-subtitle">
                  Current distance from destination: {straightDistanceKm.toFixed(2)} km
                </p>
              )}
            </div>

            {routeError && (
              <div className="mapbox-route-error" role="alert">
                <AlertTriangle size={14} /> {routeError}
              </div>
            )}

            {!routeError && locationError && (
              <div className="mapbox-route-error" role="alert">
                <AlertTriangle size={14} /> {locationError}
              </div>
            )}

            {!hasMapboxToken && (
              <div className="mapbox-route-error" role="alert">
                <AlertTriangle size={14} /> Missing VITE_MAPBOX_TOKEN. Add it to your frontend environment.
              </div>
            )}
          </div>
        </section>

        <div className="route-summary">
          <div className="summary-card">
            <span className="summary-icon">
              <Truck size={16} />
            </span>
            <div className="summary-content">
              <span className="summary-value">Driver</span>
              <span className="summary-label">
                {origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : 'Live location unavailable'}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <span className="summary-icon">
              <MapPin size={16} />
            </span>
            <div className="summary-content">
              <span className="summary-value">Destination</span>
              <span className="summary-label">
                {destination
                  ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
                  : 'Destination coordinates unavailable'}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <span className="summary-icon">
              <Navigation size={16} />
            </span>
            <div className="summary-content">
              <span className="summary-value">Distance</span>
              <span className="summary-label">
                {routeDistanceKm !== null
                  ? `${routeDistanceKm.toFixed(2)} km`
                  : straightDistanceKm !== null
                    ? `${straightDistanceKm.toFixed(2)} km`
                    : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        {!activeTask && (
          <div className="no-route">
            <span className="no-route-icon">🗺️</span>
            <h3>No Accepted Delivery Yet</h3>
            <p>Accept a pickup from Available Pickups to see it on your route map.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteMap;
