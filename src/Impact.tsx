import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Impact.css';

const ImpactPage: React.FC = () => {
  const navigate = useNavigate();
  const [visibleLeaderboard, setVisibleLeaderboard] = useState<Set<number>>(new Set());
  const leaderboardRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get user from localStorage
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const isDriver = user?.role === 'driver';

  // Mock Farmer Stats
  const farmerStats = {
    points: 1250,
    carbonSaved: 340, // kg of CO2
    rank: 4
  };

  // Mock Driver Stats
  const driverStats = {
    deliveries: 87,
    milesRidden: 1245,
    rank: 2,
    rating: 4.9
  };

  const userStats = isDriver ? driverStats : farmerStats;

  // Mock Farmer Leaderboard
  const farmerLeaderboard = [
    { id: 1, name: 'Ramesh Farms', points: 5400, avatar: 'R' },
    { id: 2, name: 'Seva Group', points: 4200, avatar: 'S' },
    { id: 3, name: 'Green Valley', points: 3150, avatar: 'G' },
    { id: 4, name: 'You (Aditya)', points: 1250, avatar: 'A' }, // Current User
    { id: 5, name: 'Kisan Unit 4', points: 980, avatar: 'K' },
  ];

  // Mock Driver Leaderboard
  const driverLeaderboard = [
    { id: 1, name: 'Rajesh Kumar', deliveries: 234, avatar: 'R', rating: 4.9 },
    { id: 2, name: 'You (Driver Name)', deliveries: 87, avatar: 'D', rating: 4.9 }, // Current Driver
    { id: 3, name: 'Vikram Singh', deliveries: 156, avatar: 'V', rating: 4.7 },
    { id: 4, name: 'Ashok Patel', deliveries: 142, avatar: 'A', rating: 4.6 },
    { id: 5, name: 'Suresh Gupta', deliveries: 98, avatar: 'S', rating: 4.5 },
  ];

  const leaderboard = isDriver ? driverLeaderboard : farmerLeaderboard;

  // Intersection Observer for scroll-based reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const userId = parseInt(element.getAttribute('data-user-id') || '0');
            setVisibleLeaderboard((prev) => new Set([...prev, userId]));
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    leaderboardRefsMap.current?.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [leaderboard]);

  const registerLeaderboardRef = (id: number, ref: HTMLDivElement | null) => {
    if (ref) {
      leaderboardRefsMap.current.set(id, ref);
    }
  };

  return (
    <div className="impact-container">
      
      {/* 1. Header */}
      <div className="impact-header">
        <button 
          onClick={() => navigate('/dashboard')}
          style={{float:'left', background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer'}}
        >
          ← Back
        </button>
        <h1>{isDriver ? '🚚 Driver Performance' : '🌍 My Green Impact'}</h1>
        <p>{isDriver ? 'Track your delivery performance and rankings' : 'Your contribution to a hunger-free world'}</p>
      </div>

      {/* 2. Stats Cards */}
      {isDriver ? (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem'}}>
          <div className="wallet-card">
            <div>
              <span className="wallet-label">Total Deliveries</span>
              <div className="wallet-balance">
                <h2>{(userStats as any).deliveries}</h2>
              </div>
            </div>
            <div className="carbon-badge">
              <div style={{fontSize: '1.5rem', fontWeight:'bold'}}>Rank #{(userStats as any).rank}</div>
              <div style={{fontSize: '0.8rem'}}>Top Drivers</div>
            </div>
          </div>
          <div className="wallet-card">
            <div>
              <span className="wallet-label">Miles Ridden</span>
              <div className="wallet-balance">
                <h2>{(userStats as any).milesRidden}</h2>
              </div>
            </div>
            <div className="carbon-badge">
              <div style={{fontSize: '1.5rem', fontWeight:'bold'}}>{(userStats as any).rating} ⭐</div>
              <div style={{fontSize: '0.8rem'}}>Avg Rating</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="wallet-card">
          <div>
            <span className="wallet-label">Total Green Points</span>
            <div className="wallet-balance">
              <h2>{(userStats as any).points} <span style={{fontSize:'1rem'}}>GP</span></h2>
            </div>
          </div>
          <div className="carbon-badge">
            <div style={{fontSize: '1.5rem', fontWeight:'bold'}}>{(userStats as any).carbonSaved} kg</div>
            <div style={{fontSize: '0.8rem'}}>CO₂ Prevented</div>
          </div>
        </div>
      )}

      {/* 3. Achievements / Badges */}
      {!isDriver && (
        <div className="badges-grid">
          <div className="badge-card">
            <span className="badge-icon">🍲</span>
            <h3>Meal Hero</h3>
            <p>Donated over 100 meals</p>
          </div>
          <div className="badge-card">
            <span className="badge-icon">♻️</span>
            <h3>Zero Waste</h3>
            <p>3 Months without waste</p>
          </div>
          <div className="badge-card" style={{opacity: 0.5}}>
            <span className="badge-icon">🏆</span>
            <h3>Legend</h3>
            <p>Reach 5000 Points (Locked)</p>
          </div>
        </div>
      )}

      {/* Driver Badges */}
      {isDriver && (
        <div className="badges-grid">
          <div className="badge-card">
            <span className="badge-icon">🚚</span>
            <h3>Delivery Master</h3>
            <p>Completed 100 deliveries</p>
          </div>
          <div className="badge-card">
            <span className="badge-icon">⭐</span>
            <h3>5-Star Driver</h3>
            <p>Maintained 4.5+ rating</p>
          </div>
          <div className="badge-card" style={{opacity: 0.5}}>
            <span className="badge-icon">🏆</span>
            <h3>Elite Driver</h3>
            <p>250+ Deliveries (Locked)</p>
          </div>
        </div>
      )}

      {/* 4. Leaderboard */}
      <div className="leaderboard-section">
        <h2 className="lb-title">{isDriver ? 'Top Drivers Leaderboard' : 'Top Sustainability Heroes'}</h2>
        
        {leaderboard.map((user, index) => (
          <div 
            key={user.id} 
            className={`lb-row ${user.name.includes('You') ? 'active-user' : ''}`}
            ref={(ref) => registerLeaderboardRef(user.id, ref)}
            data-user-id={user.id}
            style={{
              opacity: visibleLeaderboard.has(user.id) ? 1 : 0.6,
              transform: visibleLeaderboard.has(user.id) 
                ? 'translateY(0)' 
                : 'translateY(20px)',
              transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 100}ms`,
            }}
          >
            <div className={`lb-rank rank-${index + 1}`}>{index + 1}</div>
            <div className="lb-user">
              <div className="lb-avatar">{user.avatar}</div>
              <span>{user.name}</span>
            </div>
            {isDriver ? (
              <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '0.8rem', color: '#666'}}>Deliveries</div>
                  <div className="lb-points">{(user as any).deliveries}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '0.8rem', color: '#666'}}>Rating</div>
                  <div className="lb-points">{(user as any).rating} ⭐</div>
                </div>
              </div>
            ) : (
              <div className="lb-points">{(user as any).points} GP</div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default ImpactPage;