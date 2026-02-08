import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
  iconClass: string;
}

interface ActivityItem {
  id: string;
  icon: string;
  text: React.ReactNode;
  time: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated data load — replace with real API calls
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        setStats([
          { label: 'Total Users', value: '2,847', change: '+12%', positive: true, icon: '👥', iconClass: 'users' },
          { label: 'Active Orders', value: '156', change: '+8%', positive: true, icon: '📦', iconClass: 'orders' },
          { label: 'Revenue (MTD)', value: '₹4.2L', change: '+23%', positive: true, icon: '💰', iconClass: 'revenue' },
          { label: 'Food Saved (kg)', value: '12,450', change: '+15%', positive: true, icon: '🌍', iconClass: 'impact' },
          { label: 'Open Disputes', value: '7', change: '-3', positive: true, icon: '⚖️', iconClass: 'disputes' },
          { label: 'Active Drivers', value: '42', change: '+5', positive: true, icon: '🚗', iconClass: 'drivers' },
        ]);

        setRecentActivity([
          { id: '1', icon: '👤', text: <><strong>Ramesh Kumar</strong> registered as a new farmer</>, time: '5 min ago' },
          { id: '2', icon: '📦', text: <><strong>Order #1234</strong> marked as delivered</>, time: '12 min ago' },
          { id: '3', icon: '⚠️', text: <>Dispute raised on <strong>Order #1198</strong></>, time: '25 min ago' },
          { id: '4', icon: '✅', text: <>KYC approved for <strong>Priya Devi</strong></>, time: '1 hour ago' },
          { id: '5', icon: '🏷️', text: <>New listing <strong>"Organic Basmati"</strong> submitted for review</>, time: '2 hours ago' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="admin-dashboard">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Stat Cards */}
      <div className="admin-dashboard__stats">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <div className={`admin-stat-card__icon ${stat.iconClass}`}>
              {stat.icon}
            </div>
            <div className="admin-stat-card__content">
              <span className="admin-stat-card__label">{stat.label}</span>
              <span className="admin-stat-card__value">{stat.value}</span>
              <span className={`admin-stat-card__change ${stat.positive ? 'positive' : 'negative'}`}>
                {stat.positive ? '↑' : '↓'} {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div>
        <div className="admin-alert warning">
          ⚠️ 3 listings pending moderation for over 24 hours
        </div>
        <div className="admin-alert critical">
          🚨 2 drivers have unresolved payout failures
        </div>
      </div>

      {/* Main Content Row */}
      <div className="admin-dashboard__row">
        {/* Activity Feed */}
        <div className="admin-dashboard__card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">Recent Activity</h3>
            <button className="admin-dashboard__card-action">View All</button>
          </div>
          {recentActivity.map((activity) => (
            <div key={activity.id} className="admin-activity-item">
              <div className="admin-activity-item__icon">{activity.icon}</div>
              <div className="admin-activity-item__content">
                <div className="admin-activity-item__text">{activity.text}</div>
                <div className="admin-activity-item__time">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="admin-dashboard__card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">System Status</h3>
          </div>
          <div className="admin-alert info">
            🟢 All services operational
          </div>
          <div className="admin-alert info">
            📡 API response time: 120ms avg
          </div>
          <div className="admin-alert info">
            🗄️ Database: 87% storage used
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
