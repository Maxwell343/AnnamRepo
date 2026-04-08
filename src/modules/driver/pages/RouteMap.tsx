import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  pickup_location?: { lat?: number; lng?: number; address?: string };
  delivery_location?: { lat?: number; lng?: number; address?: string };
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
    'line-color': '#0f766e',
    'line-width': 6,
    'line-opacity': 0.8,
  },
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
} as const;

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
    zoom: 14,
    pitch: 45,
    bearing: 0
  });
  
  const [stage, setStage] = useState<Stage>('PICKUP');
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMins, setRouteDurationMins] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  useEffect(() => {
    fetchActiveTask();
  }, [fetchActiveTask]);

  useEffect(() => {
    if (!activeTask) return;
    const resolveStops = async () => {
      const pickupFromTask = resolveTaskPoint(activeTask.pickup_lat, activeTask.pickup_lng, activeTask.pickup_location);
      const dropFromTask = resolveTaskPoint(activeTask.delivery_lat, activeTask.delivery_lng, activeTask.delivery_location);
      
      let fallbackPickup: LngLat | null = null;
      let fallbackDrop: LngLat | null = null;

      if ((!pickupFromTask || !dropFromTask) && activeTask.listing_id) {
        try {
          const trackingRes = await fetch(API_ENDPOINTS.listingTracking(String(activeTask.listing_id)));
          if (trackingRes.ok) {
            const trData = await trackingRes.json();
            const listing = trData?.listing || {};
            const claimedBy = listing?.claimed_by || {};
            fallbackPickup = resolveTaskPoint(listing.pickup_lat, listing.pickup_lng, listing.location);
            fallbackDrop = resolveTaskPoint(listing.delivery_lat, listing.delivery_lng, claimedBy.location);
          }
        } catch (e) {}
      }

      setPickupLocation(pickupFromTask || fallbackPickup || null);
      setDropLocation(dropFromTask || fallbackDrop || null);
    };
    resolveStops();
  }, [activeTask]);

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
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                timestamp: new Date().toISOString()
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
  }, [driverId]);

  const origin = useMemo<LngLat | null>(
    () => driverLocation ?? resolveTaskPoint(activeTask?.current_location?.lat, activeTask?.current_location?.lng),
    [activeTask?.current_location?.lat, activeTask?.current_location?.lng, driverLocation]
  );

  const destination = useMemo<LngLat | null>(
    () => (stage === 'PICKUP' ? pickupLocation : dropLocation),
    [stage, pickupLocation, dropLocation]
  );

  const routeFeature = useMemo(() => {
    if (!routeGeometry) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: routeGeometry,
    };
  }, [routeGeometry]);

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination || !MAPBOX_TOKEN) return;
    try {
      const from = `${origin.lng},${origin.lat}`;
      const to = `${destination.lng},${destination.lat}`;
      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${from};${to}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      
      const response = await fetch(directionsUrl);
      if (!response.ok) throw new Error('API Failed');
      const data = (await response.json()) as DirectionsApiResponse;
      const firstRoute = data.routes?.[0];
      if (firstRoute?.geometry) {
        setRouteGeometry(firstRoute.geometry);
        if (firstRoute.distance) setRouteDistanceKm(firstRoute.distance / 1000);
        if (firstRoute.duration) setRouteDurationMins(Math.ceil(firstRoute.duration / 60));
      }
    } catch (e) {
      console.error(e);
    }
  }, [destination, origin]);

  useEffect(() => {
    fetchRoute();
    const interval = setInterval(fetchRoute, 15000); // Recalculate route periodically
    return () => clearInterval(interval);
  }, [fetchRoute]);

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
            {routeFeature && (
              <Source id="route" type="geojson" data={routeFeature}>
                <Layer {...routeLineLayer} />
              </Source>
            )}

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
                  <p>{stage === 'PICKUP' ? (activeTask.pickup_address || activeTask.pickup_location?.address || 'Pickup location') : (activeTask.delivery_address || activeTask.delivery_location?.address || 'Drop location')}</p>
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
