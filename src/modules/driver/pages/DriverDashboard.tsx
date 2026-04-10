import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './DriverDashboard.css';
import { API_ENDPOINTS } from '../../../config/api';
import {
  Truck, MapPin, Zap, Flame, Wallet, Package, CheckCircle,
  RefreshCw, Clock, AlertTriangle, Navigation, Power, PowerOff,
  Leaf, Sprout, Wheat, Flag, ChevronRight, X, XCircle, Eye,
  Ruler, Timer, Phone, Map, FileText, MessageSquare, Check, Info,
  Brain, Activity,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  role: 'driver';
  phone?: string;
}

interface DashboardStats {
  active_deliveries: number;
  pending_pickups: number;
  completed_today: number;
  earnings_today: number;
}

interface Recommendation {
  listing_id: string;
  title: string;
  quantity: string;
  distance_km: number;
  hours_remaining: number;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  pickup_address: string;
  farmer_name: string;
  score: number;
}

interface PickupTask {
  id: string;
  listing_id: string;
  title: string;
  quantity: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
  image?: string;
  priority: 'normal' | 'high' | 'urgent';
  farmer: { id: number; name: string; phone: string; address: string; landmark?: string; };
  ngo:    { id: number; name: string; organization: string; phone: string; address: string; };
  created_at: string;
  expiry_time: string;
  pickup_window_start: string;
  pickup_window_end: string;
  distance: number;
  estimated_time: string;
  earnings: number;
  notes?: string;
  special_instructions?: string;
}

interface DispatchRequest {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_type: string;
  listing_quantity: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  ngo_name: string;
  ngo_address: string;
  dest_lat: number;
  dest_lng: number;
  driver_id: string;
  distance_km: number;
  estimated_minutes: number;
  earnings: number;
  priority: 'urgent' | 'high' | 'normal';
  remaining_seconds: number;
  farmer_name: string;
  farmer_phone: string;
  hours_remaining: number;
  attempt_number: number;
}

interface Hotspot {
  message: string;
  center_lat: number;
  center_lng: number;
  pickup_count: number;
  distance_km: number;
  most_urgent_hours: number;
  urgency: 'critical' | 'high';
}

interface LngLat { lng: number; lat: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = (
  (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_MAPBOX_TOKEN || ''
).trim();

const MAX_SERVICE_DISTANCE_KM = 5;
const DRIVER_BASE_EARNINGS    = 80;
const DRIVER_KM_RATE          = 20;

const toRad = (deg: number) => (deg * Math.PI) / 180;

const getDistanceKm = (from: LngLat, to: LngLat): number => {
  const R  = 6371;
  const dL = toRad(to.lat - from.lat);
  const dN = toRad(to.lng - from.lng);
  const a  = Math.sin(dL / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dN / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const geocodeAddress = async (address: string): Promise<LngLat | null> => {
  if (!address.trim() || !MAPBOX_TOKEN) return null;
  try {
    const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&access_token=${MAPBOX_TOKEN}`);
    const data = await res.json();
    const c    = data?.features?.[0]?.center;
    if (!Array.isArray(c) || c.length < 2) return null;
    return { lng: Number(c[0]), lat: Number(c[1]) };
  } catch { return null; }
};

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  if (!MAPBOX_TOKEN) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  try {
    const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality,place&limit=1&access_token=${MAPBOX_TOKEN}`);
    const data = await res.json();
    return data?.features?.[0]?.place_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
};

const getTypeEmoji = (type: string): string => {
  const m: Record<string, string> = { Vegetable: '🥦', Fruit: '🍎', Grain: '🌾', Other: '🍱' };
  return m[type] || '📦';
};

const getTypeIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'Vegetable': return <Leaf    size={16} />;
    case 'Fruit':     return <Sprout  size={16} />;
    case 'Grain':     return <Wheat   size={16} />;
    default:          return <Package size={16} />;
  }
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getTimeUntilExpiry = (expiryStr: string) => {
  const diffMs = new Date(expiryStr).getTime() - Date.now();
  if (diffMs <= 0) return { text: 'Expired', urgent: true };
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  return { text: h < 6 ? `${h}h ${m}m left` : `${h}h left`, urgent: h < 2 };
};

// ─── Component ────────────────────────────────────────────────────────────────

const DriverDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [profileChecking, setProfileChecking] = useState(true);

  // Online / Location
  const [isOnline, setIsOnline]               = useState(false);
  const [driverLocation, setDriverLocation]   = useState<LngLat | null>(null);
  const [locationArea, setLocationArea]       = useState('');

  // Data
  const [stats, setStats]                   = useState<DashboardStats>({ active_deliveries: 0, pending_pickups: 0, completed_today: 0, earnings_today: 0 });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [pickups, setPickups]               = useState<PickupTask[]>([]);
  const [hotspots, setHotspots]             = useState<Hotspot[]>([]);

  // Loading
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [recsLoading, setRecsLoading]       = useState(false);

  // Pickup list controls
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterType, setFilterType]         = useState<'all' | 'Vegetable' | 'Fruit' | 'Grain' | 'Other'>('all');
  const [sortBy, setSortBy]                 = useState<'nearest' | 'highest_pay' | 'urgent' | 'newest'>('nearest');

  // Modals
  const [selectedPickup, setSelectedPickup]     = useState<PickupTask | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal]   = useState(false);
  const [acceptingId, setAcceptingId]           = useState<string | null>(null);

