import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Globe, Star, UtensilsCrossed, Recycle, Trophy, ArrowLeft } from 'lucide-react';
import './Impact.css';
import { API_ENDPOINTS } from '../../../config/api';

interface FarmerStats {
  points: number;
  carbonSaved: number;
  rank: number;
}

interface DriverStats {
  deliveries: number;
  milesRidden: number;
  rank: number;
  rating: number;
}

interface LeaderboardEntry {
  id: number;
  name: string;
  points?: number;
  deliveries?: number;
  avatar: string;
  rating?: number;
}

const ImpactPage: React.FC = () => {
  const navigate = useNavigate();
  const [visibleLeaderboard, setVisibleLeaderboard] = useState<Set<number>>(new Set());
  const [farmerStats, setFarmerStats] = useState<FarmerStats>({
    points: 0,
    carbonSaved: 0,
    rank: 0
  });
  const [driverStats, setDriverStats] = useState<DriverStats>({
    deliveries: 0,
    milesRidden: 0,
    rank: 0,
    rating: 0
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const leaderboardRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get user from localStorage
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const isDriver = user?.role === 'driver';

  const userStats = isDriver ? driverStats : farmerStats;

  // Fetch impact data from API
  useEffect(() => {
    const fetchImpactData = async () => {
      if (!user) return;
      
      try {
        if (isDriver) {
          const response = await fetch(API_ENDPOINTS.driverAnalytics(user.id.toString()));
          const data = await response.json();
          
          if (response.ok) {
            setDriverStats({
              deliveries: data.completed_deliveries || 0,
              milesRidden: data.total_distance_km || 0,
              rank: data.rank || 0,
              rating: data.average_rating || 0
            });
            
            // Leaderboard comes from API - empty until backend provides it
            setLeaderboard(data.leaderboard || []);
          }
        } else {
          const response = await fetch(API_ENDPOINTS.farmerAnalytics(user.id.toString()));
          const data = await response.json();
          
          if (response.ok) {
            setFarmerStats({
              points: data.meals_provided_estimate || 0,
              carbonSaved: data.carbon_saved_kg || 0,
              rank: data.rank || 0
            });
            
            // Leaderboard comes from API - empty until backend provides it
            setLeaderboard(data.leaderboard || []);
          }
        }
      } catch (err) {
        console.error('Error fetching impact data:', err);
      }
    };
    
    fetchImpactData();
  }, [user?.id, isDriver]);

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
          <ArrowLeft size={16} /> Back
        </button>
        <h1>{isDriver ? <><Truck size={24} /> Driver Performance</> : <><Globe size={24} /> My Green Impact</>}</h1>
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
              <div style={{fontSize: '1.5rem', fontWeight:'bold'}}>{(userStats as any).rating} <Star size={14} /></div>
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
            <span className="badge-icon"><UtensilsCrossed size={20} /></span>
            <h3>Meal Hero</h3>
            <p>Donated over 100 meals</p>
          </div>
          <div className="badge-card">
            <span className="badge-icon"><Recycle size={20} /></span>
            <h3>Zero Waste</h3>
            <p>3 Months without waste</p>
          </div>
          <div className="badge-card" style={{opacity: 0.5}}>
            <span className="badge-icon"><Trophy size={20} /></span>
            <h3>Legend</h3>
            <p>Reach 5000 Points (Locked)</p>
          </div>
        </div>
      )}

      {/* Driver Badges */}
      {isDriver && (
        <div className="badges-grid">
          <div className="badge-card">
            <span className="badge-icon"><Truck size={20} /></span>
            <h3>Delivery Master</h3>
            <p>Completed 100 deliveries</p>
          </div>
          <div className="badge-card">
            <span className="badge-icon"><Star size={20} /></span>
            <h3>5-Star Driver</h3>
            <p>Maintained 4.5+ rating</p>
          </div>
          <div className="badge-card" style={{opacity: 0.5}}>
            <span className="badge-icon"><Trophy size={20} /></span>
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
                  <div className="lb-points">{(user as any).rating} <Star size={14} /></div>
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
