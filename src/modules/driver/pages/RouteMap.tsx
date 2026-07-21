import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Navigation, Phone, CheckCircle, Package, Flag, AlertTriangle, Crosshair } from 'lucide-react';
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
    duration?: number;
  }>;
};

type DriverTask = {
  id: string;
  listing_id: string;
  title?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | string;
  pickup_address?: string;
  delivery_address?: string;
  farmer?: { phone: string; name: string };
  ngo?: { phone: string; name: string };
  farmer_phone?: string;
  farmer_name?: string;
  ngo_phone?: string;
  ngo_name?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  pickup_location?: { lat?: number; lng?: number; address?: string } | string;
  delivery_location?: { lat?: number; lng?: number; address?: string } | string;
  current_location?: { lat?: number; lng?: number };
};

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
    'line-color': '#10B981',
    'line-width': 5,
    'line-opacity': 0.8,
  },
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
} as const;

const computeDistance = (p1: LngLat, p2: LngLat) => {
  const R = 6371e3; // metres
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const deltaPhi = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};


const toNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveTaskPoint = (
  directLat?: unknown,
  directLng?: unknown,
  nested?: { lat?: unknown; lng?: unknown; coordinates?: { lat?: unknown; lng?: unknown } } | string | null
): LngLat | null => {
  const nestedObj = typeof nested === 'string' ? undefined : nested;
  const lat =
    toNumber(directLat) ??
    toNumber(nestedObj?.lat) ??
    toNumber(nestedObj?.coordinates?.lat);
  const lng =
    toNumber(directLng) ??
    toNumber(nestedObj?.lng) ??
    toNumber(nestedObj?.coordinates?.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
};

const resolveLocationAddress = (
  direct?: string,
  nested?: { address?: string } | string | null
): string => {
  const directValue = (direct || '').trim();
  if (directValue) return directValue;
  if (typeof nested === 'string') return nested.trim();
  return (nested?.address || '').trim();
};

const parseLatLngFromString = (value: string): LngLat | null => {
  const match = value.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  let lat = first;
  let lng = second;
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    lat = second;
    lng = first;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

const normalizeLatLng = (point: LngLat | null, reference?: LngLat | null): LngLat | null => {
  if (!point) return null;
  const ref = reference || DEFAULT_VIEW_CENTER;
  const swapped = { lat: point.lng, lng: point.lat };
  const refDistance = computeDistance(point, ref);
  const swapDistance = (Math.abs(swapped.lat) <= 90 && Math.abs(swapped.lng) <= 180)
    ? computeDistance(swapped, ref)
    : Number.POSITIVE_INFINITY;

  if (refDistance > 1_000_000 && swapDistance < 250_000) {
    return swapped;
  }

  if (swapDistance < refDistance * 0.2) {
    return swapped;
  }

  return point;
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
    zoom: 14,
    pitch: 45,
    bearing: 0
  });
  
  const [stage, setStage] = useState<Stage>('PICKUP');
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMins, setRouteDurationMins] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [lastRoutedLocation, setLastRoutedLocation] = useState<LngLat | null>(null);
  const [lastRoutedDestination, setLastRoutedDestination] = useState<LngLat | null>(null);
  const geocodeCache = useRef<Record<string, LngLat>>({});

  useEffect(() => {
    document.body.classList.add('routemap-active');
    document.documentElement.classList.add('routemap-active');
    return () => {
      document.body.classList.remove('routemap-active');
      document.documentElement.classList.remove('routemap-active');
    };
  }, []);

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

  const fetchActiveTask = useCallback(async () => {
    if (!driverId) return;
    try {
      const response = await fetch(API_ENDPOINTS.driverTasks(driverId));
      if (!response.ok) return;
      const data = await response.json();
      const tasks: DriverTask[] = data.tasks || [];
      const selectedTask = tasks.find((task) =>
        ['pending', 'picked_up', 'in_transit', 'assigned'].includes(task.status)
      );

      if (selectedTask) {
        setActiveTaskId(String(selectedTask.id));
        setActiveTask(selectedTask);
        setStage(['picked_up', 'in_transit'].includes(selectedTask.status) ? 'DELIVERY' : 'PICKUP');
      } else {
        setActiveTaskId(null);
        setActiveTask(null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [driverId]);

  const geocodeAddress = useCallback(async (address: string): Promise<LngLat | null> => {
    const key = address.trim();
    if (!key || !MAPBOX_TOKEN) return null;
    const cached = geocodeCache.current[key];
    if (cached) return cached;
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(key)}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      const center = data?.features?.[0]?.center;
      if (!Array.isArray(center) || center.length < 2) return null;
      const coords = { lng: Number(center[0]), lat: Number(center[1]) };
      geocodeCache.current[key] = coords;
      return coords;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetchActiveTask();
  }, [fetchActiveTask]);

  useEffect(() => {
    if (!activeTask) return;
    const resolveStops = async () => {
      const pickupFromTask = resolveTaskPoint(activeTask.pickup_lat, activeTask.pickup_lng, activeTask.pickup_location);
      const dropFromTask = resolveTaskPoint(activeTask.delivery_lat, activeTask.delivery_lng, activeTask.delivery_location);

      let pickupAddress = resolveLocationAddress(activeTask.pickup_address, activeTask.pickup_location);
      let dropAddress = resolveLocationAddress(activeTask.delivery_address, activeTask.delivery_location);

      let resolvedPickup = pickupFromTask;
      let resolvedDrop = dropFromTask;
      
      if ((!resolvedPickup || !resolvedDrop || !pickupAddress || !dropAddress) && activeTask.listing_id) {
        try {
          const trackingRes = await fetch(API_ENDPOINTS.listingTracking(String(activeTask.listing_id)));
          if (trackingRes.ok) {
            const trData = await trackingRes.json();
            const listing = trData?.listing || {};
            const claimedBy = listing?.claimed_by || {};
            if (!resolvedPickup) {
              resolvedPickup = resolveTaskPoint(
                listing.pickup_lat ?? listing.latitude ?? listing.coordinates?.lat,
                listing.pickup_lng ?? listing.longitude ?? listing.coordinates?.lng,
                listing.location ?? listing.coordinates
              );
            }
            if (!resolvedDrop) {
              resolvedDrop = resolveTaskPoint(
                listing.delivery_lat ?? claimedBy.location?.lat ?? claimedBy.gps_lat,
                listing.delivery_lng ?? claimedBy.location?.lng ?? claimedBy.gps_lng,
                claimedBy.location ?? claimedBy.coordinates
              );
            }

            if (!pickupAddress) {
              pickupAddress = resolveLocationAddress(listing.pickup_address || listing.pickup_location, listing.location);
            }
            if (!dropAddress) {
              dropAddress = resolveLocationAddress(listing.delivery_address || claimedBy.ngo_address, claimedBy.location);
            }
          }
        } catch (e) {}
      }

      if (!resolvedPickup && pickupAddress) {
        resolvedPickup = parseLatLngFromString(pickupAddress) || await geocodeAddress(pickupAddress);
      }
      if (!resolvedDrop && dropAddress) {
        resolvedDrop = parseLatLngFromString(dropAddress) || await geocodeAddress(dropAddress);
      }

      setPickupLocation(normalizeLatLng(resolvedPickup || null, driverLocation));
      setDropLocation(normalizeLatLng(resolvedDrop || null, driverLocation));
    };
    resolveStops();
  }, [activeTask, driverLocation, geocodeAddress]);

  useEffect(() => {
    if (!driverLocation) return;
    setPickupLocation((prev) => normalizeLatLng(prev, driverLocation));
    setDropLocation((prev) => normalizeLatLng(prev, driverLocation));
  }, [driverLocation]);

  // LIVE GEOLOCATION TRACKING (ZOMATO STYLE)
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const currentLocation: LngLat = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };
        const heading = Number.isFinite(position.coords.heading) ? position.coords.heading : undefined;
        const speedKmh = position.coords.speed != null ? position.coords.speed * 3.6 : undefined;
        setDriverLocation(currentLocation);
        setLocationError(null);

        // Update View State to follow Driver
        setViewState((prev) => ({
          ...prev,
          longitude: currentLocation.lng,
          latitude: currentLocation.lat,
          zoom: Math.max(prev.zoom, 14),
        }));

        // Push real-time coordinates to backend
        if (driverId) {
          try {
            await fetch(API_ENDPOINTS.driverLocation, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                driver_id: driverId,
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                heading,
                speed_kmh: speedKmh,
              })
            });
          } catch (e) {}
        }

        if (activeTaskId) {
          try {
            await fetch(API_ENDPOINTS.deliveryTaskLocation(activeTaskId), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                heading,
                speed: speedKmh,
              })
            });
          } catch (e) {}
        }
      },
      () => {
        setLocationError('Location permission denied. Navigate to settings to enable GPS.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, activeTaskId]);

  const origin = useMemo<LngLat | null>(
    () => driverLocation ?? resolveTaskPoint(activeTask?.current_location?.lat, activeTask?.current_location?.lng),
    [activeTask?.current_location?.lat, activeTask?.current_location?.lng, driverLocation]
  );

  const destination = useMemo<LngLat | null>(
    () => (stage === 'PICKUP' ? pickupLocation : dropLocation),
    [stage, pickupLocation, dropLocation]
  );

  const routeFeature = useMemo(() => {
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: routeGeometry || { type: 'LineString' as const, coordinates: [] },
    };
  }, [routeGeometry]);

  const fetchRoute = useCallback(async (currentOrigin: LngLat, currentDestination: LngLat) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const from = `${currentOrigin.lng},${currentOrigin.lat}`;
      const to = `${currentDestination.lng},${currentDestination.lat}`;
      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${from};${to}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      
      const response = await fetch(directionsUrl);
      if (!response.ok) throw new Error('API Failed');
      const data = (await response.json()) as DirectionsApiResponse;
      const firstRoute = data.routes?.[0];
      if (firstRoute?.geometry) {
        setRouteGeometry(firstRoute.geometry);
        if (firstRoute.distance) setRouteDistanceKm(firstRoute.distance / 1000);
        if (firstRoute.duration) setRouteDurationMins(Math.ceil(firstRoute.duration / 60));
        setLastRoutedLocation(currentOrigin);
        setLastRoutedDestination(currentDestination);
        return;
      }
      throw new Error('Route missing');
    } catch (e) {
      const fallbackLine: RouteGeometry = {
        type: 'LineString',
        coordinates: [
          [currentOrigin.lng, currentOrigin.lat],
          [currentDestination.lng, currentDestination.lat],
        ],
      };
      const meters = computeDistance(currentOrigin, currentDestination);
      setRouteGeometry(fallbackLine);
      setRouteDistanceKm(meters / 1000);
      setRouteDurationMins(Math.max(1, Math.round((meters / 1000 / 30) * 60)));
      setLastRoutedLocation(currentOrigin);
      setLastRoutedDestination(currentDestination);
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!origin || !destination) return;
    
    // Force re-route if destination changed (e.g. stage changed from Pickup to Delivery)
    if (lastRoutedDestination && (lastRoutedDestination.lat !== destination.lat || lastRoutedDestination.lng !== destination.lng)) {
      fetchRoute(origin, destination);
      return;
    }

    // Force re-route if moved > 50 meters 
    if (lastRoutedLocation) {
       const dist = computeDistance(origin, lastRoutedLocation);
       if (dist > 50) {
         fetchRoute(origin, destination);
       }
    } else {
       // Initial fetch
       fetchRoute(origin, destination);
    }
  }, [origin, destination, lastRoutedLocation, lastRoutedDestination, fetchRoute]);

  const handleUpdateStatus = async () => {
    if (!activeTaskId || !activeTask) return;
    setIsUpdatingStatus(true);
    const newStatus = stage === 'PICKUP' ? 'picked_up' : 'delivered';
    
    try {
      const response = await fetch(API_ENDPOINTS.deliveryTaskStatus(activeTaskId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        if (newStatus === 'picked_up') {
          setStage('DELIVERY');
          setActiveTask(prev => prev ? ({ ...prev, status: 'picked_up' }) : null);
        } else {
          navigate('/driver-dashboard'); // Or home, delivery completes
        }
      }
    } catch (e) {
      console.error('Failed to update status', e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const centerOnDriver = () => {
    if (driverLocation) {
      setViewState(prev => ({
        ...prev,
        longitude: driverLocation.lng,
        latitude: driverLocation.lat,
        zoom: 16
      }));
    }
  };

  const openDialer = (phone?: string) => {
    if (phone) window.open(`tel:${phone.replace(/\s/g, '')}`);
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="routemap-container">
        <div className="map-overlay-error">
          <AlertTriangle size={36} className="error-icon" />
          <h3>Map Missing</h3>
          <p>Please setup Mapbox Token to view Live Navigation.</p>
          <button className="btn-contact primary" onClick={() => navigate('/home')}>Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="routemap-container">
      <div className="routemap-page-content">
        
        {/* Floating Top Nav */}
        <div className="floating-header">
          <button className="back-layer-btn" onClick={() => navigate('/home')}>
            <ChevronLeft size={24} />
          </button>
          
          <div className="floating-status-pill">
            <Navigation size={16} /> 
            {activeTask ? (stage === 'PICKUP' ? 'Heading to Pickup' : 'Delivering Order') : 'No Active Delivery'}
          </div>
        </div>

        {/* Map Layer */}
        <div className="map-section fullscreen">
          <Map
            {...viewState}
            onMove={(evt: any) => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            reuseMaps
          >
            <Source id="route" type="geojson" data={routeFeature as any}>
              <Layer {...routeLineLayer} />
            </Source>

            {origin && (
              <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
                <div className="driver-marker">
                  <Navigation size={22} fill="currentColor" style={{ transform: 'rotate(45deg)' }} />
                </div>
              </Marker>
            )}

            {destination && (
              <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
                <div className="destination-marker">
                  <div className="marker-pulse"></div>
                  <div className="pin-icon" style={{ position: 'absolute', bottom: 10 }}>
                    {stage === 'PICKUP' ? <Package /> : <Flag />}
                  </div>
                </div>
              </Marker>
            )}
          </Map>
        </div>

        {locationError && !origin && (
          <div className="map-overlay-error" style={{ top: '30%' }}>
            <AlertTriangle size={32} className="error-icon" />
            <h3>GPS Required</h3>
            <p>{locationError}</p>
          </div>
        )}

        {/* Zomato-style Floating Bottom Sheet */}
        {activeTask && (
          <div className="zomato-bottom-sheet">
            <div className="recenter-btn" onClick={centerOnDriver}>
              <Crosshair size={20} />
            </div>

            <div className="sheet-header">
              <div className="eta-box">
                <span className="eta-time">{routeDurationMins !== null ? `${routeDurationMins} min` : '--'}</span>
                <span className="eta-sub">Estimated Arrival</span>
              </div>
              <div className="distance-badge">
                {routeDistanceKm !== null ? `${routeDistanceKm.toFixed(1)} km` : '--'} away
              </div>
            </div>

            <div className="sheet-content">
              <div className="location-details">
                <div className={`location-icon-wrapper ${stage === 'DELIVERY' ? 'delivery' : ''}`}>
                  {stage === 'PICKUP' ? <Package size={20} /> : <Flag size={20} />}
                </div>
                <div className="address-info">
                  <h3>{stage === 'PICKUP' ? (activeTask.farmer_name || activeTask.farmer?.name || 'Farmer') : (activeTask.ngo_name || activeTask.ngo?.name || 'NGO')}</h3>
                  <p>{stage === 'PICKUP'
                    ? (resolveLocationAddress(activeTask.pickup_address, activeTask.pickup_location) || 'Pickup location')
                    : (resolveLocationAddress(activeTask.delivery_address, activeTask.delivery_location) || 'Drop location')}
                  </p>
                </div>
              </div>

              <div className="contact-actions">
                {stage === 'PICKUP' ? (
                  <button className="btn-contact" onClick={() => openDialer(activeTask.farmer_phone || activeTask.farmer?.phone)}>
                    <Phone size={16} /> Call Sender
                  </button>
                ) : (
                  <button className="btn-contact" onClick={() => openDialer(activeTask.ngo_phone || activeTask.ngo?.phone)}>
                    <Phone size={16} /> Call NGO
                  </button>
                )}
              </div>

              <div className="swipe-action-container">
                <button 
                  className="btn-swipe-action" 
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle size={20} />
                  {stage === 'PICKUP' ? 'Confirm Pickup Received' : 'Complete Delivery'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!activeTask && (
          <div className="zomato-bottom-sheet" style={{ padding: 24, textAlign: 'center', alignItems: 'center' }}>
            <AlertTriangle size={32} color="#f59e0b" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 8px 0' }}>No Active Deliveries</h3>
            <p style={{ margin: 0, color: '#64748b' }}>Accept a pickup run to see live GPS tracking.</p>
            <button className="btn-swipe-action" onClick={() => navigate('/home')} style={{ marginTop: 24 }}>
              Go Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default RouteMap;
