import React, { useState } from 'react';
import './DriverPayouts.css';

interface DriverPayout {
  id: string;
  driverId: string;
  name: string;
  initials: string;
  deliveries: number;
  earnings: string;
  commission: string;
  netPayout: string;
  status: 'paid' | 'pending' | 'failed';
  paidDate: string;
  bankAccount: string;
}

const mockPayouts: DriverPayout[] = [
  { id: '1', driverId: 'DRV-101', name: 'Rakesh Patil', initials: 'RP', deliveries: 28, earnings: '₹14,200', commission: '₹1,420', netPayout: '₹12,780', status: 'paid', paidDate: '2024-01-15', bankAccount: '****6742' },
  { id: '2', driverId: 'DRV-102', name: 'Sunil More', initials: 'SM', deliveries: 22, earnings: '₹11,400', commission: '₹1,140', netPayout: '₹10,260', status: 'pending', paidDate: '—', bankAccount: '****3891' },
  { id: '3', driverId: 'DRV-103', name: 'Priya Kulkarni', initials: 'PK', deliveries: 35, earnings: '₹18,500', commission: '₹1,850', netPayout: '₹16,650', status: 'paid', paidDate: '2024-01-15', bankAccount: '****2204' },
  { id: '4', driverId: 'DRV-104', name: 'Amit Shah', initials: 'AS', deliveries: 18, earnings: '₹9,200', commission: '₹920', netPayout: '₹8,280', status: 'failed', paidDate: '—', bankAccount: '****5510' },
  { id: '5', driverId: 'DRV-105', name: 'Deepa Rao', initials: 'DR', deliveries: 31, earnings: '₹16,800', commission: '₹1,680', netPayout: '₹15,120', status: 'pending', paidDate: '—', bankAccount: '****8823' },
];

const DriverPayouts: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DriverPayout['status']>('all');

  const filtered = mockPayouts.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.driverId.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPending = mockPayouts.filter((p) => p.status === 'pending').length;
  const totalPaid = mockPayouts.filter((p) => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.netPayout.replace(/[₹,]/g, '')), 0);

  return (
    <div className="driver-payouts">
      <div className="driver-payouts__header">
        <h1>Driver Payouts</h1>
        <button className="admin-btn admin-btn--primary">Process All Pending</button>
      </div>

      <div className="driver-payouts__summary">
        <div className="payout-summary-card">
          <div className="payout-summary-card__label">Total Paid This Cycle</div>
          <div className="payout-summary-card__value">₹{totalPaid.toLocaleString()}</div>
          <div className="payout-summary-card__sub">Settlement cycle: Jan 1 – Jan 15</div>
        </div>
        <div className="payout-summary-card">
          <div className="payout-summary-card__label">Pending Payouts</div>
          <div className="payout-summary-card__value">{totalPending}</div>
          <div className="payout-summary-card__sub">Awaiting bank processing</div>
        </div>
        <div className="payout-summary-card">
          <div className="payout-summary-card__label">Active Drivers</div>
          <div className="payout-summary-card__value">{mockPayouts.length}</div>
          <div className="payout-summary-card__sub">With deliveries this cycle</div>
        </div>
      </div>

      <div className="driver-payouts__filters">
        <input
          className="driver-payouts__search"
          placeholder="Search by driver name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="driver-payouts__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | DriverPayout['status'])}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="driver-payouts__table-wrap">
        <table className="driver-payouts__table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Deliveries</th>
              <th>Gross Earnings</th>
              <th>Commission</th>
              <th>Net Payout</th>
              <th>Status</th>
              <th>Bank</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="driver-payouts__driver-info">
                    <div className="driver-payouts__avatar">{p.initials}</div>
                    <div>
                      <div className="driver-payouts__name">{p.name}</div>
                      <div className="driver-payouts__id">{p.driverId}</div>
                    </div>
                  </div>
                </td>
                <td>{p.deliveries}</td>
                <td>{p.earnings}</td>
                <td style={{ color: '#ef4444' }}>-{p.commission}</td>
                <td style={{ fontWeight: 700 }}>{p.netPayout}</td>
                <td>
                  <span className={`driver-payouts__status driver-payouts__status--${p.status}`}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.bankAccount}</td>
                <td>
                  <button
                    className="driver-payouts__action-btn"
                    disabled={p.status === 'paid'}
                  >
                    {p.status === 'failed' ? 'Retry' : p.status === 'pending' ? 'Pay Now' : 'Paid ✓'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="driver-payouts__footer">
          <span>Showing {filtered.length} of {mockPayouts.length} drivers</span>
        </div>
      </div>
    </div>
  );
};

export default DriverPayouts;
