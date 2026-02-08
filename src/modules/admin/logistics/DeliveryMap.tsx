import React, { useState } from 'react';
import './DeliveryMap.css';

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

const mockRoutes: RouteInfo[] = [
  { id: '1', orderId: 'ORD-2401', driver: 'Rakesh P.', pickup: 'Green Valley Farm', dropoff: 'Hope NGO Center', status: 'active', distance: '8.2 km', eta: '12 min' },
  { id: '2', orderId: 'ORD-2402', driver: 'Sunil M.', pickup: 'Sunrise Organics', dropoff: 'City Food Bank', status: 'active', distance: '14.5 km', eta: '25 min' },
  { id: '3', orderId: 'ORD-2404', driver: 'Amit S.', pickup: 'Organic Roots', dropoff: 'Community Kitchen', status: 'delayed', distance: '6.8 km', eta: '40+ min' },
  { id: '4', orderId: 'ORD-2405', driver: 'Deepa R.', pickup: 'Harvest Hub', dropoff: '22, MG Road', status: 'active', distance: '3.1 km', eta: '8 min' },
  { id: '5', orderId: 'ORD-2398', driver: 'Priya K.', pickup: 'Fresh Fields', dropoff: 'Annapurna Shelter', status: 'completed', distance: '11.0 km', eta: '—' },
];

type FilterType = 'all' | 'active' | 'delayed' | 'completed';

const DeliveryMap: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const filtered = filter === 'all' ? mockRoutes : mockRoutes.filter((r) => r.status === filter);

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
            <div className="delivery-map__placeholder-icon">🗺️</div>
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
                  <span className="delivery-map__route-path-arrow">→</span>
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
