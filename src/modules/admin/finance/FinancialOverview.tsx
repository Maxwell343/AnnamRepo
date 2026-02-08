import React, { useState } from 'react';
import './FinancialOverview.css';

type TimeRange = '7d' | '30d' | '90d' | '1y';

const FinancialOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  return (
    <div className="financial-overview">
      <div className="financial-overview__header">
        <h1>Financial Overview</h1>
        <div className="financial-overview__date-range">
          {ranges.map((r) => (
            <button
              key={r.key}
              className={`financial-overview__date-btn ${timeRange === r.key ? 'financial-overview__date-btn--active' : ''}`}
              onClick={() => setTimeRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="financial-overview__cards">
        <div className="finance-card">
          <div className="finance-card__label">Total Revenue</div>
          <div className="finance-card__value">₹12,48,500</div>
          <span className="finance-card__trend finance-card__trend--up">↑ 12.4%</span>
        </div>
        <div className="finance-card">
          <div className="finance-card__label">Platform Commission</div>
          <div className="finance-card__value">₹1,87,275</div>
          <span className="finance-card__trend finance-card__trend--up">↑ 8.2%</span>
        </div>
        <div className="finance-card">
          <div className="finance-card__label">Driver Payouts</div>
          <div className="finance-card__value">₹3,74,550</div>
          <span className="finance-card__trend finance-card__trend--up">↑ 15.1%</span>
        </div>
        <div className="finance-card">
          <div className="finance-card__label">Pending Settlements</div>
          <div className="finance-card__value">₹86,200</div>
          <span className="finance-card__trend finance-card__trend--down">↓ 3.5%</span>
        </div>
      </div>

      <div className="financial-overview__chart">
        <div className="financial-overview__chart-title">Revenue Trend</div>
        <div className="financial-overview__chart-area">
          📊 Chart placeholder — integrate Recharts or Chart.js
        </div>
      </div>

      <div className="financial-overview__grid">
        <div className="finance-breakdown">
          <div className="finance-breakdown__title">Revenue by Category</div>
          {[
            { label: 'Vegetables', value: '₹4,82,000', pct: 38, color: 'green' },
            { label: 'Fruits', value: '₹3,12,000', pct: 25, color: 'blue' },
            { label: 'Grains & Cereals', value: '₹2,48,000', pct: 20, color: 'amber' },
            { label: 'Dairy & Others', value: '₹2,06,500', pct: 17, color: 'purple' },
          ].map((item) => (
            <div key={item.label}>
              <div className="finance-breakdown__item">
                <span className="finance-breakdown__item-label">{item.label}</span>
                <span className="finance-breakdown__item-value">{item.value}</span>
              </div>
              <div className="finance-breakdown__bar">
                <div
                  className={`finance-breakdown__bar-fill finance-breakdown__bar-fill--${item.color}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="finance-breakdown">
          <div className="finance-breakdown__title">Payment Methods</div>
          {[
            { label: 'UPI / GPay / PhonePe', value: '₹7,24,000', pct: 58, color: 'green' },
            { label: 'Debit / Credit Card', value: '₹2,87,000', pct: 23, color: 'blue' },
            { label: 'Net Banking', value: '₹1,49,500', pct: 12, color: 'amber' },
            { label: 'Cash on Delivery', value: '₹88,000', pct: 7, color: 'purple' },
          ].map((item) => (
            <div key={item.label}>
              <div className="finance-breakdown__item">
                <span className="finance-breakdown__item-label">{item.label}</span>
                <span className="finance-breakdown__item-value">{item.value}</span>
              </div>
              <div className="finance-breakdown__bar">
                <div
                  className={`finance-breakdown__bar-fill finance-breakdown__bar-fill--${item.color}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;