  // Dispatch
  const [incomingRequest, setIncomingRequest] = useState<DispatchRequest | null>(null);
  const [countdown, setCountdown]            = useState(30);
  const [isAccepting, setIsAccepting]        = useState(false);
  const [isDeclining, setIsDeclining]        = useState(false);
  const countdownRef                         = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef                             = useRef<HTMLAudioElement | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Fetch Stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async (userId: number) => {
    try {
      // Active deliveries
      const drRes = await fetch(`${API_ENDPOINTS.driverStats(String(userId))}`);
      if (drRes.ok) {
        const drData = await drRes.json();
        const stats  = drData.stats || drData;
        setStats({
          active_deliveries: stats.in_progress || stats.active_deliveries || 0,
          pending_pickups:   stats.pending      || stats.pending_pickups   || 0,
          completed_today:   stats.delivered    || stats.completed_today   || 0,
          earnings_today:    stats.total_earnings || stats.earnings_today  || 0,
        });
      }
    } catch { /* fail silently */ }
  }, []);

  // ── Fetch Pickups ─────────────────────────────────────────────────────────
  const fetchPickups = useCallback(async (userId: number, location: LngLat | null) => {
    try {
      const res  = await fetch(API_ENDPOINTS.availablePickups);
      if (!res.ok) { setPickups([]); return; }
      const data = await res.json();
      const raw: any[] = Array.isArray(data) ? data : data.pickups || [];

      let tasks: PickupTask[] = raw.map((p: any) => {
        const dist = Number.parseFloat(String(p.delivery_distance || p.distance || '0'));
        return {
          id:              String(p.id),
          listing_id:      String(p.id),
          title:           p.title      || 'Untitled',
          quantity:        p.claimed_by?.claim_quantity || p.quantity || 'N/A',
          type:            p.type       || 'Other',
          image:           p.image,
          priority:        p.priority   || 'normal',
          farmer: {
            id:       Number(p.farmer_id || 0),
            name:     p.farmer_name || 'Farmer',
            phone:    p.farmer_phone || '+91 00000 00000',
            address:  p.pickup_address || p.location || '',
            landmark: p.pickup_landmark,
          },
          ngo: {
            id:           Number(p.claimed_by?.ngo_id || 0),
            name:         p.claimed_by?.ngo_name || 'NGO',
            organization: p.claimed_by?.ngo_name || 'NGO',
            phone:        p.claimed_by?.ngo_phone || '+91 00000 00000',
            address:      p.claimed_by?.ngo_address || '',
          },
          created_at:          p.created_at   || new Date().toISOString(),
          expiry_time:         p.expiry_date  || p.expiry || new Date(Date.now() + 7_200_000).toISOString(),
          pickup_window_start: p.pickup_time  || '09:00',
          pickup_window_end:   p.pickup_time  || '18:00',
          distance:            Number.isFinite(dist) && dist > 0 ? dist : 2.5,
          estimated_time:      p.estimated_time || `${Math.max(10, Math.round(2.5 * 15))} mins`,
          earnings:            Number(p.earnings || Math.round(DRIVER_BASE_EARNINGS + 2.5 * DRIVER_KM_RATE)),
          notes:               p.notes,
          special_instructions: p.special_instructions,
        };
      });

      // Recalculate distance from driver location
      if (location) {
        tasks = await Promise.all(tasks.map(async (t) => {
          const coords = await geocodeAddress(t.farmer.address);
          if (!coords) return t;
          const d = Number(getDistanceKm(location, coords).toFixed(2));
          return { ...t, distance: d, estimated_time: `${Math.max(10, Math.round(d * 15))} mins`, earnings: Math.round(DRIVER_BASE_EARNINGS + d * DRIVER_KM_RATE) };
        }));
      }

      setPickups(tasks.filter(t => t.distance <= MAX_SERVICE_DISTANCE_KM));
      setStats(prev => ({ ...prev, pending_pickups: tasks.filter(t => t.distance <= MAX_SERVICE_DISTANCE_KM).length }));
    } catch { setPickups([]); }
  }, []);

  // ── Fetch Recommendations ─────────────────────────────────────────────────
  const fetchRecommendations = useCallback(async (userId: number) => {
    setRecsLoading(true);
    try {
      const res  = await fetch(API_ENDPOINTS.driverRecommendations(String(userId)));
      if (!res.ok) return;
      const data = await res.json();
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch { /* silent */ } finally {
      setRecsLoading(false);
    }
  }, []);

  // ── Fetch Hotspots ────────────────────────────────────────────────────────
  const fetchHotspots = useCallback(async (userId: number) => {
    if (!isOnline) { setHotspots([]); return; }
    try {
      const res  = await fetch(API_ENDPOINTS.dispatch.hotspots(String(userId)));
      if (!res.ok) return;
      const data = await res.json();
      setHotspots(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch { /* silent */ }
  }, [isOnline]);

  // ── Full refresh ──────────────────────────────────────────────────────────
  const doRefresh = useCallback(async (userId: number, location: LngLat | null, isManual = false) => {
    if (isManual) setRefreshing(true);
    await Promise.all([
      fetchStats(userId),
      fetchPickups(userId, location),
      fetchRecommendations(userId),
      fetchHotspots(userId),
    ]);
    setLoading(false);
    if (isManual) setRefreshing(false);
  }, [fetchStats, fetchPickups, fetchRecommendations, fetchHotspots]);

  // ── Dispatch: poll ────────────────────────────────────────────────────────
  const pollDispatch = useCallback(async () => {
    if (!user || !isOnline) return;
    try {
      const res  = await fetch(API_ENDPOINTS.dispatch.incomingRequest(String(user.id)));
      if (!res.ok) return;
      const data = await res.json();
      if (data.has_request && data.request) {
        const req = data.request as DispatchRequest;
        if (!incomingRequest || incomingRequest.id !== req.id) {
          setIncomingRequest(req);
          setCountdown(req.remaining_seconds || 30);
          try {
            if (!audioRef.current) {
              audioRef.current = new Audio('data:audio/wav;base64,UklGRlYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTIAAABkAGQAZABkAGQAZABkAGQAZABkAGQAZABkAGQAZABkAGQAZABkAGQAZABkAGQAZAA=');
            }
            audioRef.current.play().catch(() => {});
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          } catch { /* no audio permission */ }
        }
      } else {
        if (incomingRequest) setIncomingRequest(null);
      }
    } catch { /* silent */ }
  }, [user, isOnline, incomingRequest]);

  // ── Dispatch: countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!incomingRequest) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { handleDeclineDispatch(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [incomingRequest?.id]);

  // ── Dispatch: accept ──────────────────────────────────────────────────────
  const handleAcceptDispatch = async () => {
    if (!incomingRequest || !user) return;
    setIsAccepting(true);
    try {
      const res  = await fetch(API_ENDPOINTS.dispatch.acceptRequest(incomingRequest.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: String(user.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to accept');
      setIncomingRequest(null);
      showToast('Pickup accepted! Launching navigation...', 'success');
      setTimeout(() => navigate('/route-map'), 900);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept request', 'error');
    } finally { setIsAccepting(false); }
  };

  // ── Dispatch: decline ─────────────────────────────────────────────────────
  const handleDeclineDispatch = async (isTimeout = false) => {
    if (!incomingRequest || !user) return;
    setIsDeclining(true);
    try {
      await fetch(API_ENDPOINTS.dispatch.declineRequest(incomingRequest.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: String(user.id), reason: isTimeout ? 'timeout' : 'driver_declined' }),
      });
      setIncomingRequest(null);
      if (!isTimeout) showToast('Request declined. Waiting for next job...', 'warning');
    } catch { setIncomingRequest(null); } finally { setIsDeclining(false); }
  };

  // ── Geolocation watch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !user || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setDriverLocation(coords);

        // Reverse geocode area name
        const area = await reverseGeocode(coords.lat, coords.lng);
        setLocationArea(area);

        // Send location to backend
        try {
          await fetch(API_ENDPOINTS.driverLocation, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driver_id: user.id, lat: coords.lat, lng: coords.lng, timestamp: new Date().toISOString() }),
          });
        } catch { /* silent */ }
      },
      () => { /* GPS unavailable */ },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, user]);

  // ── Online / Offline toggle ───────────────────────────────────────────────
  const handleOnlineToggle = () => {
    const next = !isOnline;
    setIsOnline(next);
    localStorage.setItem('driverOnline', JSON.stringify(next));
    showToast(next ? '🟢 You are now ONLINE — accepting pickups!' : '🔴 You are now offline', next ? 'success' : 'warning');
    if (next && user) doRefresh(user.id, driverLocation);
    if (!next) { setHotspots([]); }
  };

  // ── Auth & profile check ──────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) { navigate('/'); return; }

    let parsedUser: User;
    try { parsedUser = JSON.parse(raw); } catch { navigate('/'); return; }

    if (parsedUser.role !== 'driver') { navigate('/home'); return; }

    const savedOnline = localStorage.getItem('driverOnline');
    const expiry = localStorage.getItem('driverOnlineExpiry');
    
    if (expiry) {
      if (Date.now() > parseInt(expiry, 10)) {
        localStorage.setItem('driverOnline', 'false');
        setIsOnline(false);
      } else {
        setIsOnline(savedOnline === 'true');
      }
      localStorage.removeItem('driverOnlineExpiry');
    } else if (savedOnline !== null) {
      setIsOnline(JSON.parse(savedOnline));
    }

    const checkProfile = async () => {
      try {
        const res  = await fetch(API_ENDPOINTS.driverSettings(String(parsedUser.id)));
        const data = await res.json();
        const name     = data?.name          || parsedUser.name || '';
        const phone    = data?.phone         || '';
        const vehicle  = data?.vehicle_number || '';
        const license  = data?.license_number || '';
        if (!name.trim() || !phone.trim() || !vehicle.trim() || !license.trim()) {
          showToast('Complete your profile to start accepting pickups', 'warning');
          navigate('/driver-settings', { state: { returnTo: '/available-pickups', incompleteProfile: true } });
          return;
        }
      } catch { /* allow through */ } finally { setProfileChecking(false); }
      setUser(parsedUser);
      doRefresh(parsedUser.id, null).then(() => setLoading(false));
    };

    checkProfile();
  }, [navigate]);

  // ── Dispatch poll interval ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isOnline) return;
    const id = setInterval(pollDispatch, 5_000);
    pollDispatch();
    return () => clearInterval(id);
  }, [user, isOnline, pollDispatch]);

  // ── Accept pickup (from available list) ───────────────────────────────────
  const handleAcceptPickup = async (pickupId: string) => {
    if (!isOnline) { showToast('Go online first to accept pickups', 'warning'); return; }
    if (!driverLocation) { showToast('Enable location to accept pickups within 5 km', 'warning'); return; }
    const pickup = pickups.find(p => p.id === pickupId);
    if (!pickup) return;
    if (pickup.distance > MAX_SERVICE_DISTANCE_KM) { showToast(`Only within ${MAX_SERVICE_DISTANCE_KM} km`, 'warning'); return; }

    setAcceptingId(pickupId);
    try {
      const res = await fetch(API_ENDPOINTS.acceptPickup(pickupId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: String(user?.id || ''), driver_name: user?.name || 'Driver', driver_phone: user?.phone || '' }),
      });
      if (!res.ok) throw new Error('Failed to accept pickup');
      setPickups(prev => prev.filter(p => p.id !== pickupId));
      setShowAcceptModal(false);
      setSelectedPickup(null);
      showToast('Pickup accepted! Launching navigation...', 'success');
      setTimeout(() => navigate('/route-map'), 900);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept pickup', 'error');
    } finally { setAcceptingId(null); }
  };

  // ── Accept recommendation ─────────────────────────────────────────────────
  const handleAcceptRecommendation = (rec: Recommendation) => {
    // Find in pickups list or navigate to available pickups
    const match = pickups.find(p => p.listing_id === rec.listing_id || p.id === rec.listing_id);
    if (match) {
      setSelectedPickup(match);
      setShowAcceptModal(true);
    } else {
      showToast('Navigating to available pickups...', 'success');
      navigate('/available-pickups');
    }
  };

  // ── Filter & sort pickups ─────────────────────────────────────────────────
  const filteredPickups = pickups
    .filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.farmer.name.toLowerCase().includes(q) && !p.farmer.address.toLowerCase().includes(q)) return false;
      }
      if (filterType !== 'all' && p.type !== filterType) return false;
      return p.distance <= MAX_SERVICE_DISTANCE_KM;
    })
    .sort((a, b) => {
      if (sortBy === 'nearest')      return a.distance - b.distance;
      if (sortBy === 'highest_pay')  return b.earnings - a.earnings;
      if (sortBy === 'urgent')       return ({ urgent: 0, high: 1, normal: 2 }[a.priority] ?? 2) - ({ urgent: 0, high: 1, normal: 2 }[b.priority] ?? 2);
      if (sortBy === 'newest')       return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

  // ── Priority badge color ──────────────────────────────────────────────────
  const recPriorityClass = (p: string) => p.toLowerCase();

  // ─── Early returns ────────────────────────────────────────────────────────
  if (profileChecking || loading) {
    return (
      <div className="dd-loading">
        <div className="dd-loading-spinner" />
        <p>{profileChecking ? 'Checking profile…' : 'Loading your dashboard…'}</p>
      </div>
    );
  }

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="driver-dashboard">

      {/* ══════════════════════════════════════════════════════
           HEADER
         ══════════════════════════════════════════════════════ */}
      <header className="dd-header">
        <div className="dd-greeting">
          <h1>{getGreeting()}, <span className="dd-driver-name">{user.name}</span> 🚗</h1>
          <p className="dd-date">{today}</p>
          {locationArea && isOnline && (
            <p className="dd-location-line">
              <MapPin size={14} />
              <span>{locationArea}</span>
            </p>
          )}
        </div>
        <div className="dd-header-right">
          <button
            className={`dd-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => doRefresh(user.id, driverLocation, true)}
            title="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
          <div className="dd-avatar">{user.name.charAt(0).toUpperCase()}</div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
           HERO STATUS CARD
         ══════════════════════════════════════════════════════ */}
      <div className={`dd-status-hero ${isOnline ? 'online' : 'offline'}`} onClick={handleOnlineToggle}>
        <div className="dd-status-left">
          <div className="dd-status-icon-wrap">
            {isOnline ? <Navigation size={32} color="white" /> : <PowerOff size={32} color="white" />}
          </div>
          <div className="dd-status-text">
            <h2>{isOnline ? '🟢 You\'re Online' : '🔴 You\'re Offline'}</h2>
            <p>{isOnline ? 'Ready for deliveries — accepting pickups' : 'Tap anywhere to go online and start earning'}</p>
            {isOnline && locationArea && (
              <span className="dd-live-loc">
                <MapPin size={11} /> {locationArea}
              </span>
            )}
          </div>
        </div>
        <div className="dd-status-right">
          <span className="dd-status-badge">{isOnline ? '🔴 Tap to go offline' : '🟢 Tap to go online'}</span>
          <label className="dd-hero-switch" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={isOnline} onChange={handleOnlineToggle} />
            <span className="dd-hero-slider" />
          </label>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
           STATS GRID
         ══════════════════════════════════════════════════════ */}
      <section className="dd-stats-grid">
        <div className="dd-stat-card" onClick={() => navigate('/route-map')}>
          <div className="dd-stat-icon-wrap teal"><Activity size={22} /></div>
          <div className="dd-stat-body">
            <span className="dd-stat-number">{stats.active_deliveries}</span>
            <span className="dd-stat-label">Active Deliveries</span>
          </div>
          <span className="dd-stat-badge active">Live</span>
        </div>

        <div className="dd-stat-card" onClick={() => navigate('/available-pickups')}>
          <div className="dd-stat-icon-wrap blue"><Package size={22} /></div>
          <div className="dd-stat-body">
            <span className="dd-stat-number">{pickups.length}</span>
            <span className="dd-stat-label">Pending Pickups</span>
          </div>
          <span className="dd-stat-badge info">Nearby</span>
        </div>

        <div className="dd-stat-card" onClick={() => navigate('/my-deliveries')}>
          <div className="dd-stat-icon-wrap green"><CheckCircle size={22} /></div>
          <div className="dd-stat-body">
            <span className="dd-stat-number">{stats.completed_today}</span>
            <span className="dd-stat-label">Completed Today</span>
          </div>
          <span className="dd-stat-badge success">Done</span>
        </div>

        <div className="dd-stat-card" onClick={() => navigate('/earnings')}>
          <div className="dd-stat-icon-wrap gold"><Wallet size={22} /></div>
          <div className="dd-stat-body">
            <span className="dd-stat-number">₹{stats.earnings_today}<small> today</small></span>
            <span className="dd-stat-label">Earnings</span>
          </div>
          <span className="dd-stat-badge earnings">Earned</span>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           SMART RECOMMENDATIONS
         ══════════════════════════════════════════════════════ */}
      <section className="dd-panel">
        <div className="dd-panel-header">
          <h2 className="dd-panel-title">
            <Brain size={18} /> 🚀 Smart Recommendations for You
          </h2>
          <button className="dd-panel-action" onClick={() => fetchRecommendations(user.id)}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {!isOnline ? (
          <div className="dd-offline-notice">
            <PowerOff size={32} color="#94a3b8" />
            <h4>Go online to see AI-powered recommendations</h4>
            <p>Our engine scores pickups by distance, urgency, and quantity — just for you.</p>
            <button className="dd-go-online-cta" onClick={handleOnlineToggle}>
              <Power size={18} /> Go Online
            </button>
          </div>
        ) : recsLoading ? (
          <div className="dd-offline-notice">
            <div className="dd-loading-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            <p>Analyzing nearby listings…</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="dd-empty" style={{ padding: '32px' }}>
            <div className="dd-empty-icon">🤖</div>
            <h4>No priority recommendations right now</h4>
            <p>All nearby pickups are within normal urgency range</p>
          </div>
        ) : (
          <div className="dd-recs-grid">
            {recommendations.slice(0, 6).map((rec) => {
              const pClass = recPriorityClass(rec.priority);
              const isUrgent = rec.priority === 'URGENT';
              return (
                <div key={rec.listing_id} className={`dd-rec-card ${pClass}`}>
                  <div className="dd-rec-top">
                    <span className={`dd-rec-priority-badge ${pClass}`}>
                      {isUrgent ? <Flame size={10} /> : <Zap size={10} />}
                      {rec.priority}
                    </span>
                    <span className="dd-rec-score">Score: {rec.score.toFixed(1)}</span>
                  </div>

                  <h3 className="dd-rec-title">{rec.title}</h3>
                  <p className="dd-rec-farmer">👨‍🌾 {rec.farmer_name} · {rec.pickup_address}</p>

                  <div className="dd-rec-chips">
                    <span className={`dd-rec-chip ${rec.hours_remaining < 6 ? 'danger' : ''}`}>
                      <Clock size={12} />
                      {rec.hours_remaining < 1
                        ? `${Math.round(rec.hours_remaining * 60)}m left`
                        : `${rec.hours_remaining.toFixed(1)}h left`}
                    </span>
                    <span className="dd-rec-chip info">
                      <Ruler size={12} />
                      {rec.distance_km.toFixed(1)} km away
                    </span>
                    <span className="dd-rec-chip">
                      <Package size={12} />
                      {rec.quantity}
                    </span>
                  </div>

                  <div className="dd-rec-reason">
                    <Brain size={13} style={{ flexShrink: 0, color: '#6366f1', marginTop: 1 }} />
                    <span>{rec.reason}</span>
                  </div>

                  <button
                    className={`dd-rec-accept-btn ${isUrgent ? 'urgent-btn' : ''}`}
                    onClick={() => handleAcceptRecommendation(rec)}
                  >
                    <CheckCircle size={15} />
                    Accept Job
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
           HOTSPOT FLEET INTELLIGENCE
         ══════════════════════════════════════════════════════ */}
      {isOnline && hotspots.length > 0 && (
        <section className="dd-panel">
          <div className="dd-panel-header">
            <h2 className="dd-panel-title">
              <Flame size={18} style={{ color: '#ef4444' }} /> Fleet Intelligence: High-Demand Zones
            </h2>
          </div>
          <div className="dd-hotspots-grid">
            {hotspots.map((hs, idx) => (
              <div key={idx} className={`dd-hotspot-card ${hs.urgency}`}>
                <div className="dd-hotspot-icon">
                  <MapPin size={22} />
                </div>
                <div className="dd-hotspot-body">
                  <h4 className="dd-hotspot-count">
                    {hs.pickup_count} urgent pickup{hs.pickup_count !== 1 ? 's' : ''} · {hs.distance_km.toFixed(1)} km away
                  </h4>
                  <p className="dd-hotspot-msg">{hs.message}</p>
                </div>
                <button className="dd-hotspot-nav-btn" onClick={() => navigate('/route-map')}>
                  Navigate
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
           AVAILABLE PICKUPS
         ══════════════════════════════════════════════════════ */}
      <section className="dd-panel">
        <div className="dd-panel-header">
          <h2 className="dd-panel-title">
            <Truck size={18} /> Nearby Available Pickups
          </h2>
          <button className="dd-panel-action" onClick={() => navigate('/available-pickups')}>
            View All <ChevronRight size={14} />
          </button>
        </div>

        {/* Filters */}
        <div className="dd-filters-bar">
          <div className="dd-search-wrap">
            <span className="dd-search-icon"><MapPin size={14} /></span>
            <input
              type="text"
              placeholder="Search by item, farmer, or location…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="dd-search-clear" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <select className="dd-filter-select" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
            <option value="all">All Types</option>
            <option value="Vegetable">Vegetables</option>
            <option value="Fruit">Fruits</option>
            <option value="Grain">Grains</option>
            <option value="Other">Other</option>
          </select>
          <select className="dd-filter-select" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="nearest">Nearest First</option>
            <option value="highest_pay">Highest Pay</option>
            <option value="urgent">Most Urgent</option>
            <option value="newest">Newest First</option>
          </select>
          <button className="dd-refresh-icon-btn" onClick={() => fetchPickups(user.id, driverLocation)} title="Refresh pickups">
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="dd-results-info">
          <span>Showing <strong>{filteredPickups.length}</strong> of <strong>{pickups.length}</strong> pickups within {MAX_SERVICE_DISTANCE_KM} km</span>
          {(filterType !== 'all' || searchQuery) && (
            <button className="dd-clear-filters" onClick={() => { setFilterType('all'); setSearchQuery(''); }}>Clear Filters</button>
          )}
        </div>

        {!isOnline ? (
          <div className="dd-offline-notice">
            <Truck size={36} color="#94a3b8" />
            <h4>Go online to see available pickups</h4>
            <p>Pickups will appear here once you're online</p>
          </div>
        ) : filteredPickups.length === 0 ? (
          <div className="dd-empty" style={{ padding: '36px' }}>
            <div className="dd-empty-icon">📭</div>
            <h4>{pickups.length === 0 ? 'No pickups available right now' : 'No pickups match your filters'}</h4>
            <p>{pickups.length === 0 ? 'Check back soon for new requests' : 'Try adjusting search or filters'}</p>
          </div>
        ) : (
          <div className="dd-pickups-grid">
            {filteredPickups.slice(0, 6).map(pickup => {
              const expiryInfo = getTimeUntilExpiry(pickup.expiry_time);
              return (
                <div key={pickup.id} className={`dd-pickup-card ${pickup.priority}`}>
                  {pickup.priority !== 'normal' && (
                    <span className={`dd-pickup-priority-badge ${pickup.priority}`}>
                      {pickup.priority === 'urgent' ? <><Flame size={10} /> Urgent</> : <><Zap size={10} /> High</>}
                    </span>
                  )}
                  <div className={`dd-pickup-expiry ${expiryInfo.urgent ? 'urgent' : ''}`}>
                    <Clock size={11} /> {expiryInfo.text}
                  </div>

                  <div className="dd-pickup-content">
                    <div className="dd-pickup-header">
                      <div className="dd-pickup-img-wrap">
                        {pickup.image ? <img src={pickup.image} alt={pickup.title} /> : getTypeEmoji(pickup.type)}
                      </div>
                      <div className="dd-pickup-info">
                        <h3 className="dd-pickup-title">{pickup.title}</h3>
                        <div className="dd-pickup-meta">
                          <span className="dd-pickup-meta-item"><Package size={12} /> {pickup.quantity}</span>
                          <span className="dd-pickup-meta-item"><Ruler size={12} /> {pickup.distance} km</span>
                          <span className="dd-pickup-meta-item earnings"><Wallet size={12} /> ₹{pickup.earnings}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mini route preview */}
                    <div className="dd-route-mini">
                      <div className="dd-route-point">
                        <div className="dd-route-dot pickup" />
                        <div>
                          <span className="dd-route-label">Pickup</span>
                          <span className="dd-route-name">{pickup.farmer.name}</span>
                          <span className="dd-route-addr">{pickup.farmer.address}</span>
                        </div>
                      </div>
                      <div className="dd-route-connector" />
                      <span className="dd-route-dist-badge"><Ruler size={10} /> {pickup.distance} km · {pickup.estimated_time}</span>
                      <div className="dd-route-connector" />
                      <div className="dd-route-point">
                        <div className="dd-route-dot deliver" />
                        <div>
                          <span className="dd-route-label">Deliver to</span>
                          <span className="dd-route-name">{pickup.ngo.organization}</span>
                          <span className="dd-route-addr">{pickup.ngo.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="dd-pickup-actions">
                      <button
                        className="dd-pickup-btn details"
                        onClick={() => { setSelectedPickup(pickup); setShowDetailsModal(true); }}
                      >
                        <Eye size={13} /> Details
                      </button>
                      <button
                        className="dd-pickup-btn accept"
                        onClick={() => { setSelectedPickup(pickup); setShowAcceptModal(true); }}
                        disabled={!isOnline || acceptingId === pickup.id}
                      >
                        {acceptingId === pickup.id
                          ? <><span className="dd-btn-spinner" /> Accepting…</>
                          : <><CheckCircle size={13} /> Accept Pickup</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
           DETAILS MODAL
         ══════════════════════════════════════════════════════ */}
      {showDetailsModal && selectedPickup && (
        <div className="dd-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="dd-modal" onClick={e => e.stopPropagation()}>
            <div className="dd-modal-header">
              <h2><Package size={17} /> Pickup Details</h2>
              <button className="dd-modal-close" onClick={() => setShowDetailsModal(false)}><X size={16} /></button>
            </div>
            <div className="dd-modal-body">
              {/* Item info */}
              <div className="dd-modal-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div className="dd-pickup-img-wrap" style={{ width: 52, height: 52 }}>
                    {getTypeEmoji(selectedPickup.type)}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{selectedPickup.title}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{selectedPickup.quantity} · {selectedPickup.type}</p>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#064e3b' }}>₹{selectedPickup.earnings}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>EARNINGS</div>
                  </div>
                </div>
              </div>
              {/* Trip stats */}
              <div className="dd-modal-section">
                <h4><Ruler size={13} /> Trip Overview</h4>
                <div className="dd-trip-stats">
                  <div className="dd-trip-stat"><Ruler size={16} /><span className="dd-trip-stat-val">{selectedPickup.distance} km</span><span className="dd-trip-stat-lbl">Distance</span></div>
                  <div className="dd-trip-stat"><Timer size={16} /><span className="dd-trip-stat-val">{selectedPickup.estimated_time}</span><span className="dd-trip-stat-lbl">Est. Time</span></div>
                  <div className="dd-trip-stat"><Wallet size={16} /><span className="dd-trip-stat-val">₹{selectedPickup.earnings}</span><span className="dd-trip-stat-lbl">Earnings</span></div>
                </div>
              </div>
              {/* Pickup */}
              <div className="dd-modal-section">
                <h4><MapPin size={13} /> Pickup (Farmer)</h4>
                <div className="dd-contact-row">
                  <div className="dd-contact-info">
                    <span className="dd-contact-name">{selectedPickup.farmer.name}</span>
                    <span className="dd-contact-sub">{selectedPickup.farmer.phone}</span>
                    <span className="dd-contact-sub">{selectedPickup.farmer.address}</span>
                  </div>
                  <div className="dd-contact-btns">
                    <button className="dd-contact-btn call" onClick={() => { window.location.href = `tel:${selectedPickup.farmer.phone.replace(/\s/g, '')}`; }}><Phone size={14} /></button>
                    <button className="dd-contact-btn map" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPickup.farmer.address)}`, '_blank')}><Map size={14} /></button>
                  </div>
                </div>
              </div>
              {/* Delivery */}
              <div className="dd-modal-section">
                <h4><Flag size={13} /> Deliver to (NGO)</h4>
                <div className="dd-contact-row">
                  <div className="dd-contact-info">
                    <span className="dd-contact-name">{selectedPickup.ngo.organization}</span>
                    <span className="dd-contact-sub">{selectedPickup.ngo.phone}</span>
                    <span className="dd-contact-sub">{selectedPickup.ngo.address}</span>
                  </div>
                  <div className="dd-contact-btns">
                    <button className="dd-contact-btn call" onClick={() => { window.location.href = `tel:${selectedPickup.ngo.phone.replace(/\s/g, '')}`; }}><Phone size={14} /></button>
                    <button className="dd-contact-btn map" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPickup.ngo.address)}`, '_blank')}><Map size={14} /></button>
                  </div>
                </div>
              </div>
              {/* Notes */}
              {(selectedPickup.notes || selectedPickup.special_instructions) && (
                <div className="dd-modal-section">
                  <h4><FileText size={13} /> Notes</h4>
                  {selectedPickup.notes && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                      <MessageSquare size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{selectedPickup.notes}</span>
                    </div>
                  )}
                  {selectedPickup.special_instructions && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#b45309', background: '#fffbeb', padding: '8px 12px', borderRadius: 8 }}>
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{selectedPickup.special_instructions}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="dd-modal-footer">
              <button className="dd-modal-btn secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
              <button className="dd-modal-btn primary" onClick={() => { setShowDetailsModal(false); setShowAcceptModal(true); }} disabled={!isOnline}>
                <CheckCircle size={14} /> Accept Pickup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           ACCEPT CONFIRMATION MODAL
         ══════════════════════════════════════════════════════ */}
      {showAcceptModal && selectedPickup && (
        <div className="dd-modal-overlay" onClick={() => setShowAcceptModal(false)}>
          <div className="dd-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="dd-modal-header">
              <h2><CheckCircle size={17} /> Confirm Acceptance</h2>
              <button className="dd-modal-close" onClick={() => setShowAcceptModal(false)}><X size={16} /></button>
            </div>
            <div className="dd-modal-body">
              <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '18px', marginBottom: 18 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 32 }}>{getTypeEmoji(selectedPickup.type)}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{selectedPickup.title}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{selectedPickup.quantity}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    { label: 'Distance',  value: `${selectedPickup.distance} km` },
                    { label: 'Est. Time', value: selectedPickup.estimated_time },
                    { label: 'Earnings',  value: `₹${selectedPickup.earnings}`, highlight: true },
                  ].map(r => (
                    <div key={r.label} style={{ background: 'white', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: r.highlight ? '#064e3b' : '#1a1a2e' }}>{r.value}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dd-checklist">
                <p className="dd-checklist-title">Before accepting:</p>
                <ul>
                  <li><Check size={13} /> You can reach the pickup location on time</li>
                  <li><Check size={13} /> Your vehicle can carry {selectedPickup.quantity}</li>
                  <li><Check size={13} /> You have enough fuel for the trip</li>
                </ul>
              </div>

              <div className="dd-info-box">
                <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Once accepted, you'll have 30 minutes to reach the pickup location.
              </div>
            </div>
            <div className="dd-modal-footer">
              <button className="dd-modal-btn secondary" onClick={() => setShowAcceptModal(false)}>Cancel</button>
              <button
                className="dd-modal-btn primary"
                onClick={() => handleAcceptPickup(selectedPickup.id)}
                disabled={acceptingId === selectedPickup.id}
              >
                {acceptingId === selectedPickup.id
                  ? <><span className="dd-btn-spinner" /> Accepting…</>
                  : <><CheckCircle size={14} /> Confirm &amp; Accept</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           OLA-STYLE INCOMING DISPATCH MODAL
         ══════════════════════════════════════════════════════ */}
      {incomingRequest && (
        <div className="dispatch-overlay">
          <div className="dispatch-modal">
            {/* Countdown Ring */}
            <div className="dispatch-countdown-ring">
              <svg viewBox="0 0 120 120" className="countdown-svg">
                <circle cx="60" cy="60" r="54" className="countdown-track" />
                <circle
                  cx="60" cy="60" r="54"
                  className="countdown-progress"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 54}`,
                    strokeDashoffset: `${2 * Math.PI * 54 * (1 - countdown / 30)}`,
                  }}
                />
              </svg>
              <div className="countdown-number">
                <span className="countdown-value">{countdown}</span>
                <span className="countdown-label">seconds</span>
              </div>
            </div>

            <div className="dispatch-header">
              <div className="dispatch-pulse-dot" />
              <h2 className="dispatch-title">New Pickup Request!</h2>
              {incomingRequest.priority === 'urgent' && <span className="dispatch-priority-badge urgent"><Flame size={13} /> URGENT</span>}
              {incomingRequest.priority === 'high'   && <span className="dispatch-priority-badge high"><Zap size={13} /> HIGH PRIORITY</span>}
              {incomingRequest.attempt_number > 1    && <span className="dispatch-attempt-badge">Attempt #{incomingRequest.attempt_number}</span>}
            </div>

            <div className="dispatch-stats">
              <div className="dispatch-stat">
                <Ruler size={18} />
                <span className="dispatch-stat-value">{incomingRequest.distance_km} km</span>
                <span className="dispatch-stat-label">Distance</span>
              </div>
              <div className="dispatch-stat">
                <Clock size={18} />
                <span className="dispatch-stat-value">{incomingRequest.estimated_minutes} min</span>
                <span className="dispatch-stat-label">ETA</span>
              </div>
              <div className="dispatch-stat earnings">
                <Wallet size={18} />
                <span className="dispatch-stat-value">₹{incomingRequest.earnings}</span>
                <span className="dispatch-stat-label">Earnings</span>
              </div>
            </div>

            <div className="dispatch-route">
              <div className="dispatch-route-point">
                <div className="dispatch-marker pickup"><MapPin size={15} /></div>
                <div className="dispatch-route-info">
                  <span className="dispatch-route-label">PICKUP</span>
                  <span className="dispatch-route-name">{incomingRequest.farmer_name}</span>
                  <span className="dispatch-route-addr">{incomingRequest.pickup_address}</span>
                </div>
              </div>
              <div className="dispatch-route-line">
                <span className="dispatch-dotted-line" />
                <span className="dispatch-route-crop">
                  <Package size={13} /> {incomingRequest.listing_title} · {incomingRequest.listing_quantity}
                </span>
              </div>
              <div className="dispatch-route-point">
                <div className="dispatch-marker delivery"><Flag size={15} /></div>
                <div className="dispatch-route-info">
                  <span className="dispatch-route-label">DELIVER</span>
                  <span className="dispatch-route-name">{incomingRequest.ngo_name}</span>
                  <span className="dispatch-route-addr">{incomingRequest.ngo_address || 'NGO Location'}</span>
                </div>
              </div>
            </div>

            {incomingRequest.hours_remaining <= 12 && (
              <div className="dispatch-expiry-warning">
                <AlertTriangle size={14} />
                Crop expires in <strong style={{ margin: '0 3px' }}>{Math.round(incomingRequest.hours_remaining)}h</strong> — handle with urgency
              </div>
            )}

            <div className="dispatch-actions">
              <button className="dispatch-btn decline" onClick={() => handleDeclineDispatch(false)} disabled={isDeclining || isAccepting}>
                {isDeclining ? <><span className="dd-btn-spinner" /> Declining…</> : <><XCircle size={18} /> Decline</>}
              </button>
              <button className="dispatch-btn accept" onClick={handleAcceptDispatch} disabled={isAccepting || isDeclining}>
                {isAccepting ? <><span className="dd-btn-spinner" /> Accepting…</> : <><CheckCircle size={18} /> Accept Pickup</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           TOAST
         ══════════════════════════════════════════════════════ */}
      {toast && (
        <div className={`dd-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : toast.type === 'error' ? <XCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
