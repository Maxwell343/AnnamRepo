import React, { useState, useEffect } from 'react';
import { Map, ArrowRight } from 'lucide-react';
import './DeliveryMap.css';
import { API_BASE_URL } from '../../../config/api';

interface RouteInfo {
  id: string;
  orderId: string;
  driver: string;
  pickup: string;
  dropoff: string;
  status: 'active' | 'completed' | 'delayed';
  distance: string;
  eta: string;
}

type FilterType = 'all' | 'active' | 'delayed' | 'completed';

const DeliveryMap: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/delivery-routes`);
        if (res.ok) {
          const data = await res.json();
          setRoutes(data);
        }
      } catch (err) {
        console.error('Failed to fetch delivery routes:', err);
      }
    };
    fetchRoutes();
  }, []);

  const filtered = filter === 'all' ? routes : routes.filter((r) => r.status === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Routes' },
    { key: 'active', label: 'Active' },
    { key: 'delayed', label: 'Delayed' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="delivery-map">
      <div className="delivery-map__header">
        <h1>Delivery Map</h1>
        <div className="delivery-map__controls">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`delivery-map__filter-btn ${filter === f.key ? 'delivery-map__filter-btn--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="delivery-map__container">
        <div className="delivery-map__map-area">
          <div className="delivery-map__placeholder">
            <div className="delivery-map__placeholder-icon"><Map size={24} /></div>
            <div className="delivery-map__placeholder-text">Map View</div>
            <div className="delivery-map__placeholder-sub">
              Integrate with Google Maps / Mapbox to show live routes
            </div>
          </div>
          <div className="delivery-map__legend">
            <div className="delivery-map__legend-item">
              <span className="delivery-map__legend-dot delivery-map__legend-dot--driver" /> Driver
            </div>
            <div className="delivery-map__legend-item">
              <span className="delivery-map__legend-dot delivery-map__legend-dot--pickup" /> Pickup
            </div>
            <div className="delivery-map__legend-item">
              <span className="delivery-map__legend-dot delivery-map__legend-dot--dropoff" /> Dropoff
            </div>
            <div className="delivery-map__legend-item">
              <span className="delivery-map__legend-dot delivery-map__legend-dot--delayed" /> Delayed
            </div>
          </div>
        </div>

        <div className="delivery-map__sidebar">
          <div className="delivery-map__sidebar-title">Routes ({filtered.length})</div>
          <div className="delivery-map__route-list">
            {filtered.map((route) => (
              <div
                key={route.id}
                className={`delivery-map__route-item ${selectedRoute === route.id ? 'delivery-map__route-item--selected' : ''}`}
                onClick={() => setSelectedRoute(route.id)}
              >
                <div className="delivery-map__route-order">
                  {route.orderId} — {route.driver}
                </div>
                <div className="delivery-map__route-path">
                  {route.pickup}
                  <span className="delivery-map__route-path-arrow"><ArrowRight size={14} /></span>
                  {route.dropoff}
                </div>
                <div className="delivery-map__route-meta">
                  <span>{route.distance}</span>
                  <span>ETA: {route.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
