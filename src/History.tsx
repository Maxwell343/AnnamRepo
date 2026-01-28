import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './History.css';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>('completed');
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get user from localStorage
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const isDriver = user?.role === 'driver';

  // Mock Data for Farmer History
  const farmerHistoryData = [
    { id: 101, item: 'Fresh Spinach (20kg)', date: '24 Oct, 2023', org: 'Seva Kitchen', status: 'Completed', type: 'Veg' },
    { id: 102, item: 'Rice Bags (100kg)', date: '18 Oct, 2023', org: 'Hope NGO', status: 'Completed', type: 'Grain' },
    { id: 103, item: 'Bananas (50 Dozen)', date: '12 Oct, 2023', org: 'Kids Foundation', status: 'Completed', type: 'Fruit' },
  ];

  const farmerPendingData = [
    { id: 201, item: 'Tomatoes (50kg)', date: 'Today, 10:30 AM', org: 'Waiting for Pickup', status: 'Pending', type: 'Veg' },
  ];

  // Mock Data for Driver History
  const driverHistoryData = [
    { id: 301, item: 'Fresh Spinach (20kg)', date: '24 Oct, 2023', from: 'Ramesh Farms', to: 'Seva Kitchen', status: 'Delivered', type: 'Veg' },
    { id: 302, item: 'Rice Bags (100kg)', date: '18 Oct, 2023', from: 'Green Valley', to: 'Hope NGO', status: 'Delivered', type: 'Grain' },
    { id: 303, item: 'Bananas (50 Dozen)', date: '12 Oct, 2023', from: 'Kisan Unit', to: 'Kids Foundation', status: 'Delivered', type: 'Fruit' },
  ];

  const driverPendingData = [
    { id: 401, item: 'Tomatoes (50kg)', date: 'Today, 10:30 AM', from: 'Local Farm', to: 'Waiting for Delivery', status: 'In Transit', type: 'Veg' },
  ];

  const historyData = isDriver ? driverHistoryData : farmerHistoryData;
  const pendingData = isDriver ? driverPendingData : farmerPendingData;

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
                  {item.status === 'Pending' || item.status === 'In Transit' && (
                    <button 
                      className="btn-certificate"
                      onClick={() => navigate('/order-tracking')}
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