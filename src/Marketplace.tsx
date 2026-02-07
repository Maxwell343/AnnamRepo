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
  Location
} from './types/marketplace';

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
    urgencyMessage
  };
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

type ApiDonationListing = {
  id: string;
  farmer_id?: string | number;
  farmer_name?: string;
  title: string;
  description?: string;
  type?: ProductType | string;
  quantity?: string | number;
  price?: number | string | null;
  image?: string;
  created_at?: string;
  updated_at?: string;
  expiry?: string;
  expiry_date?: string;
  pickup_address?: string;
  status?: string;
};

const parseLatLng = (value?: string): { lat: number; lng: number } | null => {
  if (!value) return null;

  // Supports formats like:
  // - "12.9716, 77.5946"
  // - "Some address (12.9716, 77.5946)"
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const parseExpiryDays = (expiryText?: string): number => {
  if (!expiryText) return 2;
  const raw = expiryText.trim().toLowerCase();
  const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return 2;
  const value = Number(numMatch[1]);
  if (!Number.isFinite(value) || value <= 0) return 2;
  if (raw.includes('hour')) return Math.max(1, Math.ceil(value / 24));
  if (raw.includes('minute')) return 1;
  return Math.max(1, Math.ceil(value));
};

const mapDonationToMarketplaceListing = (listing: ApiDonationListing): MarketplaceListing => {
  const createdAt = listing.created_at || new Date().toISOString();
  const updatedAt = listing.updated_at || createdAt;
  const shelfLife = parseExpiryDays(listing.expiry_date || listing.expiry);
  const expiryDate = new Date(new Date(createdAt).getTime() + shelfLife * 24 * 60 * 60 * 1000).toISOString();
  const spoilageIndicator = calculateSpoilageIndicator(createdAt, shelfLife);

  const rawPrice = typeof listing.price === 'string' ? Number(listing.price) : (listing.price ?? 0);
  const price = Number.isFinite(rawPrice) ? Math.max(0, rawPrice) : 0;

  const coords = parseLatLng(listing.pickup_address);
  const location: Location = {
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
    address: listing.pickup_address || 'Pickup location available after claim',
    district: 'Unknown',
    state: 'Unknown',
    pincode: '000000'
  };

  const quantityNum = typeof listing.quantity === 'number' ? listing.quantity : Number(listing.quantity || 0);

  const productType: ProductType = (
    listing.type === 'Vegetable' || listing.type === 'Fruit' || listing.type === 'Grain' || listing.type === 'Dairy' ||
    listing.type === 'Pulses' || listing.type === 'Spices' || listing.type === 'Other'
  ) ? (listing.type as ProductType) : 'Other';

  const farmerId = String(listing.farmer_id ?? 'unknown');
  const farmerName = listing.farmer_name || 'Farmer';

  return {
    id: listing.id,
    farmerId,
    farmer: {
      id: farmerId,
      name: farmerName,
      farmName: 'Farm',
      location,
      certifications: [],
      specializations: [productType],
      trustIndicator: {
        reliabilityScore: 80,
        totalTransactions: 0,
        successfulDeliveries: 0,
        onTimeRate: 0,
        qualityRating: 4.0,
        responseTime: 'Usually responds in 2h',
        verificationBadges: []
      },
      totalListings: 0,
      activeListings: 0,
      impactStats: {
        totalFoodSaved: 0,
        mealsProvided: 0,
        carbonSaved: 0
      }
    },
    title: listing.title,
    description: listing.description || '',
    productType,
    quantity: Number.isFinite(quantityNum) && quantityNum > 0 ? quantityNum : 0,
    availableQuantity: Number.isFinite(quantityNum) && quantityNum > 0 ? quantityNum : 0,
    unit: 'kg',
    images: listing.image ? [listing.image] : [],
    harvestDate: createdAt,
    shelfLife,
    expiryDate,
    spoilageIndicator,
    pricing: {
      originalPrice: price,
      currentPrice: price,
      unit: 'kg',
      minOrderQuantity: 1
    },
    sellingMode: price > 0 ? 'sell' : 'donate',
    autoDonateThreshold: 0,
    location,
    deliveryAvailable: false,
    pickupAvailable: true,
    deliveryRadius: 0,
    categories: ['ngo_rescue'],
    tags: [],
    isOrganic: false,
    isCertified: false,
    status: 'active',
    createdAt,
    updatedAt,
    viewCount: 0,
    aiQualityScore: 0,
    suggestedRouting: 'ngo',
    distanceFromUser: 0,
    rescuePriority: spoilageIndicator.riskLevel === 'critical' ? 'critical' : spoilageIndicator.riskLevel === 'urgent' ? 'high' : 'low',
    estimatedMeals: 0
  };
};

const getCategoryIcon = (category: ListingCategory): string => {
  const icons: Record<ListingCategory, string> = {
    fresh_produce: '🥬',
    near_expiry: '⏰',
    surplus: '📦',
    ngo_rescue: '🤝',
    bulk_processing: '🏭',
    flash_sale: '⚡'
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
    flash_sale: 'Flash Sale'
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
    Other: '📦'
  };
  return icons[type];
};

// ============================================
// MOCK DATA (Replace with API calls)
// ============================================

const generateMockListings = (): MarketplaceListing[] => {
  const listings: MarketplaceListing[] = [
    {
      id: '1',
      farmerId: 'f1',
      farmer: {
        id: 'f1',
        name: 'Ramesh Kumar',
        farmName: 'Green Valley Organics',
        profileImage: '',
        location: { lat: 28.6139, lng: 77.2090, address: 'Village Khera, Sonipat', district: 'Sonipat', state: 'Haryana', pincode: '131001' },
        certifications: ['Organic Certified', 'FSSAI'],
        specializations: ['Vegetable', 'Fruit'],
        trustIndicator: {
          reliabilityScore: 94,
          totalTransactions: 156,
          successfulDeliveries: 152,
          onTimeRate: 97,
          qualityRating: 4.8,
          responseTime: 'Usually responds in 1h',
          verificationBadges: ['Verified Farmer', 'Top Seller']
        },
        totalListings: 45,
        activeListings: 8,
        impactStats: { totalFoodSaved: 2500, mealsProvided: 8333, carbonSaved: 1250 }
      },
      title: 'Bulk Tomatoes (Processing Grade)',
      description: 'Fresh bulk tomatoes suitable for processing. Limited time pricing due to near-expiry window.',
      productType: 'Vegetable',
      variety: 'Tomato',
      quantity: 1200,
      availableQuantity: 1200,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      shelfLife: 3,
      expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), 3),
      pricing: {
        originalPrice: 35,
        currentPrice: 25,
        unit: 'kg',
        minOrderQuantity: 100,
        bulkDiscount: { minQuantity: 500, discountPercent: 20 },
        smartSuggestion: 22,
        autoReductionSchedule: [
          { daysBeforeExpiry: 2, reductionPercent: 20 },
          { daysBeforeExpiry: 1, reductionPercent: 40 }
        ]
      },
      sellingMode: 'auto_donate',
      autoDonateThreshold: 1,
      location: { lat: 28.4595, lng: 77.0266, address: 'Sector 56, Gurugram', district: 'Gurugram', state: 'Haryana', pincode: '122011' },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 100,
      categories: ['near_expiry', 'flash_sale', 'bulk_processing'],
      tags: ['bulk', 'processing-grade', 'urgent'],
      isOrganic: false,
      isCertified: true,
      status: 'flash_sale',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 567,
      aiQualityScore: 78,
      suggestedRouting: 'flash_sale',
      distanceFromUser: 8.2,
      rescuePriority: 'high',
      estimatedMeals: 6000
    },
    {
      id: '3',
      farmerId: 'f3',
      farmer: {
        id: 'f3',
        name: 'Vikram Singh',
        farmName: 'Heritage Orchards',
        profileImage: '',
        location: { lat: 30.7333, lng: 76.7794, address: 'Mohali Farms', district: 'Mohali', state: 'Punjab', pincode: '160055' },
        certifications: ['Organic Certified', 'FSSAI', 'GAP Certified'],
        specializations: ['Fruit'],
        trustIndicator: {
          reliabilityScore: 96,
          totalTransactions: 234,
          successfulDeliveries: 230,
          onTimeRate: 98,
          qualityRating: 4.9,
          responseTime: 'Usually responds in 30m',
          verificationBadges: ['Verified Farmer', 'Top Seller', 'Premium Partner']
        },
        totalListings: 67,
        activeListings: 12,
        impactStats: { totalFoodSaved: 5200, mealsProvided: 17333, carbonSaved: 2600 }
      },
      title: 'Premium Alphonso Mangoes',
      description: 'Export-quality Alphonso mangoes, naturally ripened. Sweet aroma and rich flavor.',
      productType: 'Fruit',
      variety: 'Alphonso',
      quantity: 300,
      availableQuantity: 280,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      shelfLife: 10,
      expiryDate: new Date(Date.now() + 9.5 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), 10),
      pricing: {
        originalPrice: 450,
        currentPrice: 420,
        unit: 'kg',
        minOrderQuantity: 2,
        bulkDiscount: { minQuantity: 20, discountPercent: 10 },
        smartSuggestion: 400
      },
      sellingMode: 'sell',
      location: { lat: 30.7333, lng: 76.7794, address: 'Mohali Farms', district: 'Mohali', state: 'Punjab', pincode: '160055' },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 200,
      categories: ['fresh_produce'],
      tags: ['premium', 'export-quality', 'seasonal'],
      isOrganic: true,
      isCertified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 892,
      aiQualityScore: 98,
      suggestedRouting: 'direct_sale',
      distanceFromUser: 245,
      rescuePriority: 'low',
      estimatedMeals: 933
    },
    {
      id: '4',
      farmerId: 'f4',
      farmer: {
        id: 'f4',
        name: 'Lakshmi Bai',
        farmName: 'Village Harvest Co-op',
        profileImage: '',
        location: { lat: 26.8467, lng: 80.9462, address: 'Lucknow Rural', district: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001' },
        certifications: ['FSSAI'],
        specializations: ['Vegetable', 'Pulses'],
        trustIndicator: {
          reliabilityScore: 82,
          totalTransactions: 67,
          successfulDeliveries: 62,
          onTimeRate: 90,
          qualityRating: 4.3,
          responseTime: 'Usually responds in 3h',
          verificationBadges: ['Verified Farmer']
        },
        totalListings: 28,
        activeListings: 6,
        impactStats: { totalFoodSaved: 1200, mealsProvided: 4000, carbonSaved: 600 }
      },
      title: 'Fresh Spinach Bundle',
      description: 'Freshly harvested spinach leaves. Rich in iron and vitamins. Perfect for everyday cooking.',
      productType: 'Vegetable',
      variety: 'Palak',
      quantity: 200,
      availableQuantity: 180,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      shelfLife: 2,
      expiryDate: new Date(Date.now() + 1.75 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), 2),
      pricing: {
        originalPrice: 40,
        currentPrice: 28,
        unit: 'kg',
        minOrderQuantity: 2,
        smartSuggestion: 25,
        autoReductionSchedule: [
          { daysBeforeExpiry: 1, reductionPercent: 30 },
          { daysBeforeExpiry: 0.5, reductionPercent: 50 }
        ]
      },
      sellingMode: 'auto_donate',
      autoDonateThreshold: 0.5,
      location: { lat: 26.8467, lng: 80.9462, address: 'Lucknow Rural', district: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001' },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 30,
      categories: ['near_expiry', 'ngo_rescue'],
      tags: ['leafy-greens', 'urgent', 'local'],
      isOrganic: false,
      isCertified: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 156,
      aiQualityScore: 85,
      suggestedRouting: 'ngo',
      distanceFromUser: 5.3,
      rescuePriority: 'critical',
      estimatedMeals: 600
    },
    {
      id: '5',
      farmerId: 'f5',
      farmer: {
        id: 'f5',
        name: 'Mohammed Ismail',
        farmName: 'Desert Bloom Farms',
        profileImage: '',
        location: { lat: 26.9124, lng: 75.7873, address: 'Jaipur Outskirts', district: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
        certifications: ['Organic Certified', 'FSSAI'],
        specializations: ['Spices', 'Pulses'],
        trustIndicator: {
          reliabilityScore: 91,
          totalTransactions: 145,
          successfulDeliveries: 140,
          onTimeRate: 96,
          qualityRating: 4.7,
          responseTime: 'Usually responds in 1h',
          verificationBadges: ['Verified Farmer', 'Spice Specialist']
        },
        totalListings: 52,
        activeListings: 9,
        impactStats: { totalFoodSaved: 3100, mealsProvided: 10333, carbonSaved: 1550 }
      },
      title: 'Organic Red Chillies',
      description: 'Sun-dried organic red chillies with intense flavor. Perfect for all cuisines.',
      productType: 'Spices',
      variety: 'Guntur Chilli',
      quantity: 150,
      availableQuantity: 150,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      shelfLife: 180,
      expiryDate: new Date(Date.now() + 177 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), 180),
      pricing: {
        originalPrice: 280,
        currentPrice: 260,
        unit: 'kg',
        minOrderQuantity: 1,
        bulkDiscount: { minQuantity: 25, discountPercent: 12 },
        smartSuggestion: 255
      },
      sellingMode: 'sell',
      location: { lat: 26.9124, lng: 75.7873, address: 'Jaipur Outskirts', district: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryRadius: 500,
      categories: ['fresh_produce', 'bulk_processing'],
      tags: ['spicy', 'organic', 'long-shelf-life'],
      isOrganic: true,
      isCertified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 423,
      aiQualityScore: 95,
      suggestedRouting: 'direct_sale',
      distanceFromUser: 280,
      rescuePriority: 'low',
      estimatedMeals: 5000
    },
    {
      id: '6',
      farmerId: 'f6',
      farmer: {
        id: 'f6',
        name: 'Priya Sharma',
        farmName: 'Valley Fresh Dairy',
        profileImage: '',
        location: { lat: 28.7041, lng: 77.1025, address: 'Rohini Farms', district: 'North Delhi', state: 'Delhi', pincode: '110085' },
        certifications: ['FSSAI', 'ISO Certified'],
        specializations: ['Dairy'],
        trustIndicator: {
          reliabilityScore: 93,
          totalTransactions: 312,
          successfulDeliveries: 305,
          onTimeRate: 97,
          qualityRating: 4.8,
          responseTime: 'Usually responds in 45m',
          verificationBadges: ['Verified Farmer', 'Dairy Expert', 'Top Seller']
        },
        totalListings: 15,
        activeListings: 4,
        impactStats: { totalFoodSaved: 800, mealsProvided: 2666, carbonSaved: 400 }
      },
      title: 'Farm Fresh Paneer',
      description: 'Fresh cottage cheese made from pure buffalo milk. Soft and creamy texture.',
      productType: 'Dairy',
      variety: 'Buffalo Milk Paneer',
      quantity: 50,
      availableQuantity: 35,
      unit: 'kg',
      images: [],
      harvestDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      shelfLife: 3,
      expiryDate: new Date(Date.now() + 2.8 * 24 * 60 * 60 * 1000).toISOString(),
      spoilageIndicator: calculateSpoilageIndicator(new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), 3),
      pricing: {
        originalPrice: 380,
        currentPrice: 350,
        unit: 'kg',
        minOrderQuantity: 0.5,
        smartSuggestion: 340
      },
      sellingMode: 'flexible',
      autoDonateThreshold: 1,
      location: { lat: 28.7041, lng: 77.1025, address: 'Rohini Farms', district: 'North Delhi', state: 'Delhi', pincode: '110085' },
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
      estimatedMeals: 116
    }
  ];
  
  return listings;
};

