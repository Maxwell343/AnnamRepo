import React, { useState } from 'react';
import './OrderControlPanel.css';

interface Order {
  id: string;
  orderId: string;
  customer: string;
  pickup: string;
  dropoff: string;
  driver: string | null;
  status: 'pending' | 'assigned' | 'in-transit' | 'delivered' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  items: number;
  total: string;
  createdAt: string;
}

const mockOrders: Order[] = [
  { id: '1', orderId: 'ORD-2401', customer: 'Hope NGO', pickup: 'Green Valley Farm', dropoff: 'Hope NGO Center', driver: 'Rakesh P.', status: 'in-transit', priority: 'high', items: 3, total: '₹2,450', createdAt: '10 min ago' },
  { id: '2', orderId: 'ORD-2402', customer: 'City Food Bank', pickup: 'Sunrise Organics', dropoff: 'City Food Bank', driver: 'Sunil M.', status: 'assigned', priority: 'medium', items: 5, total: '₹4,200', createdAt: '25 min ago' },
  { id: '3', orderId: 'ORD-2403', customer: 'Annapurna Shelter', pickup: 'Fresh Fields', dropoff: 'Annapurna Shelter', driver: 'Priya K.', status: 'delivered', priority: 'low', items: 2, total: '₹1,800', createdAt: '1 hr ago' },
  { id: '4', orderId: 'ORD-2404', customer: 'Community Kitchen', pickup: 'Organic Roots', dropoff: 'Community Kitchen', driver: null, status: 'pending', priority: 'high', items: 8, total: '₹6,500', createdAt: '5 min ago' },
  { id: '5', orderId: 'ORD-2405', customer: 'Ravi Sharma', pickup: 'Harvest Hub', dropoff: '22, MG Road', driver: 'Deepa R.', status: 'in-transit', priority: 'medium', items: 1, total: '₹350', createdAt: '15 min ago' },
  { id: '6', orderId: 'ORD-2399', customer: 'Helping Hands NGO', pickup: 'Valley Fresh', dropoff: 'HH Center, Pune', driver: null, status: 'cancelled', priority: 'low', items: 4, total: '₹3,100', createdAt: '3 hr ago' },
];

type StatusFilter = 'all' | Order['status'];

const OrderControlPanel: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Order['priority']>('all');

  const filtered = mockOrders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && o.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.orderId.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || (o.driver && o.driver.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="order-control">
      <div className="order-control__header">
        <h1>Order Control Panel</h1>
        <div className="order-control__actions">
          <button className="admin-btn admin-btn--secondary">Export CSV</button>
          <button className="admin-btn admin-btn--primary">+ Manual Order</button>
        </div>
      </div>

      <div className="order-control__filters">
        <input
          className="order-control__search"
          placeholder="Search by order ID, customer or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="order-control__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in-transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          className="order-control__select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | Order['priority'])}
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="order-control__table-wrap">
        <table className="order-control__table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Driver</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id}>
                <td>
                  <span className="order-control__order-id">{order.orderId}</span>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{order.createdAt}</div>
                </td>
                <td>{order.customer}</td>
                <td style={{ fontSize: 12 }}>
                  {order.pickup} → {order.dropoff}
                </td>
                <td>{order.driver || <span style={{ color: '#ef4444', fontWeight: 500 }}>Unassigned</span>}</td>
                <td>
                  <span className={`order-control__priority order-control__priority--${order.priority}`}>
                    {order.priority.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`order-control__status order-control__status--${order.status}`}>
                    {order.status.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{order.total}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="order-control__action-btn">View</button>
                    {order.status === 'pending' && (
                      <button className="order-control__action-btn order-control__action-btn--reassign">Assign</button>
                    )}
                    {(order.status === 'pending' || order.status === 'assigned') && (
                      <button className="order-control__action-btn order-control__action-btn--cancel">Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="order-control__pagination">
          <span>Showing {filtered.length} of {mockOrders.length} orders</span>
          <div className="order-control__pagination-buttons">
            <button className="order-control__page-btn">‹</button>
            <button className="order-control__page-btn order-control__page-btn--active">1</button>
            <button className="order-control__page-btn">›</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderControlPanel;
