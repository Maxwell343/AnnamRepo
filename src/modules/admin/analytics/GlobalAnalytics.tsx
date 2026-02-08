import React, { useState } from 'react';
import './GlobalAnalytics.css';

type TimeRange = '7d' | '30d' | '90d' | '1y';

const GlobalAnalytics: React.FC = () => {
  const [range, setRange] = useState<TimeRange>('30d');

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  return (
    <div className="global-analytics">
      <div className="global-analytics__header">
        <h1>Global Analytics</h1>
        <div className="global-analytics__date-range">
          {ranges.map((r) => (
            <button
              key={r.key}
              className={`global-analytics__range-btn ${range === r.key ? 'global-analytics__range-btn--active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="global-analytics__kpis">
        {[
          { icon: '👥', value: '2,847', label: 'Total Users', change: '+12%', dir: 'up' },
          { icon: '📦', value: '1,248', label: 'Orders', change: '+18%', dir: 'up' },
          { icon: '💰', value: '₹12.4L', label: 'GMV', change: '+22%', dir: 'up' },
          { icon: '🚛', value: '892', label: 'Deliveries', change: '+15%', dir: 'up' },
          { icon: '🌿', value: '45.2T', label: 'Food Saved (kg)', change: '-3%', dir: 'down' },
        ].map((kpi) => (
          <div className="analytics-kpi" key={kpi.label}>
            <div className="analytics-kpi__icon">{kpi.icon}</div>
            <div className="analytics-kpi__value">{kpi.value}</div>
            <div className="analytics-kpi__label">{kpi.label}</div>
            <span className={`analytics-kpi__change analytics-kpi__change--${kpi.dir}`}>
              {kpi.change}
            </span>
          </div>
        ))}
      </div>

      <div className="global-analytics__charts">
        <div className="analytics-chart">
          <div className="analytics-chart__title">User Growth</div>
          <div className="analytics-chart__area">📈 User growth line chart — integrate Recharts</div>
        </div>
        <div className="analytics-chart">
          <div className="analytics-chart__title">Order Volume</div>
          <div className="analytics-chart__area">📊 Order volume bar chart — integrate Recharts</div>
        </div>
        <div className="analytics-chart">
          <div className="analytics-chart__title">Revenue by Category</div>
          <div className="analytics-chart__area">🍩 Donut chart — category breakdown</div>
        </div>
        <div className="analytics-chart">
          <div className="analytics-chart__title">Delivery Performance</div>
          <div className="analytics-chart__area">📉 On-time vs delayed delivery trend</div>
        </div>
      </div>

      <div className="global-analytics__tables">
        <div className="analytics-table">
          <div className="analytics-table__title">Top Farmers by Revenue</div>
          <table>
            <thead>
              <tr><th>#</th><th>Farmer</th><th>Revenue</th><th>Orders</th></tr>
            </thead>
            <tbody>
              {[
                { rank: 1, name: 'Green Valley Farm', revenue: '₹2,84,000', orders: 142 },
                { rank: 2, name: 'Sunrise Organics', revenue: '₹1,96,000', orders: 98 },
                { rank: 3, name: 'Fresh Fields', revenue: '₹1,52,000', orders: 76 },
                { rank: 4, name: 'Organic Roots', revenue: '₹1,18,000', orders: 59 },
                { rank: 5, name: 'Harvest Hub', revenue: '₹92,000', orders: 46 },
              ].map((f) => (
                <tr key={f.rank}>
                  <td><span className={`analytics-table__rank analytics-table__rank--${f.rank}`}>{f.rank}</span></td>
                  <td style={{ fontWeight: 500 }}>{f.name}</td>
                  <td style={{ fontWeight: 600 }}>{f.revenue}</td>
                  <td>{f.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="analytics-table">
          <div className="analytics-table__title">Top Drivers by Deliveries</div>
          <table>
            <thead>
              <tr><th>#</th><th>Driver</th><th>Deliveries</th><th>Rating</th></tr>
            </thead>
            <tbody>
              {[
                { rank: 1, name: 'Priya Kulkarni', deliveries: 182, rating: '4.9' },
                { rank: 2, name: 'Rakesh Patil', deliveries: 156, rating: '4.7' },
                { rank: 3, name: 'Deepa Rao', deliveries: 134, rating: '4.8' },
                { rank: 4, name: 'Sunil More', deliveries: 121, rating: '4.5' },
                { rank: 5, name: 'Amit Shah', deliveries: 98, rating: '4.3' },
              ].map((d) => (
                <tr key={d.rank}>
                  <td><span className={`analytics-table__rank analytics-table__rank--${d.rank}`}>{d.rank}</span></td>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td style={{ fontWeight: 600 }}>{d.deliveries}</td>
                  <td>⭐ {d.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GlobalAnalytics;