// ============================================
// COMPONENTS
// ============================================

interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  location?: Location;
}

// Category Navigation Component
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
    'flash_sale'
  ];
  
  return (
    <nav className="category-nav">
      <div className="category-container">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-btn ${activeCategory === category ? 'active' : ''} ${category === 'flash_sale' ? 'flash' : ''}`}
            onClick={() => onCategoryChange(category)}
          >
            <span className="category-icon">
              {category === 'all' ? '🏠' : getCategoryIcon(category as ListingCategory)}
            </span>
            <span className="category-label">
              {category === 'all' ? 'All Products' : getCategoryLabel(category as ListingCategory)}
            </span>
            <span className="category-count">
              {categoryCounts[category] || 0}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// Freshness Indicator Component
const FreshnessIndicator: React.FC<{ indicator: SpoilageIndicator; compact?: boolean }> = ({ indicator, compact = false }) => {
  const progressWidth = `${indicator.percentageRemaining}%`;
  
  if (compact) {
    return (
      <div className="freshness-compact" style={{ backgroundColor: `${indicator.colorCode}20` }}>
        <span className="freshness-dot" style={{ backgroundColor: indicator.colorCode }} />
        <span className="freshness-text" style={{ color: indicator.colorCode }}>
          {indicator.urgencyMessage}
        </span>
      </div>
    );
  }
  
  return (
    <div className="freshness-indicator">
      <div className="freshness-header">
        <span className="freshness-label">Freshness</span>
        <span className="freshness-time" style={{ color: indicator.colorCode }}>
          {indicator.urgencyMessage}
        </span>
      </div>
      <div className="freshness-bar">
        <div
          className="freshness-progress"
          style={{
            width: progressWidth,
            backgroundColor: indicator.colorCode
          }}
        />
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard: React.FC<{
  listing: MarketplaceListing;
  onViewDetails: (listing: MarketplaceListing) => void;
  onAddToCart: (listing: MarketplaceListing, quantity: number) => void;
  onQuickRescue?: (listing: MarketplaceListing) => void;
  userRole?: UserRole;
}> = ({ listing, onViewDetails, onAddToCart, onQuickRescue, userRole }) => {
  const [quantity, setQuantity] = useState(listing.pricing.minOrderQuantity);
  const [imageFailed, setImageFailed] = useState(false);
  const hasDiscount = listing.pricing.currentPrice < listing.pricing.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - listing.pricing.currentPrice / listing.pricing.originalPrice) * 100)
    : 0;

  const primaryImage = listing.images?.find(Boolean);
  
  const isRescuePriority = listing.rescuePriority === 'critical' || listing.rescuePriority === 'high';
  const isFlashSale = listing.categories.includes('flash_sale');
  
  return (
    <div className={`product-card ${isRescuePriority ? 'rescue-priority' : ''} ${isFlashSale ? 'flash-sale' : ''}`}>
      {/* Badges */}
      <div className="card-badges">
        {isFlashSale && (
          <span className="badge badge-flash">⚡ Flash Sale</span>
        )}
        {isRescuePriority && (
          <span className="badge badge-rescue">🚨 Rescue Priority</span>
        )}
        {listing.isOrganic && (
          <span className="badge badge-organic">🌿 Organic</span>
        )}
        {hasDiscount && (
          <span className="badge badge-discount">-{discountPercent}%</span>
        )}
      </div>
      
      {/* Image */}
      <div className="card-image" onClick={() => onViewDetails(listing)}>
        {primaryImage && !imageFailed ? (
          <img
            src={primaryImage}
            alt={listing.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="image-placeholder">
            <span className="product-emoji">{getProductIcon(listing.productType)}</span>
          </div>
        )}
        <div className="card-overlay">
          <span>View Details</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="card-content">
        <div className="card-header">
          <h3 className="product-title" onClick={() => onViewDetails(listing)}>
            {listing.title}
          </h3>
          <div className="product-meta">
            <span className="product-type">{listing.productType}</span>
            {listing.variety && (
              <span className="product-variety">• {listing.variety}</span>
            )}
          </div>
        </div>
        
        {/* Freshness */}
        <FreshnessIndicator indicator={listing.spoilageIndicator} />
        
        {/* Farmer Info */}
        <div className="farmer-info" onClick={() => onViewDetails(listing)}>
          <div className="farmer-avatar">
            {listing.farmer.name.charAt(0)}
          </div>
          <div className="farmer-details">
            <span className="farmer-name">{listing.farmer.name}</span>
            <span className="farmer-location">
              📍 {listing.farmer.location.district}
              {listing.distanceFromUser && ` • ${formatDistance(listing.distanceFromUser)}`}
            </span>
          </div>
          <div className="farmer-rating">
            ⭐ {listing.farmer.trustIndicator.qualityRating}
          </div>
        </div>
        
        {/* Quantity & Price */}
        <div className="card-pricing">
          <div className="price-section">
            <span className="current-price">
              {formatPrice(listing.pricing.currentPrice)}
              <span className="price-unit">/{listing.pricing.unit}</span>
            </span>
            {hasDiscount && (
              <span className="original-price">
                {formatPrice(listing.pricing.originalPrice)}
              </span>
            )}
          </div>
          <div className="quantity-section">
            <span className="available-qty">
              {listing.availableQuantity} {listing.unit} available
            </span>
          </div>
        </div>
        
        {/* Estimated Impact */}
        {listing.estimatedMeals && (
          <div className="impact-preview">
            <span className="impact-text">
              🍽️ ~{listing.estimatedMeals.toLocaleString()} meals potential
            </span>
          </div>
        )}
        
        {/* Actions */}
        <div className="card-actions">
          {userRole === 'ngo' || userRole === 'food_bank' ? (
            <button
              className="btn-rescue"
              onClick={() => onQuickRescue?.(listing)}
            >
              🤝 Quick Rescue
            </button>
          ) : (
            <>
              <div className="quantity-input">
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(Math.max(listing.pricing.minOrderQuantity, quantity - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(listing.pricing.minOrderQuantity, parseInt(e.target.value) || 0))}
                  min={listing.pricing.minOrderQuantity}
                />
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(Math.min(listing.availableQuantity, quantity + 1))}
                >
                  +
                </button>
              </div>
              <button
                className="btn-add-cart"
                onClick={() => onAddToCart(listing, quantity)}
              >
                Add to Cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Filters Sidebar Component
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
      ? filters.productTypes.filter(t => t !== type)
      : [...filters.productTypes, type];
    onFiltersChange({ ...filters, productTypes: newTypes });
  };
  
  const toggleFreshness = (level: FreshnessLevel) => {
    const newLevels = filters.freshnessLevels.includes(level)
      ? filters.freshnessLevels.filter(l => l !== level)
      : [...filters.freshnessLevels, level];
    onFiltersChange({ ...filters, freshnessLevels: newLevels });
  };
  
  return (
    <aside className={`filters-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="filters-header">
        <h3>🎯 Filters</h3>
        <button className="close-filters" onClick={onClose}>✕</button>
      </div>
      
      <div className="filters-content">
        {/* Distance */}
        <div className="filter-group">
          <h4>📍 Distance</h4>
          <div className="distance-slider">
            <input
              type="range"
              min="1"
              max="500"
              value={filters.distanceRange}
              onChange={(e) => onFiltersChange({ ...filters, distanceRange: parseInt(e.target.value) })}
            />
            <span className="distance-value">Within {filters.distanceRange} km</span>
          </div>
        </div>
        
        {/* Price Range */}
        <div className="filter-group">
          <h4>💰 Price Range</h4>
          <div className="price-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange.min}
              onChange={(e) => onFiltersChange({
                ...filters,
                priceRange: { ...filters.priceRange, min: parseInt(e.target.value) || 0 }
              })}
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange.max}
              onChange={(e) => onFiltersChange({
                ...filters,
                priceRange: { ...filters.priceRange, max: parseInt(e.target.value) || 10000 }
              })}
            />
          </div>
        </div>
        
        {/* Product Types */}
        <div className="filter-group">
          <h4>🥬 Product Type</h4>
          <div className="filter-chips">
            {productTypes.map(type => (
              <button
                key={type}
                className={`filter-chip ${filters.productTypes.includes(type) ? 'active' : ''}`}
                onClick={() => toggleProductType(type)}
              >
                {getProductIcon(type)} {type}
              </button>
            ))}
          </div>
        </div>
        
        {/* Freshness */}
        <div className="filter-group">
          <h4>⏰ Freshness Level</h4>
          <div className="filter-chips">
            {freshnessLevels.map(level => (
              <button
                key={level}
                className={`filter-chip freshness-${level} ${filters.freshnessLevels.includes(level) ? 'active' : ''}`}
                onClick={() => toggleFreshness(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Certifications */}
        <div className="filter-group">
          <h4>✅ Certifications</h4>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.isOrganic || false}
              onChange={(e) => onFiltersChange({ ...filters, isOrganic: e.target.checked })}
            />
            <span>🌿 Organic Only</span>
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.isCertified || false}
              onChange={(e) => onFiltersChange({ ...filters, isCertified: e.target.checked })}
            />
            <span>📜 FSSAI Certified</span>
          </label>
        </div>
        
        {/* Sort By */}
        <div className="filter-group">
          <h4>📊 Sort By</h4>
          <select
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as any })}
            className="sort-select"
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
      
      <div className="filters-footer">
        <button
          className="btn-clear"
          onClick={() => onFiltersChange({
            categories: [],
            productTypes: [],
            freshnessLevels: [],
            priceRange: { min: 0, max: 10000 },
            distanceRange: 100,
            sortBy: 'freshness'
          })}
        >
          Clear All
        </button>
        <button className="btn-apply" onClick={onClose}>
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
  const [imageFailed, setImageFailed] = useState(false);

  const primaryImage = listing.images?.find(Boolean);
  
  const hasDiscount = listing.pricing.currentPrice < listing.pricing.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - listing.pricing.currentPrice / listing.pricing.originalPrice) * 100)
    : 0;
  
  const totalPrice = listing.pricing.currentPrice * quantity;
  
  // Check for bulk discount
  const bulkDiscount = listing.pricing.bulkDiscount;
  const hasBulkDiscount = bulkDiscount && quantity >= bulkDiscount.minQuantity;
  const finalPrice = hasBulkDiscount
    ? totalPrice * (1 - bulkDiscount.discountPercent / 100)
    : totalPrice;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="modal-content">
          <div className="modal-left">
            <div className="modal-image">
              {primaryImage && !imageFailed ? (
                <img
                  src={primaryImage}
                  alt={listing.title}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="image-placeholder large">
                  <span className="product-emoji">{getProductIcon(listing.productType)}</span>
                </div>
              )}
            </div>
            
            <div className="modal-badges">
              {listing.isOrganic && <span className="badge badge-organic">🌿 Organic</span>}
              {listing.isCertified && <span className="badge badge-certified">📜 FSSAI Certified</span>}
              {listing.categories.includes('flash_sale') && <span className="badge badge-flash">⚡ Flash Sale</span>}
            </div>
          </div>
          
          <div className="modal-right">
            <div className="modal-header">
              <h2>{listing.title}</h2>
              <div className="product-meta">
                <span>{listing.productType}</span>
                {listing.variety && <span>• {listing.variety}</span>}
              </div>
            </div>
            
            <FreshnessIndicator indicator={listing.spoilageIndicator} />
            
            <div className="modal-tabs">
              <button
                className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                📋 Details
              </button>
              <button
                className={`tab ${activeTab === 'farmer' ? 'active' : ''}`}
                onClick={() => setActiveTab('farmer')}
              >
                👨‍🌾 Farmer
              </button>
              <button
                className={`tab ${activeTab === 'impact' ? 'active' : ''}`}
                onClick={() => setActiveTab('impact')}
              >
                🌍 Impact
              </button>
            </div>
            
            <div className="modal-tab-content">
              {activeTab === 'details' && (
                <div className="details-tab">
                  <p className="description">{listing.description}</p>
                  
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Harvest Date</span>
                      <span className="detail-value">
                        {new Date(listing.harvestDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Shelf Life</span>
                      <span className="detail-value">{listing.shelfLife} days</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Available</span>
                      <span className="detail-value">{listing.availableQuantity} {listing.unit}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">{listing.location.district}, {listing.location.state}</span>
                    </div>
                  </div>
                  
                  <div className="delivery-options">
                    <h4>Delivery Options</h4>
                    <div className="options-list">
                      {listing.pickupAvailable && (
                        <span className="option">📍 Pickup Available</span>
                      )}
                      {listing.deliveryAvailable && (
                        <span className="option">🚚 Delivery within {listing.deliveryRadius}km</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'farmer' && (
                <div className="farmer-tab">
                  <div className="farmer-profile">
                    <div className="farmer-avatar large">
                      {listing.farmer.name.charAt(0)}
                    </div>
                    <div className="farmer-info-detailed">
                      <h4>{listing.farmer.name}</h4>
                      <p className="farm-name">{listing.farmer.farmName}</p>
                      <p className="farm-location">
                        📍 {listing.farmer.location.district}, {listing.farmer.location.state}
                      </p>
                    </div>
                  </div>
                  
                  <div className="trust-indicators">
                    <div className="trust-score">
                      <span className="score">{listing.farmer.trustIndicator.reliabilityScore}</span>
                      <span className="label">Reliability Score</span>
                    </div>
                    <div className="trust-stat">
                      <span className="value">⭐ {listing.farmer.trustIndicator.qualityRating}</span>
                      <span className="label">Rating</span>
                    </div>
                    <div className="trust-stat">
                      <span className="value">{listing.farmer.trustIndicator.onTimeRate}%</span>
                      <span className="label">On-time</span>
                    </div>
                    <div className="trust-stat">
                      <span className="value">{listing.farmer.trustIndicator.totalTransactions}</span>
                      <span className="label">Transactions</span>
                    </div>
                  </div>
                  
                  <div className="farmer-badges">
                    {listing.farmer.trustIndicator.verificationBadges.map((badge, idx) => (
                      <span key={idx} className="verification-badge">✓ {badge}</span>
                    ))}
                  </div>
                  
                  <div className="farmer-certifications">
                    <h4>Certifications</h4>
                    <div className="cert-list">
                      {listing.farmer.certifications.map((cert, idx) => (
                        <span key={idx} className="cert-badge">📜 {cert}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'impact' && (
                <div className="impact-tab">
                  <div className="impact-card">
                    <h4>🍽️ Potential Meals</h4>
                    <span className="impact-value">{listing.estimatedMeals?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="impact-card">
                    <h4>🌱 Carbon Footprint Saved</h4>
                    <span className="impact-value">
                      {Math.round((listing.availableQuantity * 0.5))} kg CO₂
                    </span>
                  </div>
                  <div className="impact-card">
                    <h4>💧 Water Saved</h4>
                    <span className="impact-value">
                      {(listing.availableQuantity * 30).toLocaleString()} L
                    </span>
                  </div>
                  
                  <div className="farmer-impact">
                    <h4>Farmer's Total Impact</h4>
                    <div className="impact-stats">
                      <div className="stat">
                        <span className="value">{listing.farmer.impactStats.totalFoodSaved.toLocaleString()} kg</span>
                        <span className="label">Food Saved</span>
                      </div>
                      <div className="stat">
                        <span className="value">{listing.farmer.impactStats.mealsProvided.toLocaleString()}</span>
                        <span className="label">Meals Provided</span>
                      </div>
                      <div className="stat">
                        <span className="value">{listing.farmer.impactStats.carbonSaved.toLocaleString()} kg</span>
                        <span className="label">CO₂ Saved</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Pricing & Actions */}
            <div className="modal-pricing">
              <div className="price-display">
                <div className="main-price">
                  <span className="current">{formatPrice(listing.pricing.currentPrice)}</span>
                  <span className="unit">/{listing.pricing.unit}</span>
                  {hasDiscount && (
                    <span className="original">{formatPrice(listing.pricing.originalPrice)}</span>
                  )}
                  {hasDiscount && (
                    <span className="discount-badge">-{discountPercent}%</span>
                  )}
                </div>
                
                {bulkDiscount && (
                  <div className="bulk-offer">
                    💰 Order {bulkDiscount.minQuantity}+ {listing.unit} and save {bulkDiscount.discountPercent}%!
                  </div>
                )}
              </div>
              
              <div className="order-section">
                <div className="quantity-selector">
                  <span>Quantity:</span>
                  <div className="quantity-controls">
                    <button onClick={() => setQuantity(Math.max(listing.pricing.minOrderQuantity, quantity - 1))}>−</button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(listing.pricing.minOrderQuantity, parseInt(e.target.value) || 0))}
                    />
                    <button onClick={() => setQuantity(Math.min(listing.availableQuantity, quantity + 1))}>+</button>
                  </div>
                  <span className="unit-label">{listing.unit}</span>
                </div>
                
                <div className="total-display">
                  <span className="total-label">Total:</span>
                  <span className="total-value">
                    {formatPrice(finalPrice)}
                    {hasBulkDiscount && <span className="savings"> (You save {formatPrice(totalPrice - finalPrice)}!)</span>}
                  </span>
                </div>
              </div>
              
              <div className="modal-actions">
                {userRole === 'ngo' || userRole === 'food_bank' ? (
                  <button className="btn-rescue large" onClick={() => onRescue?.(listing)}>
                    🤝 Rescue This Produce
                  </button>
                ) : (
                  <>
                    <button className="btn-cart" onClick={() => onAddToCart(listing, quantity)}>
                      🛒 Add to Cart
                    </button>
                    <button className="btn-buy-now">
                      ⚡ Buy Now
                    </button>
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

// NGO Rescue View Component
const NGORescueView: React.FC<{
  listings: MarketplaceListing[];
  onRescue: (listing: MarketplaceListing) => void;
}> = ({ listings, onRescue }) => {
  const rescueListings = listings
    .filter(l => l.rescuePriority === 'critical' || l.rescuePriority === 'high')
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.rescuePriority || 'low']) - (priorityOrder[b.rescuePriority || 'low']);
    });
  
  const totalMeals = rescueListings.reduce((sum, l) => sum + (l.estimatedMeals || 0), 0);
  
  return (
    <div className="ngo-rescue-view">
      <div className="rescue-header">
        <div className="rescue-title">
          <h2>🚨 Priority Rescue Queue</h2>
          <p>These items need immediate attention to prevent food waste</p>
        </div>
        <div className="rescue-stats">
          <div className="rescue-stat">
            <span className="value">{rescueListings.length}</span>
            <span className="label">Items to Rescue</span>
          </div>
          <div className="rescue-stat">
            <span className="value">{totalMeals.toLocaleString()}</span>
            <span className="label">Potential Meals</span>
          </div>
        </div>
      </div>
      
      <div className="rescue-grid">
        {rescueListings.map(listing => (
          <div key={listing.id} className={`rescue-card priority-${listing.rescuePriority}`}>
            <div className="rescue-urgency">
              <span className="urgency-badge">
                {listing.rescuePriority === 'critical' ? '🔴' : '🟠'} 
                {listing.rescuePriority?.toUpperCase()}
              </span>
              <span className="time-left">{listing.spoilageIndicator.urgencyMessage}</span>
            </div>
            
            <div className="rescue-content">
              <div className="rescue-image">
                <span>{getProductIcon(listing.productType)}</span>
              </div>
              <div className="rescue-info">
                <h4>{listing.title}</h4>
                <p>{listing.availableQuantity} {listing.unit} available</p>
                <p className="rescue-location">📍 {listing.location.district}</p>
                <p className="rescue-meals">🍽️ ~{listing.estimatedMeals?.toLocaleString()} meals</p>
              </div>
            </div>
            
            <div className="rescue-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${listing.spoilageIndicator.percentageRemaining}%`,
                  backgroundColor: listing.spoilageIndicator.colorCode 
                }}
              />
            </div>
            
            <button className="btn-rescue-now" onClick={() => onRescue(listing)}>
              🤝 Rescue Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Cart Sidebar Component
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
    <aside className={`cart-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="cart-header">
        <h3>🛒 Your Cart</h3>
        <button className="close-cart" onClick={onClose}>✕</button>
      </div>
      
      {cart.length === 0 ? (
        <div className="cart-empty">
          <span className="empty-icon">🛒</span>
          <p>Your cart is empty</p>
          <span className="empty-subtitle">Add fresh produce from our farmers!</span>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.listing.id} className="cart-item">
                <div className="item-image">
                  <span>{getProductIcon(item.listing.productType)}</span>
                </div>
                <div className="item-details">
                  <h4>{item.listing.title}</h4>
                  <p className="item-farmer">by {item.listing.farmer.name}</p>
                  <FreshnessIndicator indicator={item.listing.spoilageIndicator} compact />
                </div>
                <div className="item-controls">
                  <div className="item-quantity">
                    <button onClick={() => onUpdateQuantity(item.listing.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.listing.id, item.quantity + 1)}>+</button>
                  </div>
                  <span className="item-price">{formatPrice(item.priceAtAdd * item.quantity)}</span>
                  <button className="remove-item" onClick={() => onRemoveItem(item.listing.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
            </div>
            {subtotal <= 500 && (
              <div className="free-delivery-hint">
                Add {formatPrice(500 - subtotal)} more for free delivery!
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          
          <div className="cart-actions">
            <button className="btn-checkout" onClick={onCheckout}>
              Proceed to Checkout
            </button>
          </div>
          
          <div className="cart-impact">
            <span className="impact-label">🌍 Your Impact</span>
            <div className="impact-mini-stats">
              <span>~{Math.round(subtotal / 50)} meals supported</span>
              <span>~{Math.round(subtotal * 0.1)} kg CO₂ saved</span>
            </div>
          </div>
        </>
      )}
    </aside>
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
    sortBy: 'freshness'
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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
  
  // Load listings
  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true);
      try {
        // Load donation listings (Mongo-backed)
        const response = await fetch('http://localhost:8000/api/listings');
        if (!response.ok) throw new Error('Failed to load listings');
        const data = await response.json();
        const apiListings: ApiDonationListing[] = data.listings || [];
        const mapped = apiListings.map(mapDonationToMarketplaceListing);
        if (mapped.length > 0) {
          setListings(mapped);
        } else {
          setListings(generateMockListings());
        }
      } catch {
        // Use mock data if API is not available
        const mockListings = generateMockListings();
        console.log('API failed, using mock data:', mockListings.length, 'listings');
        setListings(mockListings);
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
      result = result.filter(l => l.categories.includes(activeCategory));
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.productType.toLowerCase().includes(query) ||
        l.farmer.name.toLowerCase().includes(query) ||
        l.location.district.toLowerCase().includes(query)
      );
    }
    
    // Filter by product types
    if (filters.productTypes.length > 0) {
      result = result.filter(l => filters.productTypes.includes(l.productType));
    }
    
    // Filter by freshness levels
    if (filters.freshnessLevels.length > 0) {
      result = result.filter(l => filters.freshnessLevels.includes(l.spoilageIndicator.riskLevel));
    }
    
    // Filter by price range
    result = result.filter(l =>
      l.pricing.currentPrice >= filters.priceRange.min &&
      l.pricing.currentPrice <= filters.priceRange.max
    );
    
    // Filter by distance
    if (filters.distanceRange) {
      result = result.filter(l => (l.distanceFromUser || 0) <= filters.distanceRange);
    }
    
    // Filter by organic
    if (filters.isOrganic) {
      result = result.filter(l => l.isOrganic);
    }
    
    // Filter by certified
    if (filters.isCertified) {
      result = result.filter(l => l.isCertified);
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
    console.log('Filtered listings:', result.length, 'from', listings.length, 'total');
  }, [listings, activeCategory, searchQuery, filters]);
  
  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    listings.forEach(l => {
      l.categories.forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }, [listings]);
  
  // Cart functions
  const addToCart = useCallback((listing: MarketplaceListing, quantity: number) => {
    // Check if user is logged in
    if (!user) {
      const confirmLogin = window.confirm(
        'You need to login to add items to cart.\n\nWould you like to login now?'
      );
      if (confirmLogin) {
        navigate('/auth');
      }
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.listing.id === listing.id);
      if (existing) {
        return prev.map(item =>
          item.listing.id === listing.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { listing, quantity, priceAtAdd: listing.pricing.currentPrice }];
    });
    setIsCartOpen(true);
  }, [user, navigate]);
  
  const updateCartQuantity = useCallback((listingId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.listing.id !== listingId));
    } else {
      setCart(prev => prev.map(item =>
        item.listing.id === listingId ? { ...item, quantity } : item
      ));
    }
  }, []);
  
  const removeFromCart = useCallback((listingId: string) => {
    setCart(prev => prev.filter(item => item.listing.id !== listingId));
  }, []);
  
  const handleRescue = useCallback((listing: MarketplaceListing) => {
    // Check if user is logged in
    if (!user) {
      const confirmLogin = window.confirm(
        'You need to login as an NGO to rescue food items.\n\nWould you like to login now?'
      );
      if (confirmLogin) {
        navigate('/auth');
      }
      return;
    }
    
    // Handle NGO rescue action
    alert(`Rescue confirmed for: ${listing.title}\nQuantity: ${listing.availableQuantity} ${listing.unit}`);
  }, [user, navigate]);
  
  const handleCheckout = useCallback(() => {
    // Check if user is logged in
    if (!user) {
      const confirmLogin = window.confirm(
        'You need to login to proceed to checkout.\n\nWould you like to login now?'
      );
      if (confirmLogin) {
        navigate('/auth');
      }
      return;
    }
    
    navigate('/checkout', { state: { cartItems: cart } });
  }, [navigate, user, cart]);

  const handleHomeClick = useCallback(() => {
    // If user is logged in, take them to dashboard; otherwise go to landing.
    if (user) {
      navigate('/home');
    } else {
      navigate('/');
    }
  }, [navigate, user]);
  
  if (isLoading) {
    return (
      <div className="marketplace">
        <header className="marketplace-header">
          <div className="header-container">
            <div className="header-left">
              <div className="brand" onClick={handleHomeClick} role="button" tabIndex={0}>
                <span className="brand-icon">🌾</span>
                <div className="brand-text">
                  <span className="brand-name">Annam</span>
                  <span className="brand-tagline">Marketplace</span>
                </div>
              </div>
            </div>
            <div className="header-right">
              <button className="home-btn" onClick={handleHomeClick}>
                {user ? '🏠 Dashboard' : '🏠 Home'}
              </button>
            </div>
          </div>
        </header>

        <div className="marketplace-loading">
          <div className="loader">
            <span className="loader-icon">🌾</span>
            <p>Loading listings...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="marketplace">
      <header className="marketplace-header">
        <div className="header-container">
          <div className="header-left">
            <div className="brand" onClick={handleHomeClick} role="button" tabIndex={0}>
              <span className="brand-icon">🌾</span>
              <div className="brand-text">
                <span className="brand-name">Annam</span>
                <span className="brand-tagline">Marketplace</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="home-btn" onClick={handleHomeClick}>
              {user ? '🏠 Dashboard' : '🏠 Home'}
            </button>
          </div>
        </div>
      </header>
      
      <CategoryNav
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categoryCounts={categoryCounts}
      />
      
      <main className="marketplace-main">
        <div className="marketplace-container">
          {/* Filters Toggle for Mobile */}
          <button className="filters-toggle" onClick={() => setIsFiltersOpen(true)}>
            🎯 Filters
          </button>

          {/* Search */}
          <div className="search-box" style={{ marginTop: 12, marginBottom: 12 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search products, farmers, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
          
          {/* View Controls */}
          <div className="view-controls">
            <span className="results-count">{filteredListings.length} products found</span>
            <div className="view-buttons">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ▦
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
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
          <div className={`products-${viewMode}`}>
            {filteredListings.length === 0 ? (
              <div className="no-results">
                <span className="no-results-icon">🔍</span>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search query</p>
              </div>
            ) : (
              filteredListings.map(listing => (
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
      
      {/* Filters Sidebar */}
      <FiltersSidebar
        filters={filters}
        onFiltersChange={setFilters}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />
      
      {/* Cart Sidebar */}
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
      
      {/* Overlay for sidebars */}
      {(isFiltersOpen || isCartOpen) && (
        <div
          className="sidebar-overlay"
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
