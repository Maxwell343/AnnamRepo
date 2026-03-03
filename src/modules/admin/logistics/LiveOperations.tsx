import React, { useState, useEffect } from 'react';
import { Truck, Package, Clock, CheckCircle, Circle } from 'lucide-react';
import './LiveOperations.css';
import { API_BASE_URL } from '../../../config/api';

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

const LiveOperations: React.FC = () => {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [ordersRes, driversRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/live-orders`),
          fetch(`${API_BASE_URL}/api/admin/driver-statuses`)
        ]);
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (driversRes.ok) setDrivers(await driversRes.json());
      } catch (err) {
        console.error('Failed to fetch live operations data:', err);
      }
    };
    fetchLiveData();
    const dataInterval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(dataInterval);
  }, []);

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
