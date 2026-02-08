import React, { useState } from 'react';
import './DisputeCenter.css';

interface Dispute {
  id: string;
  disputeId: string;
  orderId: string;
  filedBy: string;
  filedByRole: string;
  against: string;
  category: string;
  subject: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'escalated' | 'closed';
  createdAt: string;
  lastUpdate: string;
}

const mockDisputes: Dispute[] = [
  { id: '1', disputeId: 'DSP-401', orderId: 'ORD-2389', filedBy: 'Ravi Sharma', filedByRole: 'Customer', against: 'Green Valley Farm', category: 'Quality', subject: 'Received rotten vegetables', priority: 'high', status: 'open', createdAt: '2 hrs ago', lastUpdate: '1 hr ago' },
  { id: '2', disputeId: 'DSP-400', orderId: 'ORD-2385', filedBy: 'Hope NGO', filedByRole: 'NGO', against: 'Rakesh Patil (Driver)', category: 'Delivery', subject: 'Late delivery — food spoiled', priority: 'critical', status: 'investigating', createdAt: '5 hrs ago', lastUpdate: '30 min ago' },
  { id: '3', disputeId: 'DSP-399', orderId: 'ORD-2370', filedBy: 'Sunrise Organics', filedByRole: 'Farmer', against: 'Platform', category: 'Payment', subject: 'Payout not received for 3 deliveries', priority: 'high', status: 'escalated', createdAt: '1 day ago', lastUpdate: '3 hrs ago' },
  { id: '4', disputeId: 'DSP-398', orderId: 'ORD-2362', filedBy: 'Amit Shah', filedByRole: 'Driver', against: 'City Food Bank', category: 'No-show', subject: 'Recipient not present at dropoff', priority: 'medium', status: 'resolved', createdAt: '2 days ago', lastUpdate: '1 day ago' },
  { id: '5', disputeId: 'DSP-395', orderId: 'ORD-2350', filedBy: 'Helping Hands NGO', filedByRole: 'NGO', against: 'Fresh Fields', category: 'Quantity', subject: 'Only 50% of ordered quantity received', priority: 'medium', status: 'closed', createdAt: '5 days ago', lastUpdate: '3 days ago' },
];

type StatusFilter = 'all' | Dispute['status'];

const DisputeCenter: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Dispute['priority']>('all');

  const filtered = mockDisputes.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.disputeId.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q) || d.filedBy.toLowerCase().includes(q);
    }
    return true;
  });

  const openCount = mockDisputes.filter((d) => d.status === 'open').length;
  const investigatingCount = mockDisputes.filter((d) => d.status === 'investigating').length;
  const resolvedCount = mockDisputes.filter((d) => d.status === 'resolved' || d.status === 'closed').length;
  const escalatedCount = mockDisputes.filter((d) => d.status === 'escalated').length;

  return (
    <div className="dispute-center">
      <div className="dispute-center__header">
        <h1>Dispute Center</h1>
        <button className="admin-btn admin-btn--secondary">Export Report</button>
      </div>

      <div className="dispute-center__stats">
        <div className="dispute-stat">
          <div className="dispute-stat__icon dispute-stat__icon--open">🔴</div>
          <div>
            <div className="dispute-stat__value">{openCount}</div>
            <div className="dispute-stat__label">Open</div>
          </div>
        </div>
        <div className="dispute-stat">
          <div className="dispute-stat__icon dispute-stat__icon--investigating">🔍</div>
          <div>
            <div className="dispute-stat__value">{investigatingCount}</div>
            <div className="dispute-stat__label">Investigating</div>
          </div>
        </div>
        <div className="dispute-stat">
          <div className="dispute-stat__icon dispute-stat__icon--resolved">✅</div>
          <div>
            <div className="dispute-stat__value">{resolvedCount}</div>
            <div className="dispute-stat__label">Resolved / Closed</div>
          </div>
        </div>
        <div className="dispute-stat">
          <div className="dispute-stat__icon dispute-stat__icon--escalated">⚠️</div>
          <div>
            <div className="dispute-stat__value">{escalatedCount}</div>
            <div className="dispute-stat__label">Escalated</div>
          </div>
        </div>
      </div>

      <div className="dispute-center__filters">
        <input
          className="dispute-center__search"
          placeholder="Search by dispute ID, subject or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="dispute-center__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
        </select>
        <select
          className="dispute-center__select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | Dispute['priority'])}
        >
          <option value="all">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="dispute-center__table-wrap">
        <table className="dispute-center__table">
          <thead>
            <tr>
              <th>Dispute</th>
              <th>Order</th>
              <th>Filed By</th>
              <th>Against</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td><span className="dispute-center__dispute-id">{d.disputeId}</span></td>
                <td style={{ fontSize: 12 }}>{d.orderId}</td>
                <td>
                  {d.filedBy}
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{d.filedByRole}</div>
                </td>
                <td>{d.against}</td>
                <td><span className="dispute-center__category">{d.category}</span></td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.subject}
                </td>
                <td>
                  <span className={`dispute-center__priority dispute-center__priority--${d.priority}`}>
                    {d.priority.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`dispute-center__status dispute-center__status--${d.status}`}>
                    {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </span>
                </td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{d.lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="dispute-center__footer">
          <span>Showing {filtered.length} of {mockDisputes.length} disputes</span>
        </div>
      </div>
    </div>
  );
};

export default DisputeCenter;
