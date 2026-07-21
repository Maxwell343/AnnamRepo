// src/components/Marketplace.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Marketplace.css';
import { API_ENDPOINTS } from '../../../config/api';
import { useToast } from '../../../components/ui/ToastProvider';
import { Leaf, Clock, Package, Handshake, Factory, Zap, Apple, Wheat, Milk, Flame, Home, Sprout, MapPin, Star, UtensilsCrossed, Target, X, Wallet, CheckCircle, ScrollText, BarChart3, ClipboardList, User as UserIcon, Globe, Truck, Droplets, ShoppingCart, Trash2, AlertTriangle, Circle, Search, LayoutGrid, Menu, Check, Siren, Bean } from 'lucide-react';
import type {
  MarketplaceListing,
  ListingCategory,
  ProductType,
  FreshnessLevel,
  MarketplaceFilters,
  UserRole,
  CartItem,
  SpoilageIndicator,
  RescuePriority,
  UserProfile,
} from '../../../types/marketplace';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const calculateSpoilageIndicator = (harvestDate: string, shelfLife: number): SpoilageIndicator => {
  const now = new Date();
  const harvest = new Date(harvestDate);
  const expiry = new Date(harvest);
  expiry.setDate(expiry.getDate() + shelfLife);

  const totalLife = shelfLife * 24 * 60 * 60 * 1000;
  const remaining = expiry.getTime() - now.getTime();

  const percentageRemaining = Math.max(0, Math.min(100, (remaining / totalLife) * 100));
  const hoursRemaining = Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
  const daysRemaining = Math.max(0, Math.floor(remaining / (1000 * 60 * 60 * 24)));

  let riskLevel: FreshnessLevel;
  let colorCode: string;
  let urgencyMessage: string;

  if (percentageRemaining > 80) {
    riskLevel = 'peak';
    colorCode = '#00C853';
    urgencyMessage = 'Peak Freshness';
  } else if (percentageRemaining > 60) {
    riskLevel = 'fresh';
    colorCode = '#64DD17';
    urgencyMessage = 'Fresh';
  } else if (percentageRemaining > 40) {
    riskLevel = 'good';
    colorCode = '#AEEA00';
    urgencyMessage = 'Good Condition';
  } else if (percentageRemaining > 20) {
    riskLevel = 'moderate';
    colorCode = '#FFD600';
    urgencyMessage = `${daysRemaining}d left - Act Soon`;
  } else if (percentageRemaining > 10) {
    riskLevel = 'urgent';
    colorCode = '#FF9100';
    urgencyMessage = `${hoursRemaining}h left - Urgent`;
  } else {
    riskLevel = 'critical';
    colorCode = '#FF1744';
    urgencyMessage = `${hoursRemaining}h left - Critical!`;
  }

  return {
    riskLevel,
    hoursRemaining,
    daysRemaining,
    percentageRemaining,
    colorCode,
    urgencyMessage,
  };
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

const isApiListingExpired = (apiListing: any): boolean => {
  const status = String(apiListing?.status || '').toLowerCase();
  const urgencyStatus = String(apiListing?.urgency_status || '').toLowerCase();

  if (status === 'expired' || urgencyStatus === 'expired') {
    return true;
  }

  const rawHoursRemaining = apiListing?.hours_remaining;
  if (typeof rawHoursRemaining === 'number' && rawHoursRemaining <= 0) {
    return true;
  }

  const expiryCandidates = [apiListing?.expires_at, apiListing?.expiry_date, apiListing?.expiry];
  for (const value of expiryCandidates) {
    if (!value) continue;
    const expiresAtMs = new Date(value).getTime();
    if (!Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()) {
      return true;
    }
  }

  return false;
};

const getCategoryIcon = (category: ListingCategory): React.ReactNode => {
  const icons: Record<ListingCategory, React.ReactNode> = {
    fresh_produce: <Leaf size={16} />,
    near_expiry: <Clock size={16} />,
    surplus: <Package size={16} />,
    ngo_rescue: <Handshake size={16} />,
    bulk_processing: <Factory size={16} />,
    flash_sale: <Zap size={16} />,
  };
  return icons[category];
};

const getCategoryLabel = (category: ListingCategory): string => {
  const labels: Record<ListingCategory, string> = {
    fresh_produce: 'Fresh Produce',
    near_expiry: 'Near Expiry',
    surplus: 'Surplus Crops',
    ngo_rescue: 'NGO Rescue',
    bulk_processing: 'Bulk & Processing',
    flash_sale: 'Flash Sale',
  };
  return labels[category];
};

const getProductIcon = (type: ProductType): React.ReactNode => {
  const icons: Record<ProductType, React.ReactNode> = {
    Vegetable: <Leaf size={16} />,
    Fruit: <Apple size={16} />,
    Grain: <Wheat size={16} />,
    Dairy: <Milk size={16} />,
    Pulses: <Bean size={16} />,
    Spices: <Flame size={16} />,
    Other: <Package size={16} />,
  };
  return icons[type];
};

// ============================================
// SUB-COMPONENTS
// ============================================

// Category Navigation
const CategoryNav: React.FC<{
  activeCategory: ListingCategory | 'all';
  onCategoryChange: (category: ListingCategory | 'all') => void;
  categoryCounts: Record<string, number>;
}> = ({ activeCategory, onCategoryChange, categoryCounts }) => {
  const categories: (ListingCategory | 'all')[] = [
    'all',
    'fresh_produce',
    'near_expiry',
    'ngo_rescue',
    'bulk_processing',
    'flash_sale',
  ];

  return (
    <nav className="mp-category-nav">
      <div className="mp-category-container">
        {categories.map((category) => (
          <button
            key={category}
            className={`mp-category-btn ${activeCategory === category ? 'active' : ''} ${
              category === 'flash_sale' ? 'flash' : ''
            }`}
            onClick={() => onCategoryChange(category)}
          >
            <span className="mp-category-icon">
              {category === 'all' ? <Home size={16} /> : getCategoryIcon(category as ListingCategory)}
            </span>
            <span className="mp-category-label">
              {category === 'all' ? 'All' : getCategoryLabel(category as ListingCategory)}
            </span>
            <span className="mp-category-count">{categoryCounts[category] || 0}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// Freshness Indicator
const FreshnessIndicator: React.FC<{
  indicator: SpoilageIndicator;
  compact?: boolean;
}> = ({ indicator, compact = false }) => {
  if (compact) {
    return (
      <div
        className="mp-freshness-compact"
        style={{ backgroundColor: `${indicator.colorCode}15` }}
      >
        <span className="mp-freshness-dot" style={{ backgroundColor: indicator.colorCode }} />
        <span className="mp-freshness-text" style={{ color: indicator.colorCode }}>
          {indicator.urgencyMessage}
        </span>
      </div>
    );
  }

  return (
    <div className="mp-freshness-indicator">
      <div className="mp-freshness-header">
        <span className="mp-freshness-label">Freshness</span>
        <span className="mp-freshness-time" style={{ color: indicator.colorCode }}>
          {indicator.urgencyMessage}
        </span>
      </div>
      <div className="mp-freshness-bar">
        <div
          className="mp-freshness-progress"
          style={{
            width: `${indicator.percentageRemaining}%`,
            backgroundColor: indicator.colorCode,
          }}
        />
      </div>
    </div>
  );
};

// Product Card
const ProductCard: React.FC<{
  listing: MarketplaceListing;
  onViewDetails: (listing: MarketplaceListing) => void;
  onAddToCart: (listing: MarketplaceListing, quantity: number) => void;
  onQuickRescue?: (listing: MarketplaceListing) => void;
  userRole?: UserRole | string;
}> = ({ listing, onViewDetails, onAddToCart, onQuickRescue, userRole }) => {
  const [quantity, setQuantity] = useState(listing.pricing.minOrderQuantity);
  const [imageError, setImageError] = useState(false);

  const hasDiscount = listing.pricing.currentPrice < listing.pricing.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - listing.pricing.currentPrice / listing.pricing.originalPrice) * 100)
    : 0;

  const primaryImage = listing.images?.[0];
  const isRescuePriority = listing.rescuePriority === 'critical' || listing.rescuePriority === 'high';
  const isFlashSale = listing.categories.includes('flash_sale');

  return (
    <div
      className={`mp-product-card ${isRescuePriority ? 'rescue-priority' : ''} ${
        isFlashSale ? 'flash-sale' : ''
      }`}
    >
      {/* Badges */}
      <div className="mp-card-badges">
        {isFlashSale && <span className="mp-badge mp-badge-flash"><Zap size={12} /> Flash Sale</span>}
        {isRescuePriority && <span className="mp-badge mp-badge-rescue"><Siren size={12} /> Rescue</span>}
        {listing.isOrganic && <span className="mp-badge mp-badge-organic"><Sprout size={12} /> Organic</span>}
        {hasDiscount && <span className="mp-badge mp-badge-discount">-{discountPercent}%</span>}
      </div>

      {/* Image */}
      <div className="mp-card-image" onClick={() => onViewDetails(listing)}>
        {primaryImage && !imageError ? (
          <img src={primaryImage} alt={listing.title} onError={() => setImageError(true)} />
        ) : (
          <div className="mp-image-placeholder">
            <span className="mp-product-emoji">{getProductIcon(listing.productType)}</span>
          </div>
        )}
        <div className="mp-card-image-stats">
          <span className="mp-image-stat">
            <Clock size={12} /> {listing.spoilageIndicator.hoursRemaining}h
          </span>
          <span className="mp-image-stat">
            <MapPin size={12} /> {formatDistance(listing.distanceFromUser || 0)}
          </span>
        </div>
        <div className="mp-card-overlay">
          <span>View Details</span>
        </div>
      </div>

      {/* Content */}
      <div className="mp-card-content">
        <div className="mp-card-header">
          <h3 className="mp-product-title" onClick={() => onViewDetails(listing)}>
            {listing.title}
          </h3>
          <div className="mp-product-meta">
            <span className="mp-product-type">{listing.productType}</span>
            {listing.variety && <span className="mp-product-variety">• {listing.variety}</span>}
          </div>
        </div>

        <FreshnessIndicator indicator={listing.spoilageIndicator} />

        {/* ML Shelf Life Badge */}
        {listing.mlPrediction && (
          <div className={`mp-shelf-life-badge mp-sl-${listing.mlPrediction.status.toLowerCase()}`}>
            <Clock size={12} />
            <span>{listing.mlPrediction.remainingHours}h left</span>
            <span className="mp-sl-status">{listing.mlPrediction.status}</span>
          </div>
        )}

        {/* Farmer Info */}
        <div className="mp-farmer-info">
          <div className="mp-farmer-avatar">{listing.farmer.name.charAt(0)}</div>
          <div className="mp-farmer-details">
            <span className="mp-farmer-name">{listing.farmer.name}</span>
            <span className="mp-farmer-location">
              <MapPin size={12} /> {listing.farmer.location.district}
              {listing.distanceFromUser && ` • ${formatDistance(listing.distanceFromUser)}`}
            </span>
          </div>
          <div className="mp-farmer-rating"><Star size={12} /> {listing.farmer.trustIndicator.qualityRating.toFixed(1)}</div>
        </div>

        {/* Pricing */}
        <div className="mp-card-pricing">
          <div className="mp-price-section">
            <span className="mp-current-price">
              {formatPrice(listing.pricing.currentPrice)}
              <span className="mp-price-unit">/{listing.pricing.unit}</span>
            </span>
            {hasDiscount && (
              <span className="mp-original-price">{formatPrice(listing.pricing.originalPrice)}</span>
            )}
          </div>
          <div className="mp-quantity-section">
            <span className="mp-available-qty">
              {listing.availableQuantity} {listing.unit} available
            </span>
          </div>
        </div>

        {/* Impact */}
        {listing.estimatedMeals && (
          <div className="mp-impact-preview">
            <span><UtensilsCrossed size={12} /> ~{listing.estimatedMeals.toLocaleString()} meals potential</span>
          </div>
        )}

        {/* Actions */}
        <div className="mp-card-actions">
          {userRole === 'ngo' || userRole === 'food_bank' ? (
            <button className="mp-btn-rescue" onClick={() => onQuickRescue?.(listing)}>
              <Handshake size={12} /> Quick Rescue
            </button>
          ) : (
            <>
              <div className="mp-quantity-input">
                <button
                  className="mp-qty-btn"
                  onClick={() => setQuantity(Math.max(listing.pricing.minOrderQuantity, quantity - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(listing.pricing.minOrderQuantity, parseInt(e.target.value) || 1))
                  }
                  min={listing.pricing.minOrderQuantity}
                  max={listing.availableQuantity}
                />
                <button
                  className="mp-qty-btn"
                  onClick={() => setQuantity(Math.min(listing.availableQuantity, quantity + 1))}
                >
                  +
                </button>
              </div>
              <button className="mp-btn-add-cart" onClick={() => onAddToCart(listing, quantity)}>
                Add to Cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Filters Sidebar
const FiltersSidebar: React.FC<{
  filters: MarketplaceFilters;
  onFiltersChange: (filters: MarketplaceFilters) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ filters, onFiltersChange, isOpen, onClose }) => {
  const productTypes: ProductType[] = ['Vegetable', 'Fruit', 'Grain', 'Dairy', 'Pulses', 'Spices', 'Other'];
  const freshnessLevels: FreshnessLevel[] = ['peak', 'fresh', 'good', 'moderate', 'urgent', 'critical'];

  const toggleProductType = (type: ProductType) => {
    const newTypes = filters.productTypes.includes(type)
      ? filters.productTypes.filter((t: ProductType) => t !== type)
      : [...filters.productTypes, type];
    onFiltersChange({ ...filters, productTypes: newTypes });
  };

  const toggleFreshness = (level: FreshnessLevel) => {
    const newLevels = filters.freshnessLevels.includes(level)
      ? filters.freshnessLevels.filter((l: FreshnessLevel) => l !== level)
      : [...filters.freshnessLevels, level];
    onFiltersChange({ ...filters, freshnessLevels: newLevels });
  };

  const clearFilters = () => {
    onFiltersChange({
      categories: [],
      productTypes: [],
      freshnessLevels: [],
      priceRange: { min: 0, max: 10000 },
      distanceRange: 100,
      sortBy: 'freshness',
    });
  };

  return (
    <aside className={`mp-filters-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="mp-filters-header">
        <h3><Target size={16} /> Filters</h3>
        <button className="mp-close-filters" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="mp-filters-content">
        {/* Distance */}
        <div className="mp-filter-group">
          <h4><MapPin size={14} /> Distance</h4>
          <div className="mp-distance-slider">
            <input
              type="range"
              min="1"
              max="500"
              value={filters.distanceRange}
              onChange={(e) => onFiltersChange({ ...filters, distanceRange: parseInt(e.target.value) })}
            />
            <span className="mp-distance-value">Within {filters.distanceRange} km</span>
          </div>
        </div>

        {/* Price Range */}
        <div className="mp-filter-group">
          <h4><Wallet size={14} /> Price Range</h4>
          <div className="mp-price-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange.min || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceRange: { ...filters.priceRange, min: parseInt(e.target.value) || 0 },
                })
              }
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange.max || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceRange: { ...filters.priceRange, max: parseInt(e.target.value) || 10000 },
                })
              }
            />
          </div>
        </div>

        {/* Product Types */}
        <div className="mp-filter-group">
          <h4><Leaf size={14} /> Product Type</h4>
          <div className="mp-filter-chips">
            {productTypes.map((type) => (
              <button
                key={type}
                className={`mp-filter-chip ${filters.productTypes.includes(type) ? 'active' : ''}`}
                onClick={() => toggleProductType(type)}
              >
                {getProductIcon(type)} {type}
              </button>
            ))}
          </div>
        </div>

        {/* Freshness */}
        <div className="mp-filter-group">
          <h4><Clock size={14} /> Freshness Level</h4>
          <div className="mp-filter-chips">
            {freshnessLevels.map((level) => (
              <button
                key={level}
                className={`mp-filter-chip mp-freshness-${level} ${
                  filters.freshnessLevels.includes(level) ? 'active' : ''
                }`}
                onClick={() => toggleFreshness(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mp-filter-group">
          <h4><CheckCircle size={14} /> Certifications</h4>
          <label className="mp-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.isOrganic || false}
              onChange={(e) => onFiltersChange({ ...filters, isOrganic: e.target.checked })}
            />
            <span><Sprout size={12} /> Organic Only</span>
          </label>
          <label className="mp-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.isCertified || false}
              onChange={(e) => onFiltersChange({ ...filters, isCertified: e.target.checked })}
            />
            <span><ScrollText size={12} /> FSSAI Certified</span>
          </label>
        </div>

        {/* Sort By */}
        <div className="mp-filter-group">
          <h4><BarChart3 size={14} /> Sort By</h4>
          <select
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as MarketplaceFilters['sortBy'] })}
            className="mp-sort-select"
          >
            <option value="freshness">Freshest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="distance">Nearest First</option>
            <option value="urgency">Most Urgent</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      <div className="mp-filters-footer">
        <button className="mp-btn-clear" onClick={clearFilters}>
          Clear All
        </button>
        <button className="mp-btn-apply" onClick={onClose}>
          Apply Filters
        </button>
      </div>
    </aside>
  );
};

// Product Detail Modal
const ProductDetailModal: React.FC<{
  listing: MarketplaceListing;
  onClose: () => void;
  onAddToCart: (listing: MarketplaceListing, quantity: number) => void;
  onRescue?: (listing: MarketplaceListing) => void;
  userRole?: UserRole | string;
}> = ({ listing, onClose, onAddToCart, onRescue, userRole }) => {
  const [quantity, setQuantity] = useState(listing.pricing.minOrderQuantity);
  const [activeTab, setActiveTab] = useState<'details' | 'farmer' | 'impact'>('details');
  const [imageError, setImageError] = useState(false);

  const primaryImage = listing.images?.[0];
  const hasDiscount = listing.pricing.currentPrice < listing.pricing.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - listing.pricing.currentPrice / listing.pricing.originalPrice) * 100)
    : 0;

  const totalPrice = listing.pricing.currentPrice * quantity;
  const bulkDiscount = listing.pricing.bulkDiscount;
  const hasBulkDiscount = bulkDiscount && quantity >= bulkDiscount.minQuantity;
  const finalPrice = hasBulkDiscount ? totalPrice * (1 - bulkDiscount.discountPercent / 100) : totalPrice;
  const isRescuePriority = listing.rescuePriority === 'critical' || listing.rescuePriority === 'high';
  const freshnessTone = `tone-${listing.spoilageIndicator.riskLevel}`;

  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className={`mp-product-modal mp-modal-shell mp-modal-${listing.spoilageIndicator.riskLevel} ${freshnessTone}`} onClick={(e) => e.stopPropagation()}>
        <button className="mp-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="mp-modal-content">
          <div className="mp-modal-left mp-modal-media-panel">
            <div className="mp-modal-image mp-modal-image-frame">
              {primaryImage && !imageError ? (
                <img src={primaryImage} alt={listing.title} onError={() => setImageError(true)} />
              ) : (
                <div className="mp-image-placeholder large">
                  <span className="mp-product-emoji">{getProductIcon(listing.productType)}</span>
                </div>
              )}
            </div>

            <div className="mp-modal-badges">
              {listing.isOrganic && <span className="mp-badge mp-badge-organic"><Sprout size={12} /> Organic</span>}
              {listing.isCertified && <span className="mp-badge mp-badge-certified"><ScrollText size={12} /> FSSAI Certified</span>}
              {listing.categories.includes('flash_sale') && (
                <span className="mp-badge mp-badge-flash"><Zap size={12} /> Flash Sale</span>
              )}
            </div>

            <div className="mp-modal-media-insights">
              <div className="mp-media-insight-card">
                <span className="label"><Clock size={12} /> Freshness Window</span>
                <strong>{listing.spoilageIndicator.hoursRemaining}h</strong>
              </div>
              <div className="mp-media-insight-card">
                <span className="label"><Package size={12} /> Available</span>
                <strong>{listing.availableQuantity} {listing.unit}</strong>
              </div>
              <div className="mp-media-insight-card">
                <span className="label"><MapPin size={12} /> Distance</span>
                <strong>{formatDistance(listing.distanceFromUser || 0)}</strong>
              </div>
              <div className="mp-media-insight-card">
                <span className="label"><UtensilsCrossed size={12} /> Meals Impact</span>
                <strong>~{listing.estimatedMeals?.toLocaleString() || 'N/A'}</strong>
              </div>
            </div>
          </div>

          <div className="mp-modal-right mp-modal-main-panel">
            <div className="mp-modal-header">
              <div className="mp-modal-title-row">
                <h2>{listing.title}</h2>
                <div className="mp-modal-title-tags">
                  <span className="mp-modal-type-chip">{listing.productType}</span>
                  {listing.variety && <span className="mp-modal-type-chip muted">{listing.variety}</span>}
                  {isRescuePriority && <span className="mp-modal-type-chip alert"><Siren size={12} /> Priority</span>}
                </div>
              </div>

              <p className="mp-modal-subtitle">{listing.description}</p>
            </div>

            <div className="mp-modal-quick-strip">
              <span><Clock size={12} /> {listing.spoilageIndicator.urgencyMessage}</span>
              <span><MapPin size={12} /> {listing.location.district}, {listing.location.state}</span>
              <span><Star size={12} /> {listing.farmer.trustIndicator.qualityRating.toFixed(1)} farmer rating</span>
              {listing.estimatedMeals && <span><UtensilsCrossed size={12} /> ~{listing.estimatedMeals.toLocaleString()} meals</span>}
            </div>

            <div className="mp-modal-freshness-wrap">
              <FreshnessIndicator indicator={listing.spoilageIndicator} />
            </div>

            <div className="mp-modal-tabs">
              <button
                className={`mp-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <ClipboardList size={14} /> Details
              </button>
              <button
                className={`mp-tab ${activeTab === 'farmer' ? 'active' : ''}`}
                onClick={() => setActiveTab('farmer')}
              >
                <UserIcon size={14} /> Farmer
              </button>
              <button
                className={`mp-tab ${activeTab === 'impact' ? 'active' : ''}`}
                onClick={() => setActiveTab('impact')}
              >
                <Globe size={14} /> Impact
              </button>
            </div>

            <div className="mp-modal-tab-content">
              {activeTab === 'details' && (
                <div className="mp-details-tab">
                  <p className="mp-description">{listing.description}</p>

                  <div className="mp-details-grid">
                    <div className="mp-detail-item">
                      <span className="mp-detail-label">Harvest Date</span>
                      <span className="mp-detail-value">
                        {new Date(listing.harvestDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mp-detail-item">
                      <span className="mp-detail-label">Shelf Life</span>
                      <span className="mp-detail-value">{listing.shelfLife} days</span>
                    </div>
                    <div className="mp-detail-item">
                      <span className="mp-detail-label">Available</span>
                      <span className="mp-detail-value">
                        {listing.availableQuantity} {listing.unit}
                      </span>
                    </div>
                    <div className="mp-detail-item">
                      <span className="mp-detail-label">Location</span>
                      <span className="mp-detail-value">
                        {listing.location.district}, {listing.location.state}
                      </span>
                    </div>
                  </div>

                  <div className="mp-delivery-options">
                    <h4>Delivery Options</h4>
                    <div className="mp-options-list">
                      {listing.pickupAvailable && <span className="mp-option"><MapPin size={12} /> Pickup Available</span>}
                      {listing.deliveryAvailable && (
                        <span className="mp-option"><Truck size={12} /> Delivery within {listing.deliveryRadius}km</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'farmer' && (
                <div className="mp-farmer-tab">
                  <div className="mp-farmer-profile">
                    <div className="mp-farmer-avatar large">{listing.farmer.name.charAt(0)}</div>
                    <div className="mp-farmer-info-detailed">
                      <h4>{listing.farmer.name}</h4>
                      <p className="mp-farm-name">{listing.farmer.farmName}</p>
                      <p className="mp-farm-location">
                        <MapPin size={12} /> {listing.farmer.location.district}, {listing.farmer.location.state}
                      </p>
                    </div>
                  </div>

                  <div className="mp-trust-indicators">
                    <div className="mp-trust-score">
                      <span className="mp-score">{listing.farmer.trustIndicator.reliabilityScore}</span>
                      <span className="mp-label">Reliability</span>
                    </div>
                    <div className="mp-trust-stat">
                      <span className="mp-value"><Star size={12} /> {listing.farmer.trustIndicator.qualityRating.toFixed(1)}</span>
                      <span className="mp-label">Rating</span>
                    </div>
                    <div className="mp-trust-stat">
                      <span className="mp-value">{listing.farmer.trustIndicator.onTimeRate}%</span>
                      <span className="mp-label">On-time</span>
                    </div>
                    <div className="mp-trust-stat">
                      <span className="mp-value">{listing.farmer.trustIndicator.totalTransactions}</span>
                      <span className="mp-label">Transactions</span>
                    </div>
                  </div>

                  <div className="mp-farmer-badges">
                    {listing.farmer.trustIndicator.verificationBadges.map((badge: string, idx: number) => (
                      <span key={idx} className="mp-verification-badge">
                        <Check size={12} /> {badge}
                      </span>
                    ))}
                  </div>

                  {listing.farmer.certifications.length > 0 && (
                    <div className="mp-farmer-certifications">
                      <h4>Certifications</h4>
                      <div className="mp-cert-list">
                        {listing.farmer.certifications.map((cert: string, idx: number) => (
                          <span key={idx} className="mp-cert-badge">
                            <ScrollText size={12} /> {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'impact' && (
                <div className="mp-impact-tab">
                  <div className="mp-impact-card">
                    <h4><UtensilsCrossed size={14} /> Potential Meals</h4>
                    <span className="mp-impact-value">{listing.estimatedMeals?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="mp-impact-card">
                    <h4><Sprout size={14} /> Carbon Saved</h4>
                    <span className="mp-impact-value">{Math.round(listing.availableQuantity * 0.5)} kg CO₂</span>
                  </div>
                  <div className="mp-impact-card">
                    <h4><Droplets size={14} /> Water Saved</h4>
                    <span className="mp-impact-value">{(listing.availableQuantity * 30).toLocaleString()} L</span>
                  </div>

                  <div className="mp-farmer-impact">
                    <h4>Farmer's Total Impact</h4>
                    <div className="mp-impact-stats">
                      <div className="mp-stat">
                        <span className="mp-value">{listing.farmer.impactStats.totalFoodSaved.toLocaleString()} kg</span>
                        <span className="mp-label">Food Saved</span>
                      </div>
                      <div className="mp-stat">
                        <span className="mp-value">{listing.farmer.impactStats.mealsProvided.toLocaleString()}</span>
                        <span className="mp-label">Meals Provided</span>
                      </div>
                      <div className="mp-stat">
                        <span className="mp-value">{listing.farmer.impactStats.carbonSaved.toLocaleString()} kg</span>
                        <span className="mp-label">CO₂ Saved</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing & Actions */}
            <div className="mp-modal-pricing mp-modal-buy-panel">
              <div className="mp-price-display">
                <div className="mp-main-price">
                  <span className="mp-current">{formatPrice(listing.pricing.currentPrice)}</span>
                  <span className="mp-unit">/{listing.pricing.unit}</span>
                  {hasDiscount && (
                    <>
                      <span className="mp-original">{formatPrice(listing.pricing.originalPrice)}</span>
                      <span className="mp-discount-badge">-{discountPercent}%</span>
                    </>
                  )}
                </div>

                {bulkDiscount && (
                  <div className="mp-bulk-offer">
                    <Wallet size={14} /> Order {bulkDiscount.minQuantity}+ {listing.unit} and save {bulkDiscount.discountPercent}%!
                  </div>
                )}
              </div>

              <div className="mp-order-section">
                <div className="mp-quantity-selector">
                  <span>Quantity:</span>
                  <div className="mp-quantity-controls">
                    <button
                      onClick={() => setQuantity(Math.max(listing.pricing.minOrderQuantity, quantity - 1))}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(listing.pricing.minOrderQuantity, parseInt(e.target.value) || 1))
                      }
                      min={listing.pricing.minOrderQuantity}
                      max={listing.availableQuantity}
                    />
                    <button onClick={() => setQuantity(Math.min(listing.availableQuantity, quantity + 1))}>
                      +
                    </button>
                  </div>
                  <span className="mp-unit-label">{listing.unit}</span>
                </div>

                <div className="mp-total-display">
                  <span className="mp-total-label">Total:</span>
                  <span className="mp-total-value">
                    {formatPrice(finalPrice)}
                    {hasBulkDiscount && (
                      <span className="mp-savings"> (Save {formatPrice(totalPrice - finalPrice)}!)</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="mp-modal-actions">
                {userRole === 'ngo' || userRole === 'food_bank' ? (
                  <button className="mp-btn-rescue large" onClick={() => onRescue?.(listing)}>
                    <Handshake size={14} /> Rescue This Produce
                  </button>
                ) : (
                  <>
                    <button className="mp-btn-cart" onClick={() => onAddToCart(listing, quantity)}>
                      <ShoppingCart size={14} /> Add to Cart
                    </button>
                    <button className="mp-btn-buy-now"><Zap size={14} /> Buy Now</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Cart Sidebar
const CartSidebar: React.FC<{
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (listingId: string, quantity: number) => void;
  onRemoveItem: (listingId: string) => void;
  onCheckout: () => void;
}> = ({ cart, isOpen, onClose, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const subtotal = cart.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + deliveryFee;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const freeDeliveryTarget = 500;
  const deliveryProgress = Math.min(100, (subtotal / freeDeliveryTarget) * 100);
  const mealsEstimate = Math.max(1, Math.round(subtotal / 50));
  const co2Estimate = Math.max(1, Math.round(subtotal * 0.1));

  return (
    <aside className={`mp-cart-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="mp-cart-header">
        <div className="mp-cart-header-main">
          <h3><ShoppingCart size={16} /> Your Cart</h3>
          <p>{itemCount} item{itemCount !== 1 ? 's' : ''} selected</p>
        </div>
        <button className="mp-close-cart" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="mp-cart-empty">
          <span className="mp-empty-icon"><ShoppingCart size={40} /></span>
          <p>Your cart is empty</p>
          <span className="mp-empty-subtitle">Add fresh produce from our farmers!</span>
        </div>
      ) : (
        <>
          <div className="mp-cart-items">
            {cart.map((item) => (
              <div key={item.listing.id} className="mp-cart-item">
                <div className="mp-item-image">
                  <span>{getProductIcon(item.listing.productType)}</span>
                </div>
                <div className="mp-item-details">
                  <h4>{item.listing.title}</h4>
                  <p className="mp-item-farmer">by {item.listing.farmer.name}</p>
                  <FreshnessIndicator indicator={item.listing.spoilageIndicator} compact />
                </div>
                <div className="mp-item-controls">
                  <div className="mp-item-quantity-row">
                    <div className="mp-item-quantity">
                      <button onClick={() => onUpdateQuantity(item.listing.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.listing.id, item.quantity + 1)}>+</button>
                    </div>
                    <span className="mp-item-price">{formatPrice(item.priceAtAdd * item.quantity)}</span>
                  </div>
                  <button className="mp-remove-item" onClick={() => onRemoveItem(item.listing.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mp-cart-summary">
            <div className="mp-delivery-progress-track" aria-hidden="true">
              <div className="mp-delivery-progress-fill" style={{ width: `${deliveryProgress}%` }} />
            </div>
            <div className="mp-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mp-summary-row">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
            </div>
            {subtotal <= 500 && (
              <div className="mp-free-delivery-hint">Add {formatPrice(500 - subtotal)} more for free delivery!</div>
            )}
            <div className="mp-summary-row total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="mp-cart-actions">
            <button className="mp-btn-checkout" onClick={onCheckout}>
              Proceed to Checkout
            </button>
          </div>

          <div className="mp-cart-impact">
            <span className="mp-impact-label"><Globe size={14} /> Your Impact</span>
            <div className="mp-impact-mini-stats">
              <span>~{mealsEstimate} meals supported</span>
              <span>~{co2Estimate} kg CO₂ saved</span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

// NGO Rescue View
const NGORescueView: React.FC<{
  listings: MarketplaceListing[];
  onRescue: (listing: MarketplaceListing) => void;
}> = ({ listings, onRescue }) => {
  const rescueListings = listings
    .filter((l) => l.rescuePriority === 'critical' || l.rescuePriority === 'high')
    .sort((a, b) => {
      const priorityOrder: Record<RescuePriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.rescuePriority || 'low']) - (priorityOrder[b.rescuePriority || 'low']);
    });

  const totalMeals = rescueListings.reduce((sum, l) => sum + (l.estimatedMeals || 0), 0);

  return (
    <div className="mp-ngo-rescue-view">
      <div className="mp-rescue-header">
        <div className="mp-rescue-title">
          <h2><AlertTriangle size={18} /> Priority Rescue Queue</h2>
          <p>These items need immediate attention to prevent food waste</p>
        </div>
        <div className="mp-rescue-stats">
          <div className="mp-rescue-stat">
            <span className="mp-value">{rescueListings.length}</span>
            <span className="mp-label">Items to Rescue</span>
          </div>
          <div className="mp-rescue-stat">
            <span className="mp-value">{totalMeals.toLocaleString()}</span>
            <span className="mp-label">Potential Meals</span>
          </div>
        </div>
      </div>

      <div className="mp-rescue-grid">
        {rescueListings.map((listing) => (
          <div key={listing.id} className={`mp-rescue-card priority-${listing.rescuePriority}`}>
            <div className="mp-rescue-urgency">
              <span className="mp-urgency-badge">
                {listing.rescuePriority === 'critical' ? <Circle size={8} className="critical" /> : <Circle size={8} className="high" />}
                {listing.rescuePriority?.toUpperCase()}
              </span>
              <span className="mp-time-left">{listing.spoilageIndicator.urgencyMessage}</span>
            </div>

            <div className="mp-rescue-content">
              <div className="mp-rescue-image">
                <span>{getProductIcon(listing.productType)}</span>
              </div>
              <div className="mp-rescue-info">
                <h4>{listing.title}</h4>
                <p>
                  {listing.availableQuantity} {listing.unit} available
                </p>
                <p className="mp-rescue-location"><MapPin size={12} /> {listing.location.district}</p>
                <p className="mp-rescue-meals"><UtensilsCrossed size={12} /> ~{listing.estimatedMeals?.toLocaleString()} meals</p>
              </div>
            </div>

            <div className="mp-rescue-progress">
              <div
                className="mp-progress-bar"
                style={{
                  width: `${listing.spoilageIndicator.percentageRemaining}%`,
                  backgroundColor: listing.spoilageIndicator.colorCode,
                }}
              />
            </div>

            <button className="mp-btn-rescue-now" onClick={() => onRescue(listing)}>
              <Handshake size={12} /> Rescue Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN MARKETPLACE COMPONENT
// ============================================

const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [activeCategory, setActiveCategory] = useState<ListingCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MarketplaceFilters>({
    categories: [],
    productTypes: [],
    freshnessLevels: [],
    priceRange: { min: 0, max: 10000 },
    distanceRange: 100,
    sortBy: 'urgency',
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Map API listing to MarketplaceListing format
  const mapApiListingToMarketplace = (apiListing: any): MarketplaceListing => {
    // Parse harvest date safely
    let harvestDate = new Date();
    if (apiListing.created_at) {
      const parsed = new Date(apiListing.created_at);
      if (!isNaN(parsed.getTime())) {
        harvestDate = parsed;
      }
    }

    // Use native expiry engine fields enriched by our backend
    const mlHours = apiListing.hours_remaining;
    const mlStatus = apiListing.urgency_status;
    let shelfLife = 7; // default days
    let spoilageIndicator: SpoilageIndicator;

    if (mlHours != null) {
      const hoursRemaining = Math.max(0, mlHours);
      const baseHours = apiListing.base_shelf_life_hours || 168;
      const percentageRemaining = Math.max(0, Math.min(100, (hoursRemaining / baseHours) * 100));
      const daysRemaining = Math.floor(hoursRemaining / 24);

      let riskLevel: FreshnessLevel;
      let colorCode: string;
      let urgencyMessage: string;

      if (mlStatus === 'critical' || mlStatus === 'expired') {
        riskLevel = 'critical';
        colorCode = '#FF1744';
        urgencyMessage = `⚠️ Only ${hoursRemaining}h left — Buy fast!`;
      } else if (mlStatus === 'rescue' || mlStatus === 'urgent') {
        riskLevel = 'urgent';
        colorCode = '#FF9100';
        urgencyMessage = `${hoursRemaining}h left — Act Soon`;
      } else {
        riskLevel = hoursRemaining > baseHours * 0.6 ? 'fresh' : 'good';
        colorCode = hoursRemaining > baseHours * 0.6 ? '#64DD17' : '#AEEA00';
        urgencyMessage = hoursRemaining > 0 ? `${daysRemaining}d ${hoursRemaining % 24}h remaining` : 'Expired';
      }

      spoilageIndicator = { riskLevel, hoursRemaining, daysRemaining, percentageRemaining, colorCode, urgencyMessage };
      shelfLife = Math.ceil(baseHours / 24);
    } else {
      // Fallback: generic calculation
      spoilageIndicator = calculateSpoilageIndicator(harvestDate.toISOString(), shelfLife);
    }

    const expiryDate = new Date(harvestDate.getTime() + shelfLife * 24 * 60 * 60 * 1000);

    return {
      id: apiListing.id || apiListing._id?.toString() || 'unknown',
      farmerId: apiListing.farmer_id || 'unknown',
      farmer: {
        id: apiListing.farmer_id || 'unknown',
        name: apiListing.farmer_name || 'Farmer',
        farmName: apiListing.farmer_name || 'Farm',
        location: {
          lat: 28.6139,
          lng: 77.209,
          address: apiListing.pickup_address || 'Unknown',
          district: 'N/A',
          state: 'N/A',
          pincode: '110001',
        },
        certifications: [],
        specializations: [apiListing.type || 'Other'],
        trustIndicator: {
          reliabilityScore: 85,
          totalTransactions: 15,
          successfulDeliveries: 14,
          onTimeRate: 93,
          qualityRating: 4.5,
          responseTime: 'Usually responds in 1h',
          verificationBadges: ['Verified Farmer'],
        },
        totalListings: 8,
        activeListings: 3,
        impactStats: {
          totalFoodSaved: 500,
          mealsProvided: 1500,
          carbonSaved: 250,
        },
      },
      title: apiListing.title || 'Produce',
      description: apiListing.description || apiListing.notes || 'Fresh farm produce',
      productType: (apiListing.type as ProductType) || 'Other',
      variety: '',
      quantity: typeof apiListing.quantity === 'string' ? parseFloat(apiListing.quantity) : apiListing.quantity || 0,
      availableQuantity: typeof apiListing.quantity === 'string' ? parseFloat(apiListing.quantity) : apiListing.quantity || 0,
      unit: 'kg',
      images: apiListing.image ? [apiListing.image] : [],
      harvestDate: harvestDate.toISOString(),
      shelfLife: shelfLife,
      expiryDate: expiryDate.toISOString(),
      spoilageIndicator: spoilageIndicator,
      pricing: {
        originalPrice: typeof apiListing.price === 'string' ? parseFloat(apiListing.price) : apiListing.price || 100,
        currentPrice: typeof apiListing.price === 'string' ? parseFloat(apiListing.price) : apiListing.price || 100,
        unit: 'kg',
        minOrderQuantity: 1,
      },
      sellingMode: 'sell',
      location: {
        lat: 28.6139,
        lng: 77.209,
        address: apiListing.pickup_address || 'Unknown Location',
        district: 'N/A',
        state: 'N/A',
        pincode: '110001',
      },
      deliveryAvailable: false,
      pickupAvailable: true,
      deliveryRadius: 0,
      categories: [
        'fresh_produce',
        ...(apiListing.freshness_status === 'CRITICAL' ? ['near_expiry' as ListingCategory] : []),
      ],
      tags: ['farmer-listed', 'fresh'],
      isOrganic: false,
      isCertified: false,
      status: apiListing.status || 'active',
      createdAt: apiListing.created_at || new Date().toISOString(),
      updatedAt: apiListing.updated_at || new Date().toISOString(),
      viewCount: 0,
      aiQualityScore: 80,
      suggestedRouting: 'direct_sale',
      distanceFromUser: 15,
      rescuePriority: apiListing.freshness_status === 'CRITICAL' ? 'critical' : apiListing.freshness_status === 'URGENT' ? 'high' : 'low',
      estimatedMeals: Math.round(((typeof apiListing.quantity === 'string' ? parseFloat(apiListing.quantity) : apiListing.quantity) || 0) * 5),
      // ML prediction metadata
      mlPrediction: apiListing.remaining_shelf_life_hours != null ? {
        remainingHours: apiListing.remaining_shelf_life_hours,
        status: apiListing.freshness_status || 'SAFE',
      } : undefined,
      rescueInfo: apiListing.rescue_info,
      expires_at: apiListing.expires_at,
      price: typeof apiListing.price === 'string' ? parseFloat(apiListing.price) : apiListing.price,
    };
  };

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Error parsing user', err);
      }
    }
  }, []);

  // Load listings from API (real farmer-listed products only)
  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true);
      try {
        let fetchUrl = API_ENDPOINTS.listings;
        if (user?.role === 'ngo') {
          fetchUrl = API_ENDPOINTS.rescue.ngoPriority();
        }
        
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const data = await response.json();
          
          if (data.listings && Array.isArray(data.listings) && data.listings.length > 0) {
            // Filter stale expired records defensively, then map for UI.
            const validListings = data.listings.filter((apiListing: any) => !isApiListingExpired(apiListing));
            const mappedListings = validListings.map((apiListing: any) => {
              return mapApiListingToMarketplace(apiListing);
            });
            setListings(mappedListings);
          } else {
            // No listings from API - show empty state
            setListings([]);
          }
        } else {
          // API error - show empty state
          const errorText = await response.text();
          setListings([]);
          console.error('[MARKETPLACE] Failed to fetch listings. Status:', response.status, 'Error:', errorText);
        }
      } catch (error) {
        // Network error - show empty state
        console.error('[MARKETPLACE] Network error loading listings:', error);
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadListings();
  }, []);

  // Filter and sort listings
  useEffect(() => {
    let result = [...listings];

    // Filter by category
    if (activeCategory !== 'all') {
      result = result.filter((l) => l.categories.includes(activeCategory));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          l.productType.toLowerCase().includes(query) ||
          l.farmer.name.toLowerCase().includes(query) ||
          l.location.district.toLowerCase().includes(query)
      );
    }

    // Filter by product types
    if (filters.productTypes.length > 0) {
      result = result.filter((l) => filters.productTypes.includes(l.productType));
    }

    // Filter by freshness levels
    if (filters.freshnessLevels.length > 0) {
      result = result.filter((l) => filters.freshnessLevels.includes(l.spoilageIndicator.riskLevel));
    }

    // Filter by price range
    result = result.filter(
      (l) => l.pricing.currentPrice >= filters.priceRange.min && l.pricing.currentPrice <= filters.priceRange.max
    );

    // Filter by distance
    if (filters.distanceRange) {
      result = result.filter((l) => (l.distanceFromUser || 0) <= filters.distanceRange);
    }

    // Filter by organic
    if (filters.isOrganic) {
      result = result.filter((l) => l.isOrganic);
    }

    // Filter by certified
    if (filters.isCertified) {
      result = result.filter((l) => l.isCertified);
    }

    // Sort
    switch (filters.sortBy) {
      case 'freshness':
        result.sort((a, b) => b.spoilageIndicator.percentageRemaining - a.spoilageIndicator.percentageRemaining);
        break;
      case 'price_low':
        result.sort((a, b) => a.pricing.currentPrice - b.pricing.currentPrice);
        break;
      case 'price_high':
        result.sort((a, b) => b.pricing.currentPrice - a.pricing.currentPrice);
        break;
      case 'distance':
        result.sort((a, b) => (a.distanceFromUser || 999) - (b.distanceFromUser || 999));
        break;
      case 'urgency':
        result.sort((a, b) => a.spoilageIndicator.hoursRemaining - b.spoilageIndicator.hoursRemaining);
        break;
      case 'rating':
        result.sort((a, b) => b.farmer.trustIndicator.qualityRating - a.farmer.trustIndicator.qualityRating);
        break;
    }

    setFilteredListings(result);
  }, [listings, activeCategory, searchQuery, filters]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    listings.forEach((l: MarketplaceListing) => {
      l.categories.forEach((cat: ListingCategory) => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }, [listings]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.productTypes.length > 0) count += 1;
    if (filters.freshnessLevels.length > 0) count += 1;
    if (filters.isOrganic) count += 1;
    if (filters.isCertified) count += 1;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) count += 1;
    if (filters.distanceRange < 100) count += 1;
    if (filters.sortBy !== 'urgency') count += 1;
    return count;
  }, [filters]);

  const marketplacePulse = useMemo(() => {
    const urgent = filteredListings.filter(
      (l) => l.spoilageIndicator.riskLevel === 'urgent' || l.spoilageIndicator.riskLevel === 'critical'
    ).length;
    const avgPrice =
      filteredListings.length > 0
        ? Math.round(filteredListings.reduce((sum, l) => sum + l.pricing.currentPrice, 0) / filteredListings.length)
        : 0;
    const mealsPotential = filteredListings.reduce((sum, l) => sum + (l.estimatedMeals || 0), 0);

    return {
      urgent,
      avgPrice,
      mealsPotential,
    };
  }, [filteredListings]);

  const applyQuickFilter = useCallback(
    (mode: 'urgent' | 'organic' | 'budget' | 'nearby' | 'rescue') => {
      if (mode === 'urgent') {
        setFilters((prev) => ({ ...prev, freshnessLevels: ['urgent', 'critical'], sortBy: 'urgency' }));
        return;
      }
      if (mode === 'organic') {
        setFilters((prev) => ({ ...prev, isOrganic: true, sortBy: 'rating' }));
        return;
      }
      if (mode === 'rescue') {
        setFilters((prev) => ({ ...prev, sortBy: 'urgency' }));
        return;
      }
      if (mode === 'budget') {
        setFilters((prev) => ({ ...prev, priceRange: { ...prev.priceRange, max: 120 }, sortBy: 'price_low' }));
        return;
      }
      setFilters((prev) => ({ ...prev, distanceRange: 20, sortBy: 'distance' }));
    },
    []
  );

  // Cart functions
  const addToCart = useCallback(
    (listing: MarketplaceListing, quantity: number) => {
      if (!user) {
        navigate('/auth', { state: { returnTo: '/marketplace' } });
        return;
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.listing.id === listing.id);
        if (existing) {
          return prev.map((item) =>
            item.listing.id === listing.id ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [...prev, { listing, quantity, priceAtAdd: listing.pricing.currentPrice }];
      });
      setIsCartOpen(true);
    },
    [user, navigate]
  );

  const updateCartQuantity = useCallback((listingId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.listing.id !== listingId));
    } else {
      setCart((prev) => prev.map((item) => (item.listing.id === listingId ? { ...item, quantity } : item)));
    }
  }, []);

  const removeFromCart = useCallback((listingId: string) => {
    setCart((prev) => prev.filter((item) => item.listing.id !== listingId));
  }, []);

  const handleRescue = useCallback(
    (listing: MarketplaceListing) => {
      if (!user) {
        navigate('/auth', { state: { returnTo: '/marketplace' } });
        return;
      }
      showToast(
        `Rescue confirmed for ${listing.title} (${listing.availableQuantity} ${listing.unit}).`,
        { title: 'Rescue Confirmed', variant: 'success' }
      );
    },
    [user, navigate, showToast]
  );

  const handleCheckout = useCallback(() => {
    if (!user) {
      navigate('/auth', { state: { returnTo: '/marketplace' } });
      return;
    }
    navigate('/checkout', { state: { cartItems: cart } });
  }, [navigate, user, cart]);

  const handleHomeClick = useCallback(() => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/');
    }
  }, [navigate, user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="mp-marketplace">
        <header className="mp-header">
          <div className="mp-header-container">
            <div className="mp-header-left">
              <div className="mp-brand" onClick={handleHomeClick}>
                <span className="mp-brand-icon"><Wheat size={20} /></span>
                <div className="mp-brand-text">
                  <span className="mp-brand-name">Annam</span>
                  <span className="mp-brand-tagline">Marketplace</span>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="mp-loading">
          <div className="mp-loader">
            <span className="mp-loader-icon"><Wheat size={20} /></span>
            <p>Loading fresh produce...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-marketplace">
      {/* Header */}
      <header className="mp-header">
        <div className="mp-header-container">
          <div className="mp-header-left">
            <div className="mp-brand" onClick={handleHomeClick}>
              <span className="mp-brand-icon"><Wheat size={20} /></span>
              <div className="mp-brand-text">
                <span className="mp-brand-name">Annam</span>
                <span className="mp-brand-tagline">Marketplace</span>
              </div>
            </div>
          </div>

          <div className="mp-header-center">
            <div className="mp-search-box">
              <span className="mp-search-icon"><Search size={18} /></span>
              <input
                type="text"
                placeholder="Search products, farmers, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="mp-clear-search" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="mp-header-right">
            <button className="mp-btn-filters" onClick={() => setIsFiltersOpen(true)}>
              <Target size={14} /> Filters
            </button>
            <button className="mp-btn-cart-toggle" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={18} />
              {cart.length > 0 && <span className="mp-cart-count">{cart.length}</span>}
            </button>
            <button className="mp-btn-home" onClick={handleHomeClick}>
              {user ? <><Home size={14} /> Dashboard</> : <><Home size={14} /> Home</>}
            </button>
          </div>
        </div>
      </header>

      {/* Category Navigation */}
      <CategoryNav
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categoryCounts={categoryCounts}
      />

      <section className="mp-hero-panel">
        <div className="mp-hero-copy">
          <p className="mp-hero-kicker">LIVE MARKET PULSE</p>
          <h1>Rescue-worthy produce, premium sourcing flow.</h1>
          <p>
            Discover high-freshness lots, priority rescues, and transparent farmer trust signals in one interactive marketplace.
          </p>

          <div className="mp-quick-filters">
            <button className="mp-quick-chip urgent" onClick={() => applyQuickFilter('urgent')}>
              <AlertTriangle size={14} /> Urgent Rescue
            </button>
            <button className="mp-quick-chip" onClick={() => applyQuickFilter('organic')}>
              <Sprout size={14} /> Organic Picks
            </button>
            <button className="mp-quick-chip" onClick={() => applyQuickFilter('budget')}>
              <Wallet size={14} /> Under Rs.120/kg
            </button>
            <button className="mp-quick-chip" onClick={() => applyQuickFilter('nearby')}>
              <MapPin size={14} /> Nearby Lots
            </button>
          </div>
        </div>

        <div className="mp-pulse-grid">
          <article className="mp-pulse-card">
            <span className="mp-pulse-label"><Package size={14} /> Listings Visible</span>
            <strong>{filteredListings.length.toLocaleString()}</strong>
            <small>Actively matched to current filters</small>
          </article>
          <article className="mp-pulse-card alert">
            <span className="mp-pulse-label"><Clock size={14} /> Time-Sensitive</span>
            <strong>{marketplacePulse.urgent.toLocaleString()}</strong>
            <small>Need immediate rescue actions</small>
          </article>
          <article className="mp-pulse-card">
            <span className="mp-pulse-label"><Wallet size={14} /> Avg Market Price</span>
            <strong>{marketplacePulse.avgPrice > 0 ? formatPrice(marketplacePulse.avgPrice) : 'N/A'}</strong>
            <small>Per kg across visible listings</small>
          </article>
          <article className="mp-pulse-card impact">
            <span className="mp-pulse-label"><UtensilsCrossed size={14} /> Meal Potential</span>
            <strong>{marketplacePulse.mealsPotential.toLocaleString()}</strong>
            <small>Projected support from current inventory</small>
          </article>
        </div>
      </section>

      {/* Main Content */}
      <main className="mp-main">
        <div className="mp-container">
          {/* View Controls */}
          <div className="mp-view-controls">
            <span className="mp-results-count">{filteredListings.length} products found</span>
            <div className="mp-view-meta">
              {activeFilterCount > 0 ? (
                <span className="mp-filter-pill">{activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}</span>
              ) : (
                <span className="mp-filter-pill neutral">No active filters</span>
              )}
            </div>
            <div className="mp-view-buttons">
              <button
                className={`mp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`mp-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <Menu size={16} />
              </button>
            </div>
          </div>

          {/* NGO Rescue View */}
          {(user?.role === 'ngo' || user?.role === 'food_bank') && activeCategory === 'ngo_rescue' && (
            <NGORescueView listings={listings} onRescue={handleRescue} />
          )}

          {/* Products Grid */}
          <div className={`mp-products-${viewMode}`}>
            {filteredListings.length === 0 ? (
              <div className="mp-no-results">
                <span className="mp-no-results-icon"><Search size={40} /></span>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search query</p>
              </div>
            ) : (
              filteredListings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  onViewDetails={setSelectedListing}
                  onAddToCart={addToCart}
                  onQuickRescue={handleRescue}
                  userRole={user?.role}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Sidebars */}
      <FiltersSidebar filters={filters} onFiltersChange={setFilters} isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} />

      <CartSidebar
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
      />

      {/* Product Detail Modal */}
      {selectedListing && (
        <ProductDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onAddToCart={addToCart}
          onRescue={handleRescue}
          userRole={user?.role}
        />
      )}

      {/* Overlay */}
      {(isFiltersOpen || isCartOpen) && (
        <div
          className="mp-sidebar-overlay"
          onClick={() => {
            setIsFiltersOpen(false);
            setIsCartOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Marketplace;