import React, { useState, useEffect } from 'react';
import { Truck, Package, Clock, CheckCircle, Circle } from 'lucide-react';
import './LiveOperations.css';

interface LiveOrder {
  id: string;
  orderId: string;
  pickup: string;
  dropoff: string;
  driver: string;
  status: 'pickup' | 'transit' | 'delivered' | 'delayed';
  eta: string;
}

interface DriverStatus {
  id: string;
  name: string;
  initials: string;
  status: 'online' | 'busy' | 'offline';
  currentTask: string;
}

const mockOrders: LiveOrder[] = [
  { id: '1', orderId: 'ORD-2401', pickup: 'Green Valley Farm', dropoff: 'Hope NGO Center', driver: 'Rakesh P.', status: 'transit', eta: '12 min' },
  { id: '2', orderId: 'ORD-2402', pickup: 'Sunrise Organics', dropoff: 'City Food Bank', driver: 'Sunil M.', status: 'pickup', eta: '25 min' },
  { id: '3', orderId: 'ORD-2403', pickup: 'Fresh Fields', dropoff: 'Annapurna Shelter', driver: 'Priya K.', status: 'delivered', eta: '—' },
  { id: '4', orderId: 'ORD-2404', pickup: 'Organic Roots', dropoff: 'Community Kitchen', driver: 'Amit S.', status: 'delayed', eta: '40+ min' },
  { id: '5', orderId: 'ORD-2405', pickup: 'Harvest Hub', dropoff: '22, MG Road', driver: 'Deepa R.', status: 'transit', eta: '8 min' },
];

const mockDrivers: DriverStatus[] = [
  { id: '1', name: 'Rakesh Patil', initials: 'RP', status: 'busy', currentTask: 'ORD-2401 in transit' },
  { id: '2', name: 'Sunil More', initials: 'SM', status: 'busy', currentTask: 'Heading to pickup' },
  { id: '3', name: 'Priya Kulkarni', initials: 'PK', status: 'online', currentTask: 'Available' },
  { id: '4', name: 'Amit Shah', initials: 'AS', status: 'busy', currentTask: 'Delayed – traffic' },
  { id: '5', name: 'Deepa Rao', initials: 'DR', status: 'online', currentTask: 'ORD-2405 in transit' },
  { id: '6', name: 'Kiran Jadhav', initials: 'KJ', status: 'offline', currentTask: 'Last seen 2h ago' },
];

const LiveOperations: React.FC = () => {
  const [orders] = useState<LiveOrder[]>(mockOrders);
  const [drivers] = useState<DriverStatus[]>(mockDrivers);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = orders.filter((o) => o.status === 'transit' || o.status === 'pickup').length;
  const transitCount = orders.filter((o) => o.status === 'transit').length;
  const pendingCount = orders.filter((o) => o.status === 'pickup' || o.status === 'delayed').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="live-operations">
      <div className="live-operations__header">
        <h1>Live Operations</h1>
        <div className="live-operations__live-badge">
          <span className="live-operations__live-dot" />
          LIVE — {now.toLocaleTimeString()}
        </div>
      </div>

      <div className="live-operations__stats">
        <div className="live-stat-card">
          <div className="live-stat-card__icon live-stat-card__icon--active"><Truck size={16} /></div>
          <div>
            <div className="live-stat-card__value">{activeCount}</div>
            <div className="live-stat-card__label">Active Deliveries</div>
          </div>
        </div>
        <div className="live-stat-card">
          <div className="live-stat-card__icon live-stat-card__icon--transit"><Package size={16} /></div>
          <div>
            <div className="live-stat-card__value">{transitCount}</div>
            <div className="live-stat-card__label">In Transit</div>
          </div>
        </div>
        <div className="live-stat-card">
          <div className="live-stat-card__icon live-stat-card__icon--pending"><Clock size={16} /></div>
          <div>
            <div className="live-stat-card__value">{pendingCount}</div>
            <div className="live-stat-card__label">Pending / Delayed</div>
          </div>
        </div>
        <div className="live-stat-card">
          <div className="live-stat-card__icon live-stat-card__icon--completed"><CheckCircle size={16} /></div>
          <div>
            <div className="live-stat-card__value">{deliveredCount}</div>
            <div className="live-stat-card__label">Delivered Today</div>
          </div>
        </div>
      </div>

      <div className="live-operations__content">
        <div className="live-orders">
          <div className="live-orders__title">Active Orders</div>
          <table className="live-orders__table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Pickup</th>
                <th>Dropoff</th>
                <th>Driver</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>{order.orderId}</td>
                  <td>{order.pickup}</td>
                  <td>{order.dropoff}</td>
                  <td>{order.driver}</td>
                  <td>
                    <span className={`live-orders__status live-orders__status--${order.status}`}>
                      {order.status === 'pickup' && <Circle size={12} fill="#eab308" color="#eab308" />}
                      {order.status === 'transit' && <Circle size={12} fill="#3b82f6" color="#3b82f6" />}
                      {order.status === 'delivered' && <Circle size={12} fill="#16a34a" color="#16a34a" />}
                      {order.status === 'delayed' && <Circle size={12} fill="#dc2626" color="#dc2626" />}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td>{order.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="driver-activity">
          <div className="driver-activity__title">Driver Activity</div>
          <div className="driver-activity__list">
            {drivers.map((d) => (
              <div className="driver-activity__item" key={d.id}>
                <div className="driver-activity__avatar">{d.initials}</div>
                <div className="driver-activity__info">
                  <div className="driver-activity__name">{d.name}</div>
                  <div className="driver-activity__status-text">{d.currentTask}</div>
                </div>
                <span className={`driver-activity__status-dot driver-activity__status-dot--${d.status}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveOperations;
