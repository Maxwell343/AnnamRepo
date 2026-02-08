// src/components/Marketplace.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Marketplace.css';
import type {
  MarketplaceListing,
  ListingCategory,
  ProductType,
  FreshnessLevel,
  MarketplaceFilters,
  UserRole,
  CartItem,
  SpoilageIndicator,
  User,
  RescuePriority,
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

const getCategoryIcon = (category: ListingCategory): string => {
  const icons: Record<ListingCategory, string> = {
    fresh_produce: '🥬',
    near_expiry: '⏰',
    surplus: '📦',
    ngo_rescue: '🤝',
    bulk_processing: '🏭',
    flash_sale: '⚡',
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

const getProductIcon = (type: ProductType): string => {
  const icons: Record<ProductType, string> = {
    Vegetable: '🥬',
    Fruit: '🍎',
    Grain: '🌾',
    Dairy: '🥛',
    Pulses: '🫘',
    Spices: '🌶️',
    Other: '📦',
  };
  return icons[type];
};

// ============================================
// MOCK DATA GENERATOR (DEPRECATED - Using real API data)
// ============================================

// Kept for reference but no longer used - marketplace now fetches from API
/* 
const generateMockListings = (): MarketplaceListing[] => {
  const createFarmer = (
    id: string,
    name: string,
    farmName: string,
    district: string,
    state: string,
    specializations: ProductType[]
  ): Farmer => ({
    id,
    name,
    farmName,
    location: {
      lat: 28.6139 + Math.random() * 2,
      lng: 77.209 + Math.random() * 2,
      address: `${farmName}, ${district}`,
      district,
      state,
      pincode: '110001',
    },
    certifications: ['FSSAI', 'Organic Certified'].slice(0, Math.floor(Math.random() * 3)),
    specializations,
    trustIndicator: {
      reliabilityScore: 80 + Math.floor(Math.random() * 20),
      totalTransactions: 50 + Math.floor(Math.random() * 200),
      successfulDeliveries: 45 + Math.floor(Math.random() * 180),
      onTimeRate: 85 + Math.floor(Math.random() * 15),
      qualityRating: 4.0 + Math.random() * 1,
      responseTime: 'Usually responds in 1h',
      verificationBadges: ['Verified Farmer'],
    },
    totalListings: 20 + Math.floor(Math.random() * 50),
    activeListings: 5 + Math.floor(Math.random() * 10),
    impactStats: {
      totalFoodSaved: 1000 + Math.floor(Math.random() * 5000),
      mealsProvided: 3000 + Math.floor(Math.random() * 15000),
      carbonSaved: 500 + Math.floor(Math.random() * 2500),
    },
  });

  const listings: MarketplaceListing[] = [
    {
      id: '1',
      farmerId: 'f1',
      farmer: createFarmer('f1', 'Ramesh Kumar', 'Green Valley Organics', 'Sonipat', 'Haryana', ['Vegetable', 'Fruit']),
      title: 'Fresh Organic Tomatoes',
      description: 'Farm-fresh organic tomatoes, perfect for salads and cooking. Harvested this morning.',
      productType: 'Vegetable',
      variety: 'Desi Tomato',
      quantity: 500,
      availableQuantity: 450,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      shelfLife: 7,
      expiryDate: new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(
        new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        7
      ),
      pricing: {
        originalPrice: 40,
        currentPrice: 35,
        unit: 'kg',
        minOrderQuantity: 2,
        bulkDiscount: { minQuantity: 50, discountPercent: 15 },
      },
      sellingMode: 'sell',
      location: {
        lat: 28.6139,
        lng: 77.209,
        address: 'Green Valley Farm, Sonipat',
        district: 'Sonipat',
        state: 'Haryana',
        pincode: '131001',
      },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 50,
      categories: ['fresh_produce'],
      tags: ['organic', 'fresh', 'local'],
      isOrganic: true,
      isCertified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 234,
      aiQualityScore: 92,
      suggestedRouting: 'direct_sale',
      distanceFromUser: 12.5,
      rescuePriority: 'low',
      estimatedMeals: 1500,
    },
    {
      id: '2',
      farmerId: 'f2',
      farmer: createFarmer('f2', 'Priya Devi', 'Sunshine Farms', 'Gurugram', 'Haryana', ['Fruit']),
      title: 'Ripe Mangoes - Urgent Sale',
      description: 'Delicious Alphonso mangoes, fully ripe and ready to eat. Limited time offer!',
      productType: 'Fruit',
      variety: 'Alphonso',
      quantity: 200,
      availableQuantity: 180,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      shelfLife: 4,
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(
        new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        4
      ),
      pricing: {
        originalPrice: 350,
        currentPrice: 250,
        unit: 'kg',
        minOrderQuantity: 1,
        bulkDiscount: { minQuantity: 20, discountPercent: 20 },
      },
      sellingMode: 'auto_donate',
      autoDonateThreshold: 1,
      location: {
        lat: 28.4595,
        lng: 77.0266,
        address: 'Sunshine Farms, Gurugram',
        district: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
      },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 30,
      categories: ['near_expiry', 'flash_sale'],
      tags: ['urgent', 'seasonal', 'premium'],
      isOrganic: false,
      isCertified: true,
      status: 'flash_sale',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 567,
      aiQualityScore: 85,
      suggestedRouting: 'flash_sale',
      distanceFromUser: 8.2,
      rescuePriority: 'high',
      estimatedMeals: 600,
    },
    {
      id: '3',
      farmerId: 'f3',
      farmer: createFarmer('f3', 'Vikram Singh', 'Heritage Orchards', 'Mohali', 'Punjab', ['Grain', 'Pulses']),
      title: 'Premium Basmati Rice',
      description: 'Aged Basmati rice, long grain, aromatic. Perfect for biryanis and special occasions.',
      productType: 'Grain',
      variety: 'Basmati 1121',
      quantity: 1000,
      availableQuantity: 950,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      shelfLife: 365,
      expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        365
      ),
      pricing: {
        originalPrice: 120,
        currentPrice: 110,
        unit: 'kg',
        minOrderQuantity: 5,
        bulkDiscount: { minQuantity: 100, discountPercent: 10 },
      },
      sellingMode: 'sell',
      location: {
        lat: 30.7046,
        lng: 76.7179,
        address: 'Heritage Orchards, Mohali',
        district: 'Mohali',
        state: 'Punjab',
        pincode: '160055',
      },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 200,
      categories: ['fresh_produce', 'bulk_processing'],
      tags: ['premium', 'aged', 'aromatic'],
      isOrganic: false,
      isCertified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 789,
      aiQualityScore: 95,
      suggestedRouting: 'direct_sale',
      distanceFromUser: 250,
      rescuePriority: 'low',
      estimatedMeals: 4000,
    },
    {
      id: '4',
      farmerId: 'f4',
      farmer: createFarmer('f4', 'Lakshmi Bai', 'Village Harvest', 'Lucknow', 'Uttar Pradesh', ['Vegetable']),
      title: 'Fresh Spinach - Rescue Needed',
      description: 'Fresh leafy spinach, highly nutritious. Needs immediate pickup to prevent waste.',
      productType: 'Vegetable',
      variety: 'Palak',
      quantity: 100,
      availableQuantity: 95,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      shelfLife: 2,
      expiryDate: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(
        new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        2
      ),
      pricing: {
        originalPrice: 40,
        currentPrice: 15,
        unit: 'kg',
        minOrderQuantity: 5,
      },
      sellingMode: 'donate',
      location: {
        lat: 26.8467,
        lng: 80.9462,
        address: 'Village Harvest, Lucknow',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        pincode: '226001',
      },
      deliveryAvailable: false,
      pickupAvailable: true,
      deliveryRadius: 0,
      categories: ['ngo_rescue', 'near_expiry'],
      tags: ['urgent', 'leafy', 'rescue'],
      isOrganic: true,
      isCertified: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 45,
      aiQualityScore: 75,
      suggestedRouting: 'ngo',
      distanceFromUser: 5.3,
      rescuePriority: 'critical',
      estimatedMeals: 300,
    },
    {
      id: '5',
      farmerId: 'f5',
      farmer: createFarmer('f5', 'Mohammed Ismail', 'Desert Bloom', 'Jaipur', 'Rajasthan', ['Spices']),
      title: 'Organic Red Chillies',
      description: 'Sun-dried organic red chillies with intense flavor and aroma.',
      productType: 'Spices',
      variety: 'Guntur',
      quantity: 150,
      availableQuantity: 140,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      shelfLife: 180,
      expiryDate: new Date(Date.now() + 175 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        180
      ),
      pricing: {
        originalPrice: 300,
        currentPrice: 280,
        unit: 'kg',
        minOrderQuantity: 1,
        bulkDiscount: { minQuantity: 25, discountPercent: 12 },
      },
      sellingMode: 'sell',
      location: {
        lat: 26.9124,
        lng: 75.7873,
        address: 'Desert Bloom Farms, Jaipur',
        district: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 500,
      categories: ['fresh_produce', 'bulk_processing'],
      tags: ['organic', 'spicy', 'long-shelf'],
      isOrganic: true,
      isCertified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 321,
      aiQualityScore: 94,
      suggestedRouting: 'direct_sale',
      distanceFromUser: 280,
      rescuePriority: 'low',
      estimatedMeals: 2000,
    },
    {
      id: '6',
      farmerId: 'f6',
      farmer: createFarmer('f6', 'Anita Sharma', 'Fresh Dairy Farm', 'Delhi', 'Delhi', ['Dairy']),
      title: 'Farm Fresh Paneer',
      description: 'Soft and creamy paneer made from fresh buffalo milk. Made today.',
      productType: 'Dairy',
      variety: 'Buffalo Milk',
      quantity: 50,
      availableQuantity: 40,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      shelfLife: 3,
      expiryDate: new Date(Date.now() + 2.8 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(
        new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        3
      ),
      pricing: {
        originalPrice: 400,
        currentPrice: 380,
        unit: 'kg',
        minOrderQuantity: 0.5,
      },
      sellingMode: 'flexible',
      autoDonateThreshold: 1,
      location: {
        lat: 28.7041,
        lng: 77.1025,
        address: 'Fresh Dairy Farm, North Delhi',
        district: 'North Delhi',
        state: 'Delhi',
        pincode: '110085',
      },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 25,
      categories: ['fresh_produce', 'near_expiry'],
      tags: ['dairy', 'fresh', 'local'],
      isOrganic: false,
      isCertified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 189,
      aiQualityScore: 88,
      suggestedRouting: 'direct_sale',
      distanceFromUser: 3.2,
      rescuePriority: 'medium',
      estimatedMeals: 120,
    },
  ];

  return listings;
};
*/

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
              {category === 'all' ? '🏠' : getCategoryIcon(category as ListingCategory)}
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
  userRole?: UserRole;
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
        {isFlashSale && <span className="mp-badge mp-badge-flash">⚡ Flash Sale</span>}
        {isRescuePriority && <span className="mp-badge mp-badge-rescue">🚨 Rescue</span>}
        {listing.isOrganic && <span className="mp-badge mp-badge-organic">🌿 Organic</span>}
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

        {/* Farmer Info */}
        <div className="mp-farmer-info">
          <div className="mp-farmer-avatar">{listing.farmer.name.charAt(0)}</div>
          <div className="mp-farmer-details">
            <span className="mp-farmer-name">{listing.farmer.name}</span>
            <span className="mp-farmer-location">
              📍 {listing.farmer.location.district}
              {listing.distanceFromUser && ` • ${formatDistance(listing.distanceFromUser)}`}
            </span>
          </div>
          <div className="mp-farmer-rating">⭐ {listing.farmer.trustIndicator.qualityRating.toFixed(1)}</div>
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
            <span>🍽️ ~{listing.estimatedMeals.toLocaleString()} meals potential</span>
          </div>
        )}

        {/* Actions */}
        <div className="mp-card-actions">
          {userRole === 'ngo' || userRole === 'food_bank' ? (
            <button className="mp-btn-rescue" onClick={() => onQuickRescue?.(listing)}>
              🤝 Quick Rescue
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
        <h3>🎯 Filters</h3>
        <button className="mp-close-filters" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="mp-filters-content">
        {/* Distance */}
        <div className="mp-filter-group">
          <h4>📍 Distance</h4>
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
          <h4>💰 Price Range</h4>
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
          <h4>🥬 Product Type</h4>
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
          <h4>⏰ Freshness Level</h4>
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
          <h4>✅ Certifications</h4>
          <label className="mp-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.isOrganic || false}
              onChange={(e) => onFiltersChange({ ...filters, isOrganic: e.target.checked })}
            />
            <span>🌿 Organic Only</span>
          </label>
          <label className="mp-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.isCertified || false}
              onChange={(e) => onFiltersChange({ ...filters, isCertified: e.target.checked })}
            />
            <span>📜 FSSAI Certified</span>
          </label>
        </div>

        {/* Sort By */}
        <div className="mp-filter-group">
          <h4>📊 Sort By</h4>
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
  userRole?: UserRole;
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

  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="mp-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="mp-modal-content">
          <div className="mp-modal-left">
            <div className="mp-modal-image">
              {primaryImage && !imageError ? (
                <img src={primaryImage} alt={listing.title} onError={() => setImageError(true)} />
              ) : (
                <div className="mp-image-placeholder large">
                  <span className="mp-product-emoji">{getProductIcon(listing.productType)}</span>
                </div>
              )}
            </div>

            <div className="mp-modal-badges">
              {listing.isOrganic && <span className="mp-badge mp-badge-organic">🌿 Organic</span>}
              {listing.isCertified && <span className="mp-badge mp-badge-certified">📜 FSSAI Certified</span>}
              {listing.categories.includes('flash_sale') && (
                <span className="mp-badge mp-badge-flash">⚡ Flash Sale</span>
              )}
            </div>
          </div>

          <div className="mp-modal-right">
            <div className="mp-modal-header">
              <h2>{listing.title}</h2>
              <div className="mp-product-meta">
                <span>{listing.productType}</span>
                {listing.variety && <span>• {listing.variety}</span>}
              </div>
            </div>

            <FreshnessIndicator indicator={listing.spoilageIndicator} />

            <div className="mp-modal-tabs">
              <button
                className={`mp-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                📋 Details
              </button>
              <button
                className={`mp-tab ${activeTab === 'farmer' ? 'active' : ''}`}
                onClick={() => setActiveTab('farmer')}
              >
                👨‍🌾 Farmer
              </button>
              <button
                className={`mp-tab ${activeTab === 'impact' ? 'active' : ''}`}
                onClick={() => setActiveTab('impact')}
              >
                🌍 Impact
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
                      {listing.pickupAvailable && <span className="mp-option">📍 Pickup Available</span>}
                      {listing.deliveryAvailable && (
                        <span className="mp-option">🚚 Delivery within {listing.deliveryRadius}km</span>
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
                        📍 {listing.farmer.location.district}, {listing.farmer.location.state}
                      </p>
                    </div>
                  </div>

                  <div className="mp-trust-indicators">
                    <div className="mp-trust-score">
                      <span className="mp-score">{listing.farmer.trustIndicator.reliabilityScore}</span>
                      <span className="mp-label">Reliability</span>
                    </div>
                    <div className="mp-trust-stat">
                      <span className="mp-value">⭐ {listing.farmer.trustIndicator.qualityRating.toFixed(1)}</span>
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
                        ✓ {badge}
                      </span>
                    ))}
                  </div>

                  {listing.farmer.certifications.length > 0 && (
                    <div className="mp-farmer-certifications">
                      <h4>Certifications</h4>
                      <div className="mp-cert-list">
                        {listing.farmer.certifications.map((cert: string, idx: number) => (
                          <span key={idx} className="mp-cert-badge">
                            📜 {cert}
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
                    <h4>🍽️ Potential Meals</h4>
                    <span className="mp-impact-value">{listing.estimatedMeals?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="mp-impact-card">
                    <h4>🌱 Carbon Saved</h4>
                    <span className="mp-impact-value">{Math.round(listing.availableQuantity * 0.5)} kg CO₂</span>
                  </div>
                  <div className="mp-impact-card">
                    <h4>💧 Water Saved</h4>
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
            <div className="mp-modal-pricing">
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
                    💰 Order {bulkDiscount.minQuantity}+ {listing.unit} and save {bulkDiscount.discountPercent}%!
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
                    🤝 Rescue This Produce
                  </button>
                ) : (
                  <>
                    <button className="mp-btn-cart" onClick={() => onAddToCart(listing, quantity)}>
                      🛒 Add to Cart
                    </button>
                    <button className="mp-btn-buy-now">⚡ Buy Now</button>
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

  return (
    <aside className={`mp-cart-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="mp-cart-header">
        <h3>🛒 Your Cart</h3>
        <button className="mp-close-cart" onClick={onClose}>
          ✕
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="mp-cart-empty">
          <span className="mp-empty-icon">🛒</span>
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
                  <div className="mp-item-quantity">
                    <button onClick={() => onUpdateQuantity(item.listing.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.listing.id, item.quantity + 1)}>+</button>
                  </div>
                  <span className="mp-item-price">{formatPrice(item.priceAtAdd * item.quantity)}</span>
                  <button className="mp-remove-item" onClick={() => onRemoveItem(item.listing.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mp-cart-summary">
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
            <span className="mp-impact-label">🌍 Your Impact</span>
            <div className="mp-impact-mini-stats">
              <span>~{Math.round(subtotal / 50)} meals supported</span>
              <span>~{Math.round(subtotal * 0.1)} kg CO₂ saved</span>
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
          <h2>🚨 Priority Rescue Queue</h2>
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
                {listing.rescuePriority === 'critical' ? '🔴' : '🟠'}
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
                <p className="mp-rescue-location">📍 {listing.location.district}</p>
                <p className="mp-rescue-meals">🍽️ ~{listing.estimatedMeals?.toLocaleString()} meals</p>
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
              🤝 Rescue Now
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

  // State
  const [user, setUser] = useState<User | null>(null);
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
    sortBy: 'freshness',
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

    // Calculate expiry date (default 7 days from now)
    const shelfLife = 7;
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
      spoilageIndicator: calculateSpoilageIndicator(harvestDate.toISOString(), shelfLife),
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
      categories: ['fresh_produce'],
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
      rescuePriority: 'low',
      estimatedMeals: Math.round(((typeof apiListing.quantity === 'string' ? parseFloat(apiListing.quantity) : apiListing.quantity) || 0) * 5),
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
        console.log('[MARKETPLACE] Fetching listings from API...');
        const response = await fetch('http://localhost:8000/api/listings');
        console.log('[MARKETPLACE] API Response Status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[MARKETPLACE] API Response Data:', data);
          
          if (data.listings && Array.isArray(data.listings) && data.listings.length > 0) {
            // Map all API listings to MarketplaceListing format
            const mappedListings = data.listings.map((apiListing: any) => {
              console.log('[MARKETPLACE] Mapping listing:', apiListing);
              return mapApiListingToMarketplace(apiListing);
            });
            setListings(mappedListings);
            console.log(`[MARKETPLACE] ✅ Loaded ${mappedListings.length} listings from backend`);
          } else {
            // No listings from API - show empty state, not mock data
            setListings([]);
            console.log('[MARKETPLACE] ⚠️ No listings available from backend. Response:', data);
          }
        } else {
          // API error - show empty state
          const errorText = await response.text();
          setListings([]);
          console.error('[MARKETPLACE] ❌ Failed to fetch listings. Status:', response.status, 'Error:', errorText);
        }
      } catch (error) {
        // Network error - show empty state
        console.error('[MARKETPLACE] ❌ Network error loading listings:', error);
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
      alert(`Rescue confirmed for: ${listing.title}\nQuantity: ${listing.availableQuantity} ${listing.unit}`);
    },
    [user, navigate]
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
                <span className="mp-brand-icon">🌾</span>
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
            <span className="mp-loader-icon">🌾</span>
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
              <span className="mp-brand-icon">🌾</span>
              <div className="mp-brand-text">
                <span className="mp-brand-name">Annam</span>
                <span className="mp-brand-tagline">Marketplace</span>
              </div>
            </div>
          </div>

          <div className="mp-header-center">
            <div className="mp-search-box">
              <span className="mp-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search products, farmers, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="mp-clear-search" onClick={() => setSearchQuery('')}>
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="mp-header-right">
            <button className="mp-btn-filters" onClick={() => setIsFiltersOpen(true)}>
              🎯 Filters
            </button>
            <button className="mp-btn-cart-toggle" onClick={() => setIsCartOpen(true)}>
              🛒
              {cart.length > 0 && <span className="mp-cart-count">{cart.length}</span>}
            </button>
            <button className="mp-btn-home" onClick={handleHomeClick}>
              {user ? '🏠 Dashboard' : '🏠 Home'}
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

      {/* Main Content */}
      <main className="mp-main">
        <div className="mp-container">
          {/* View Controls */}
          <div className="mp-view-controls">
            <span className="mp-results-count">{filteredListings.length} products found</span>
            <div className="mp-view-buttons">
              <button
                className={`mp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ▦
              </button>
              <button
                className={`mp-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ☰
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
                <span className="mp-no-results-icon">🔍</span>
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