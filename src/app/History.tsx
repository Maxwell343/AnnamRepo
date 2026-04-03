import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './History.css';
import { API_ENDPOINTS } from '../config/api';

interface HistoryItem {
  id: number;
  item: string;
  date: string;
  org?: string;
  from?: string;
  to?: string;
  status: string;
  type: string;
}

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>('completed');
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [pendingData, setPendingData] = useState<HistoryItem[]>([]);
  const itemRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get user from localStorage
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const isDriver = user?.role === 'driver';

  // Fetch history data from API
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      try {
        if (isDriver) {
          // Fetch driver's delivery tasks
          const response = await fetch(API_ENDPOINTS.driverTasks(user.id.toString()));
          const data = await response.json();
          
          if (response.ok) {
            const tasks = data.tasks || [];
            
            // Separate completed and pending
            const completed = tasks
              .filter((t: any) => t.status === 'delivered')
              .map((t: any, index: number) => ({
                id: index + 300,
                item: `${t.listing_title || t.title} (${t.quantity || 'N/A'})`,
                date: t.delivered_at || t.created_at || 'Recently',
                from: t.pickup_location || 'Pickup',
                to: t.delivery_location || 'Delivery',
                status: 'Delivered',
                type: t.type || 'Other'
              }));
            
            const pending = tasks
              .filter((t: any) => t.status !== 'delivered')
              .map((t: any, index: number) => ({
                id: index + 400,
                item: `${t.listing_title || t.title} (${t.quantity || 'N/A'})`,
                date: t.created_at || 'Today',
                from: t.pickup_location || 'Pickup',
                to: t.delivery_location || 'In Transit',
                status: t.status === 'picked_up' ? 'In Transit' : 'Pending',
                type: t.type || 'Other'
              }));
            
            setHistoryData(completed);
            setPendingData(pending);
          }
        } else {
          // Fetch farmer listings from listing lifecycle API (driver status updates write here)
          const response = await fetch(`${API_ENDPOINTS.listings}?farmer_id=${encodeURIComponent(user.id.toString())}&include_expired=true`);
          const data = await response.json();
          
          if (response.ok) {
            const listings = data.listings || [];
            
            // Separate completed and pending
            const completed = listings
              .filter((l: any) => l.status === 'delivered')
              .map((l: any, index: number) => ({
                id: index + 100,
                item: `${l.title} (${l.quantity})`,
                date: l.delivered_at || l.created_at || 'Recently',
                org: l.claimed_by_name || 'NGO',
                status: 'Completed',
                type: l.type || 'Other'
              }));
            
            const pending = listings
              .filter((l: any) => l.status !== 'delivered' && l.status !== 'expired')
              .map((l: any, index: number) => ({
                id: index + 200,
                item: `${l.title} (${l.quantity})`,
                date: l.created_at || 'Today',
                org: l.status === 'available' ? 'Waiting for Pickup' : l.claimed_by_name || 'Claimed',
                status: l.status === 'available' ? 'Pending' : 'In Progress',
                type: l.type || 'Other'
              }));
            
            setHistoryData(completed);
            setPendingData(pending);
          }
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    };
    
    fetchHistory();
  }, [user?.id, isDriver]);

  const currentList = activeTab === 'completed' ? historyData : pendingData;

  // Intersection Observer for scroll-based reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const itemId = parseInt(element.getAttribute('data-item-id') || '0');
            setVisibleItems((prev) => new Set([...prev, itemId]));
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    itemRefsMap.current?.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [currentList]);

  const registerItemRef = (id: number, ref: HTMLDivElement | null) => {
    if (ref) {
      itemRefsMap.current.set(id, ref);
    }
  };

  const handleDownloadCertificate = (itemName: string) => {
    // In a real app, this would trigger a PDF download
    alert(`Generating Official Donation Certificate for: ${itemName}...\n\n(This serves as proof for 80G Tax Benefits)`);
  };

  return (
    <div className="history-container">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/home')}
        style={{marginBottom: '1rem', border:'none', background:'none', cursor:'pointer', fontSize:'1rem', color:'#666'}}
      >
        ← Back to Dashboard
      </button>

      <div className="history-card">
        {/* Header */}
        <div className="history-header">
          <h2>{isDriver ? '🚚 Delivery History' : '📜 Donation History'}</h2>
          <button className="btn-certificate" style={{background: '#2e7d32', color: 'white'}}>
            Export All Data
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <div 
            className={`tab-item ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            {isDriver ? 'Delivered' : 'Completed'}
          </div>
          <div 
            className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            {isDriver ? 'In Transit' : 'Pending / Active'}
          </div>
        </div>

        {/* List */}
        <div className="transaction-list">
          {currentList.length === 0 ? (
            <div style={{padding:'2rem', textAlign:'center', color:'#999'}}>No records found.</div>
          ) : (
            currentList.map((item, index) => (
              <div 
                key={item.id} 
                className="transaction-item"
                ref={(ref) => registerItemRef(item.id, ref)}
                data-item-id={item.id}
                style={{
                  opacity: visibleItems.has(item.id) ? 1 : 0.6,
                  transform: visibleItems.has(item.id) 
                    ? 'translateY(0)' 
                    : 'translateY(30px)',
                  transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 100}ms`,
                }}
              >
                <div className="t-info">
                  <div className="t-icon">
                    {item.type === 'Veg' ? '🥦' : item.type === 'Fruit' ? '🍎' : '🌾'}
                  </div>
                  <div className="t-details">
                    <h4>{item.item}</h4>
                    {isDriver ? (
                      <span className="t-date">{item.date} • From: {(item as any).from} → To: {(item as any).to}</span>
                    ) : (
                      <span className="t-date">{item.date} • {(item as any).org}</span>
                    )}
                  </div>
                </div>

                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                  {/* Status Badge */}
                  <span className={`status ${item.status === 'Completed' || item.status === 'Delivered' ? 'status-completed' : 'status-pending'}`}>
                    {item.status}
                  </span>

                  {/* Certificate Button (Only for completed farmer donations) */}
                  {!isDriver && item.status === 'Completed' && (
                    <button 
                      className="btn-certificate"
                      onClick={() => handleDownloadCertificate(item.item)}
                    >
                      <span>📄</span> Certificate
                    </button>
                  )}
                  
                  {/* Track Button (Only for pending items) */}
                  {(item.status === 'Pending' || item.status === 'In Transit') && item.id && (
                    <button 
                      className="btn-certificate"
                      onClick={() => navigate(`/order-tracking/${item.id}`)}
                      style={{borderColor: '#ff9800', color: '#f57c00'}}
                    >
                      <span>🚚</span> Track
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
