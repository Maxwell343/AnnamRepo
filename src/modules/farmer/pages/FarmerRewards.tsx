import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../../config/api';
import type { FarmerRewards as FarmerRewardsType, ImpactStats } from '../../../types/marketplace';
import { 
  Trophy, TrendingUp, Heart, Leaf, ArrowLeft, Gift, 
  RefreshCw, Search, ChevronDown, ChevronUp, X, Share2, 
  Check, Filter, Calendar, Award, Target, Sparkles
} from 'lucide-react';
import './FarmerRewards.css';

// Types
type TimeRange = '7D' | '30D' | '90D' | 'All';
type SortOption = 'newest' | 'oldest' | 'highest';
type UrgencyFilter = 'all' | 'rescue' | 'urgent' | 'standard';

interface BadgeDetails {
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: number;
  earnedDate?: string;
  nextSteps?: string;
}

const normalizeRewards = (raw: any): FarmerRewardsType => ({
  farmerId: raw?.farmer_id ?? raw?.farmerId,
  totalPoints: raw?.total_points ?? raw?.totalPoints ?? 0,
  badges: raw?.badges ?? [],
  allBadges: raw?.all_badges ?? raw?.allBadges ?? [],
  donationCount: raw?.donation_count ?? raw?.donationCount ?? 0,
  donationHistory: raw?.donation_history ?? raw?.donationHistory ?? [],
  leaderboardRank: raw?.leaderboard_rank ?? raw?.leaderboardRank ?? 0,
});

const normalizeImpactStats = (raw: any): ImpactStats => ({
  foodSavedKg: raw?.food_saved_kg ?? raw?.foodSavedKg ?? 0,
  mealsProvided: raw?.meals_provided ?? raw?.mealsProvided ?? 0,
  co2SavedKg: raw?.co2_saved_kg ?? raw?.co2SavedKg ?? 0,
  waterSavedLiters: raw?.water_saved_liters ?? raw?.waterSavedLiters,
  totalRescues: raw?.total_rescues ?? raw?.totalRescues ?? 0,
  activeRescues: raw?.active_rescues ?? raw?.activeRescues,
});

// Custom hook for animated count-up (no external libraries)
const useCountUp = (
  end: number, 
  duration: number = 1500, 
  shouldAnimate: boolean = true
): number => {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldAnimate || end === 0) {
      setCount(end);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing: ease-out-quart for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      startTimeRef.current = null;
    };
  }, [end, duration, shouldAnimate]);

  return count;
};

