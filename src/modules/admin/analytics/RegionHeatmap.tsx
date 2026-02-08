import React, { useState } from 'react';
import './RegionHeatmap.css';

interface Region {
  id: string;
  name: string;
  orders: number;
  revenue: string;
  farmers: number;
  drivers: number;
  heat: 'high' | 'medium' | 'low';
}

const mockRegions: Region[] = [
  { id: '1', name: 'Pune City', orders: 342, revenue: '₹4,28,000', farmers: 45, drivers: 18, heat: 'high' },
  { id: '2', name: 'Mumbai Suburbs', orders: 286, revenue: '₹3,62,000', farmers: 38, drivers: 22, heat: 'high' },
  { id: '3', name: 'Nashik', orders: 156, revenue: '₹1,94,000', farmers: 52, drivers: 12, heat: 'medium' },
  { id: '4', name: 'Kolhapur', orders: 118, revenue: '₹1,48,000', farmers: 34, drivers: 8, heat: 'medium' },
  { id: '5', name: 'Aurangabad', orders: 82, revenue: '₹98,000', farmers: 24, drivers: 6, heat: 'low' },
  { id: '6', name: 'Nagpur', orders: 64, revenue: '₹76,000', farmers: 18, drivers: 5, heat: 'low' },
];

type MetricType = 'orders' | 'revenue' | 'farmers' | 'drivers';

const RegionHeatmap: React.FC = () => {
  const [metric, setMetric] = useState<MetricType>('orders');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const selected = selectedRegion ? mockRegions.find((r) => r.id === selectedRegion) : null;

  const totalOrders = mockRegions.reduce((s, r) => s + r.orders, 0);
  const totalFarmers = mockRegions.reduce((s, r) => s + r.farmers, 0);
  const totalDrivers = mockRegions.reduce((s, r) => s + r.drivers, 0);

  return (
    <div className="region-heatmap">
      <div className="region-heatmap__header">
        <h1>Region Heatmap</h1>
        <div className="region-heatmap__controls">
          <select
            className="region-heatmap__select"
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricType)}
          >
            <option value="orders">Orders</option>
            <option value="revenue">Revenue</option>
            <option value="farmers">Farmers</option>
            <option value="drivers">Drivers</option>
          </select>
        </div>
      </div>

      <div className="region-heatmap__content">
        <div className="region-heatmap__map">
          <div className="region-heatmap__map-area">
            <div className="region-heatmap__placeholder">
              <div className="region-heatmap__placeholder-icon">🗺️</div>
              <div className="region-heatmap__placeholder-text">Interactive Heatmap</div>
              <div className="region-heatmap__placeholder-sub">
                Integrate with Mapbox GL / Leaflet for geographic heatmap visualization
              </div>
            </div>
          </div>
          <div className="region-heatmap__legend">
            <span className="region-heatmap__legend-label">Activity Level:</span>
            <div style={{ flex: 1 }}>
              <div className="region-heatmap__gradient" />
              <div className="region-heatmap__legend-range">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>

        <div className="region-heatmap__sidebar">
          <div className="region-sidebar-card">
            <div className="region-sidebar-card__title">Overview</div>
            <div className="region-summary">
              <div className="region-summary__item">
                <div className="region-summary__value">{mockRegions.length}</div>
                <div className="region-summary__label">Regions</div>
              </div>
              <div className="region-summary__item">
                <div className="region-summary__value">{totalOrders}</div>
                <div className="region-summary__label">Total Orders</div>
              </div>
              <div className="region-summary__item">
                <div className="region-summary__value">{totalFarmers}</div>
                <div className="region-summary__label">Farmers</div>
              </div>
              <div className="region-summary__item">
                <div className="region-summary__value">{totalDrivers}</div>
                <div className="region-summary__label">Drivers</div>
              </div>
            </div>
          </div>

          <div className="region-sidebar-card">
            <div className="region-sidebar-card__title">Top Regions</div>
            {mockRegions.map((region) => (
              <div
                className="region-list__item"
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                style={selectedRegion === region.id ? { background: '#ecfdf5' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={`region-list__heat region-list__heat--${region.heat}`} />
                  <span className="region-list__name">{region.name}</span>
                </div>
                <div className="region-list__stats">
                  <div className="region-list__value">
                    {metric === 'orders' && region.orders}
                    {metric === 'revenue' && region.revenue}
                    {metric === 'farmers' && region.farmers}
                    {metric === 'drivers' && region.drivers}
                  </div>
                  <div className="region-list__sub">{metric}</div>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="region-sidebar-card">
              <div className="region-sidebar-card__title">{selected.name} Details</div>
              {[
                ['Orders', String(selected.orders)],
                ['Revenue', selected.revenue],
                ['Farmers', String(selected.farmers)],
                ['Drivers', String(selected.drivers)],
                ['Activity', selected.heat.toUpperCase()],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionHeatmap;
