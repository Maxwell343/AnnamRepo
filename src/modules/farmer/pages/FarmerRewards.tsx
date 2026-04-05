import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../../config/api';
import type { FarmerRewards as FarmerRewardsType, ImpactStats } from '../../../types/marketplace';
import { Trophy, TrendingUp, Heart, Leaf, ArrowLeft, Loader, Gift } from 'lucide-react';
import './FarmerRewards.css';

const FarmerRewards: React.FC = () => {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<FarmerRewardsType | null>(null);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const saved = localStorage.getItem('user');
        if (!saved) {
          navigate('/auth');
          return;
        }

        const user = JSON.parse(saved);
        const farmerId = user?.id;
        const token = localStorage.getItem('token') || 'dummy-token';
        
        if (!farmerId) {
          navigate('/auth');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [rewardsRes, impactRes] = await Promise.all([
          fetch(API_ENDPOINTS.rewards.farmer(farmerId), { headers }),
          fetch(API_ENDPOINTS.impact.stats, { headers })
        ]);

        if (rewardsRes.ok) setRewards(await rewardsRes.json());
        if (impactRes.ok) setImpactStats(await impactRes.json());
      } catch (err) {
        console.error('Error fetching rewards data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="fr-loading">
        <Loader className="fr-spinner" size={48} />
        <p>Loading your impact...</p>
      </div>
    );
  }

  return (
    <div className="fr-container">
      <header className="fr-header">
        <button className="fr-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>Impact & Rewards</h1>
      </header>

      {/* HERO SECTION */}
      <section className="fr-hero">
        <div className="fr-points-card">
          <div className="fr-points-header">
            <Trophy size={32} className="fr-trophy-icon" />
            <h2>Total Impact Points</h2>
          </div>
          <div className="fr-points-value">
            {rewards?.totalPoints?.toLocaleString() || 0}
          </div>
          <p className="fr-points-subtitle">You are ranked #{rewards?.leaderboardRank || '?'} globally!</p>
        </div>

        <div className="fr-impact-stats">
          <div className="fr-stat-box">
            <Leaf className="fr-stat-icon green" />
            <div className="fr-stat-details">
              <h3>{impactStats?.foodSavedKg?.toLocaleString() || 0} kg</h3>
              <p>Food Rescued Platform-Wide</p>
            </div>
          </div>
          <div className="fr-stat-box">
            <Heart className="fr-stat-icon red" />
            <div className="fr-stat-details">
              <h3>{impactStats?.mealsProvided?.toLocaleString() || 0}</h3>
              <p>Meals Provided globally</p>
            </div>
          </div>
          <div className="fr-stat-box">
            <TrendingUp className="fr-stat-icon blue" />
            <div className="fr-stat-details">
              <h3>{impactStats?.co2SavedKg?.toLocaleString() || 0} kg</h3>
              <p>CO₂ Emissions Prevented</p>
            </div>
          </div>
        </div>
      </section>

      {/* BADGES SHOWCASE */}
      <section className="fr-badges-section">
        <h2>Badges & Achievements</h2>
        <div className="fr-badges-grid">
          {rewards?.allBadges?.map((badge: any, idx: number) => (
            <div key={idx} className={`fr-badge-card ${badge.earned ? 'earned' : 'locked'}`}>
              <div className="fr-badge-icon">{badge.icon}</div>
              <h4>{badge.name}</h4>
              <p>{badge.description}</p>
              
              {!badge.earned && (
                <div className="fr-progress-container">
                  <div className="fr-progress-bar">
                    <div 
                      className="fr-progress-fill" 
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                  <span className="fr-progress-text">{badge.progress}%</span>
                </div>
              )}
              {badge.earned && <div className="fr-earned-tag">Achieved ✨</div>}
            </div>
          ))}
        </div>
      </section>

      {/* DONATION HISTORY */}
      <section className="fr-history-section">
        <h2>Recent Contributions</h2>
        
        {rewards?.donationHistory?.length === 0 ? (
          <div className="fr-empty-state">
            <Gift size={48} className="fr-empty-icon" />
            <p>No donations yet. Donate food to earn points and impact the community!</p>
          </div>
        ) : (
          <div className="fr-timeline">
            {[...(rewards?.donationHistory || [])].reverse().map((history, idx) => (
              <div key={idx} className="fr-timeline-item">
                <div className="fr-timeline-dot" />
                <div className="fr-timeline-content">
                  <div className="fr-timeline-header">
                    <h4>{history.listing_title}</h4>
                    <span className="fr-points-earned">+{history.points_earned} pts</span>
                  </div>
                  <div className="fr-timeline-meta">
                    <span>{history.quantity_kg} kg donated</span>
                    <span className="fr-dot">•</span>
                    <span>{new Date(history.timestamp).toLocaleDateString()}</span>
                    <span className="fr-dot">•</span>
                    <span className={`fr-urgency-tag ${history.urgency_status}`}>
                      {history.urgency_status === 'rescue' ? 'Rescue Mode' : 'Standard'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FarmerRewards;