const FarmerRewards: React.FC = () => {
  const navigate = useNavigate();
  
  // Core data states (preserved from original)
  const [rewards, setRewards] = useState<FarmerRewardsType | null>(null);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive control states
  const [timeRange, setTimeRange] = useState<TimeRange>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // UI states
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedBadge, setSelectedBadge] = useState<BadgeDetails | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Refs
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Animated counts
  const animatedPoints = useCountUp(
    rewards?.totalPoints || 0, 
    1500, 
    hasAnimated
  );
  const animatedFoodSaved = useCountUp(
    impactStats?.foodSavedKg || 0, 
    1500, 
    hasAnimated
  );
  const animatedMeals = useCountUp(
    impactStats?.mealsProvided || 0, 
    1500, 
    hasAnimated
  );
  const animatedCO2 = useCountUp(
    impactStats?.co2SavedKg || 0, 
    1500, 
    hasAnimated
  );

  // Fetch data function (keeps original API contract)
  const fetchData = useCallback(async (showRefreshState: boolean = false) => {
    try {
      if (showRefreshState) setIsRefreshing(true);
      setError(null);
      
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

      if (!rewardsRes.ok || !impactRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const rewardsData = await rewardsRes.json();
      const impactData = await impactRes.json();
      
      setRewards(normalizeRewards(rewardsData));
      setImpactStats(normalizeImpactStats(impactData));
      
      // Trigger count-up animation after data loads
      setTimeout(() => setHasAnimated(true), 100);
      
    } catch (err) {
      console.error('Error fetching rewards data:', err);
      setError('Failed to load your rewards data. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal keyboard handling and focus trap
  useEffect(() => {
    if (!selectedBadge) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBadge(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus trap
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements && focusableElements.length > 0) {
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      firstElement.focus();

      return () => {
        document.removeEventListener('keydown', handleTab);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedBadge]);

  // Filter and sort donation history
  const getFilteredHistory = useCallback(() => {
    if (!rewards?.donationHistory) return [];
    
    let filtered = [...rewards.donationHistory];
    
    // Time range filter
    if (timeRange !== 'All') {
      const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(item => new Date(item.timestamp) >= cutoff);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.listing_title.toLowerCase().includes(query)
      );
    }
    
    // Urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(item => item.urgency_status === urgencyFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'highest':
          return b.points_earned - a.points_earned;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [rewards?.donationHistory, timeRange, searchQuery, urgencyFilter, sortBy]);

  // Toggle timeline item expansion
  const toggleExpand = (idx: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  // Share impact summary with clipboard fallback
  const shareImpact = async () => {
    const summary = `🌱 My Impact on FoodShare:\n` +
      `• ${rewards?.totalPoints?.toLocaleString() || 0} Impact Points\n` +
      `• ${impactStats?.foodSavedKg?.toLocaleString() || 0} kg Food Rescued\n` +
      `• ${impactStats?.mealsProvided?.toLocaleString() || 0} Meals Provided\n` +
      `• ${impactStats?.co2SavedKg?.toLocaleString() || 0} kg CO₂ Saved\n\n` +
      `Join me in reducing food waste! 🌍`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My FoodShare Impact',
          text: summary
        });
        setShareStatus('shared');
      } else {
        await navigator.clipboard.writeText(summary);
        setShareStatus('copied');
      }
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (err) {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(summary);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2500);
      } catch {
        console.error('Failed to share or copy');
      }
    }
  };

  // Get motivational text for badges
  const getMotivationalText = (badge: BadgeDetails): string => {
    if (badge.earned) {
      return "🎉 Amazing work! You've unlocked this achievement. Your impact is making a real difference!";
    }
    
    const remaining = 100 - badge.progress;
    if (remaining <= 20) {
      return `🔥 Almost there! Just ${remaining}% more to unlock this badge. Keep pushing!`;
    } else if (remaining <= 50) {
      return `💪 You're making great progress! Continue contributing to earn this achievement.`;
    } else {
      return `🌱 Every contribution counts. Start your journey toward this badge today!`;
    }
  };

  // Handle badge click
  const handleBadgeClick = (badge: any) => {
    setSelectedBadge({
      ...badge,
      nextSteps: getMotivationalText(badge)
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="fr-container">
        <header className="fr-header">
          <div className="fr-skeleton fr-skeleton-button" />
          <div className="fr-skeleton fr-skeleton-title" />
        </header>
        
        <section className="fr-hero">
          <div className="fr-points-card fr-skeleton-card">
            <div className="fr-skeleton fr-skeleton-icon" />
            <div className="fr-skeleton fr-skeleton-heading" />
            <div className="fr-skeleton fr-skeleton-number" />
            <div className="fr-skeleton fr-skeleton-text" />
          </div>
          
          <div className="fr-impact-stats">
            {[1, 2, 3].map(i => (
              <div key={i} className="fr-stat-box fr-skeleton-stat-box">
                <div className="fr-skeleton fr-skeleton-icon-sm" />
                <div className="fr-stat-details">
                  <div className="fr-skeleton fr-skeleton-stat" />
                  <div className="fr-skeleton fr-skeleton-text-sm" />
                </div>
              </div>
            ))}
          </div>
        </section>
        
        <section className="fr-badges-section">
          <div className="fr-skeleton fr-skeleton-section-title" />
          <div className="fr-badges-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="fr-badge-card fr-skeleton-badge">
                <div className="fr-skeleton fr-skeleton-badge-icon" />
                <div className="fr-skeleton fr-skeleton-badge-title" />
                <div className="fr-skeleton fr-skeleton-badge-desc" />
              </div>
            ))}
          </div>
        </section>
        
        <section className="fr-history-section">
          <div className="fr-skeleton fr-skeleton-section-title" />
          <div className="fr-timeline">
            {[1, 2, 3].map(i => (
              <div key={i} className="fr-timeline-item">
                <div className="fr-skeleton fr-skeleton-dot" />
                <div className="fr-timeline-content fr-skeleton-content">
                  <div className="fr-skeleton fr-skeleton-timeline-title" />
                  <div className="fr-skeleton fr-skeleton-timeline-meta" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fr-container">
        <header className="fr-header">
          <button 
            className="fr-back-btn" 
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={20} /> Back
          </button>
          <h1>Impact & Rewards</h1>
        </header>
        
        <div className="fr-error-state" role="alert">
          <div className="fr-error-icon">⚠️</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button 
            className="fr-retry-btn" 
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchData();
            }}
            aria-label="Retry loading data"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredHistory = getFilteredHistory();
  const earnedBadgesCount = rewards?.allBadges?.filter((b: any) => b.earned).length || 0;
  const totalBadgesCount = rewards?.allBadges?.length || 0;

  return (
    <div className="fr-container">
      {/* HEADER */}
      <header className="fr-header">
        <button 
          className="fr-back-btn" 
          onClick={() => navigate(-1)}
          aria-label="Go back to previous page"
        >
          <ArrowLeft size={20} /> Back
        </button>
        <h1>Impact & Rewards</h1>
        <div className="fr-header-actions">
          <button
            className={`fr-share-btn ${shareStatus !== 'idle' ? 'fr-share-success' : ''}`}
            onClick={shareImpact}
            aria-label="Share your impact summary"
            disabled={shareStatus !== 'idle'}
          >
            {shareStatus === 'copied' ? (
              <><Check size={18} /> Copied!</>
            ) : shareStatus === 'shared' ? (
              <><Check size={18} /> Shared!</>
            ) : (
              <><Share2 size={18} /> Share</>
            )}
          </button>
          <button
            className={`fr-refresh-btn ${isRefreshing ? 'fr-refreshing' : ''}`}
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            aria-label="Refresh data"
          >
            <RefreshCw size={18} className={isRefreshing ? 'fr-spin' : ''} />
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="fr-hero fr-animate-in">
        <div className="fr-points-card fr-card-interactive">
          <div className="fr-points-sparkle" aria-hidden="true">
            <Sparkles size={24} />
          </div>
          <div className="fr-points-header">
            <Trophy size={32} className="fr-trophy-icon" aria-hidden="true" />
            <h2>Total Impact Points</h2>
          </div>
          <div className="fr-points-value" aria-live="polite">
            {animatedPoints.toLocaleString()}
          </div>
          <p className="fr-points-subtitle">
            You are ranked <strong>#{rewards?.leaderboardRank || '?'}</strong> globally!
          </p>
        </div>

        <div className="fr-impact-stats">
          <div className="fr-stat-box fr-card-interactive fr-animate-in fr-delay-1">
            <Leaf className="fr-stat-icon green" aria-hidden="true" />
            <div className="fr-stat-details">
              <h3>{animatedFoodSaved.toLocaleString()} kg</h3>
              <p>Food Rescued Platform-Wide</p>
            </div>
          </div>
          <div className="fr-stat-box fr-card-interactive fr-animate-in fr-delay-2">
            <Heart className="fr-stat-icon red" aria-hidden="true" />
            <div className="fr-stat-details">
              <h3>{animatedMeals.toLocaleString()}</h3>
              <p>Meals Provided Globally</p>
            </div>
          </div>
          <div className="fr-stat-box fr-card-interactive fr-animate-in fr-delay-3">
            <TrendingUp className="fr-stat-icon blue" aria-hidden="true" />
            <div className="fr-stat-details">
              <h3>{animatedCO2.toLocaleString()} kg</h3>
              <p>CO₂ Emissions Prevented</p>
            </div>
          </div>
        </div>
      </section>

      {/* TIME RANGE CHIPS */}
      <section className="fr-controls fr-animate-in fr-delay-2">
        <div className="fr-time-chips" role="group" aria-label="Filter by time range">
          {(['7D', '30D', '90D', 'All'] as TimeRange[]).map(range => (
            <button
              key={range}
              className={`fr-chip ${timeRange === range ? 'fr-chip-active' : ''}`}
              onClick={() => setTimeRange(range)}
              aria-pressed={timeRange === range}
            >
              <Calendar size={14} aria-hidden="true" />
              {range}
            </button>
          ))}
        </div>
      </section>

      {/* BADGES SHOWCASE */}
      <section className="fr-badges-section fr-animate-in fr-delay-3" aria-labelledby="badges-heading">
        <div className="fr-section-header">
          <h2 id="badges-heading">
            <Award size={24} aria-hidden="true" /> Badges & Achievements
          </h2>
          <span className="fr-badge-count" aria-label={`${earnedBadgesCount} of ${totalBadgesCount} badges earned`}>
            {earnedBadgesCount} / {totalBadgesCount} earned
          </span>
        </div>
        
        {!rewards?.allBadges?.length ? (
          <div className="fr-empty-state">
            <Award size={48} className="fr-empty-icon" aria-hidden="true" />
            <h3>No badges available yet</h3>
            <p>Start contributing to unlock achievements!</p>
          </div>
        ) : (
          <div className="fr-badges-grid" role="list">
            {rewards?.allBadges?.map((badge: any, idx: number) => (
              <button
                key={idx}
                className={`fr-badge-card fr-card-interactive ${badge.earned ? 'earned' : 'locked'} fr-animate-in`}
                style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
                onClick={() => handleBadgeClick(badge)}
                aria-label={`${badge.name} badge. ${badge.earned ? 'Earned' : `${badge.progress}% progress`}. Click for details.`}
                role="listitem"
              >
                <div className="fr-badge-icon" aria-hidden="true">{badge.icon}</div>
                <h4>{badge.name}</h4>
                <p>{badge.description}</p>
                
                {!badge.earned && (
                  <div className="fr-progress-container">
                    <div 
                      className="fr-progress-bar" 
                      role="progressbar" 
                      aria-valuenow={badge.progress} 
                      aria-valuemin={0} 
                      aria-valuemax={100}
                      aria-label={`${badge.progress}% complete`}
                    >
                      <div 
                        className="fr-progress-fill" 
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                    <span className="fr-progress-text">{badge.progress}%</span>
                  </div>
                )}
                {badge.earned && (
                  <div className="fr-earned-tag">
                    <Sparkles size={14} aria-hidden="true" /> Achieved
                  </div>
                )}
                
                <span className="fr-badge-hover-hint" aria-hidden="true">Click for details</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* DONATION HISTORY */}
      <section className="fr-history-section fr-animate-in fr-delay-4" aria-labelledby="history-heading">
        <div className="fr-section-header">
          <h2 id="history-heading">
            <Gift size={24} aria-hidden="true" /> Recent Contributions
          </h2>
        </div>

        {/* Filters and controls */}
        <div className="fr-history-controls">
          <div className="fr-search-wrapper">
            <Search size={18} className="fr-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="fr-search-input"
              placeholder="Search contributions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search contributions"
            />
            {searchQuery && (
              <button 
                className="fr-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="fr-sort-wrapper" ref={sortDropdownRef}>
            <button
              className="fr-sort-btn"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              aria-expanded={isSortDropdownOpen}
              aria-haspopup="listbox"
              aria-label={`Sort by ${sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Highest Points'}`}
            >
              <Filter size={16} aria-hidden="true" />
              <span className="fr-sort-label">
                {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Highest'}
              </span>
              <ChevronDown size={16} className={isSortDropdownOpen ? 'fr-rotate-180' : ''} aria-hidden="true" />
            </button>
            
            {isSortDropdownOpen && (
              <div className="fr-sort-dropdown" role="listbox" aria-label="Sort options">
                {([
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'highest', label: 'Highest Points' }
                ] as { value: SortOption; label: string }[]).map(option => (
                  <button
                    key={option.value}
                    className={`fr-sort-option ${sortBy === option.value ? 'fr-sort-active' : ''}`}
                    onClick={() => {
                      setSortBy(option.value);
                      setIsSortDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={sortBy === option.value}
                  >
                    {option.label}
                    {sortBy === option.value && <Check size={16} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Urgency filter chips */}
        <div className="fr-urgency-chips" role="group" aria-label="Filter by urgency">
          {([
            { value: 'all', label: 'All', emoji: '' },
            { value: 'rescue', label: 'Rescue', emoji: '🚨' },
            { value: 'urgent', label: 'Urgent', emoji: '⚡' },
            { value: 'standard', label: 'Standard', emoji: '📦' }
          ] as { value: UrgencyFilter; label: string; emoji: string }[]).map(filter => (
            <button
              key={filter.value}
              className={`fr-chip fr-urgency-chip ${urgencyFilter === filter.value ? 'fr-chip-active' : ''}`}
              onClick={() => setUrgencyFilter(filter.value)}
              aria-pressed={urgencyFilter === filter.value}
            >
              {filter.emoji && <span aria-hidden="true">{filter.emoji}</span>}
              {filter.label}
            </button>
          ))}
        </div>
        
        {filteredHistory.length === 0 ? (
          <div className="fr-empty-state">
            <Gift size={48} className="fr-empty-icon" aria-hidden="true" />
            {rewards?.donationHistory?.length === 0 ? (
              <>
                <h3>No donations yet</h3>
                <p>Donate food to earn points and make an impact!</p>
                <button 
                  className="fr-cta-btn"
                  onClick={() => navigate('/farmer/listings/new')}
                >
                  Create Your First Listing
                </button>
              </>
            ) : (
              <>
                <h3>No matching contributions</h3>
                <p>Try adjusting your filters or search query</p>
                <button 
                  className="fr-cta-btn fr-cta-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setUrgencyFilter('all');
                    setTimeRange('All');
                  }}
                >
                  Clear All Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="fr-timeline" role="list">
            {filteredHistory.map((history, idx) => {
              const isExpanded = expandedItems.has(idx);
              const itemId = `timeline-item-${idx}`;
              const contentId = `timeline-content-${idx}`;
              
              return (
                <div 
                  key={idx} 
                  className={`fr-timeline-item fr-animate-in ${isExpanded ? 'fr-expanded' : ''}`}
                  style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                  role="listitem"
                >
                  <div className="fr-timeline-dot" aria-hidden="true" />
                  <div className="fr-timeline-content">
                    <button
                      id={itemId}
                      className="fr-timeline-header"
                      onClick={() => toggleExpand(idx)}
                      aria-expanded={isExpanded}
                      aria-controls={contentId}
                    >
                      <h4>{history.listing_title}</h4>
                      <div className="fr-timeline-header-right">
                        <span className="fr-points-earned">+{history.points_earned} pts</span>
                        {isExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                      </div>
                    </button>
                    <div className="fr-timeline-meta">
                      <span>{history.quantity_kg} kg</span>
                      <span className="fr-dot" aria-hidden="true">•</span>
                      <span>{new Date(history.timestamp).toLocaleDateString()}</span>
                      <span className="fr-dot" aria-hidden="true">•</span>
                      <span className={`fr-urgency-tag ${history.urgency_status}`}>
                        {history.urgency_status === 'rescue' ? '🚨 Rescue' : 
                         history.urgency_status === 'urgent' ? '⚡ Urgent' : '📦 Standard'}
                      </span>
                    </div>
                    
                    <div 
                      id={contentId}
                      className={`fr-timeline-details ${isExpanded ? 'fr-details-open' : ''}`}
                      aria-hidden={!isExpanded}
                    >
                      <div className="fr-detail-grid">
                        <div className="fr-detail-item">
                          <span className="fr-detail-label">Date & Time</span>
                          <span className="fr-detail-value">
                            {new Date(history.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="fr-detail-item">
                          <span className="fr-detail-label">Quantity</span>
                          <span className="fr-detail-value">{history.quantity_kg} kg</span>
                        </div>
                        <div className="fr-detail-item">
                          <span className="fr-detail-label">Points Earned</span>
                          <span className="fr-detail-value fr-highlight">+{history.points_earned}</span>
                        </div>
                        <div className="fr-detail-item">
                          <span className="fr-detail-label">Status</span>
                          <span className={`fr-detail-value fr-status-${history.urgency_status}`}>
                            {history.urgency_status}
                          </span>
                        </div>
                      </div>
                      {history.urgency_status === 'rescue' && (
                        <div className="fr-rescue-bonus">
                          🌟 Bonus points earned for rescuing food before expiry!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {filteredHistory.length > 0 && (
          <div className="fr-timeline-footer" aria-live="polite">
            Showing {filteredHistory.length} of {rewards?.donationHistory?.length || 0} contributions
          </div>
        )}
      </section>

      {/* BADGE DETAILS MODAL */}
      {selectedBadge && (
        <div 
          className="fr-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBadge(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div className="fr-modal" ref={modalRef}>
            <button
              className="fr-modal-close"
              onClick={() => setSelectedBadge(null)}
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
            
            <div 
              className={`fr-modal-badge-icon ${selectedBadge.earned ? 'earned' : ''}`}
              aria-hidden="true"
            >
              {selectedBadge.icon}
            </div>
            
            <h2 id="modal-title" className="fr-modal-title">{selectedBadge.name}</h2>
            <p id="modal-description" className="fr-modal-description">{selectedBadge.description}</p>
            
            <div className="fr-modal-status">
              {selectedBadge.earned ? (
                <div className="fr-modal-earned">
                  <Check size={20} aria-hidden="true" />
                  <span>Badge Earned!</span>
                </div>
              ) : (
                <div className="fr-modal-progress">
                  <div 
                    className="fr-modal-progress-bar"
                    role="progressbar"
                    aria-valuenow={selectedBadge.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div 
                      className="fr-modal-progress-fill"
                      style={{ width: `${selectedBadge.progress}%` }}
                    />
                  </div>
                  <span className="fr-modal-progress-text">{selectedBadge.progress}% Complete</span>
                </div>
              )}
            </div>
            
            <div className="fr-modal-motivation">
              <Target size={20} aria-hidden="true" />
              <p>{selectedBadge.nextSteps}</p>
            </div>
            
            <button
              className="fr-modal-action"
              onClick={() => setSelectedBadge(null)}
            >
              {selectedBadge.earned ? 'Awesome!' : 'Keep Going!'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerRewards;