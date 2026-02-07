// ============================================
// ANNAM SMART MARKETPLACE - TYPE DEFINITIONS
// ============================================

// User Roles
export type UserRole = 'farmer' | 'customer' | 'ngo' | 'food_bank' | 'processor' | 'driver' | 'admin';

// Listing Categories
export type ListingCategory = 
  | 'fresh_produce'
  | 'near_expiry'
  | 'surplus'
  | 'ngo_rescue'
  | 'bulk_processing'
  | 'flash_sale';

// Product Types
export type ProductType = 'Vegetable' | 'Fruit' | 'Grain' | 'Dairy' | 'Pulses' | 'Spices' | 'Other';

// Freshness Levels
export type FreshnessLevel = 'peak' | 'fresh' | 'good' | 'moderate' | 'urgent' | 'critical';

// Listing Status
export type ListingStatus = 
  | 'active'
  | 'reserved'
  | 'sold'
  | 'donated'
  | 'auto_donated'
  | 'expired'
  | 'flash_sale'
  | 'processing_bound';

// Selling Mode
export type SellingMode = 'sell' | 'donate' | 'auto_donate' | 'flexible';

// ============================================
// CORE INTERFACES
// ============================================

export interface Location {
  lat: number;
  lng: number;
  address: string;
  district: string;
  state: string;
  pincode: string;
}

export interface PriceInfo {
  originalPrice: number;
  currentPrice: number;
  unit: string; // kg, quintal, piece, dozen
  minOrderQuantity: number;
  bulkDiscount?: {
    minQuantity: number;
    discountPercent: number;
  };
  smartSuggestion?: number;
  autoReductionSchedule?: AutoPriceReduction[];
}

export interface AutoPriceReduction {
  daysBeforeExpiry: number;
  reductionPercent: number;
}

export interface SpoilageIndicator {
  riskLevel: FreshnessLevel;
  hoursRemaining: number;
  daysRemaining: number;
  percentageRemaining: number;
  colorCode: string;
  urgencyMessage: string;
}

export interface TrustIndicator {
  reliabilityScore: number; // 0-100
  totalTransactions: number;
  successfulDeliveries: number;
  onTimeRate: number;
  qualityRating: number;
  responseTime: string; // e.g., "Usually responds in 2h"
  verificationBadges: string[];
}

export interface FarmerProfile {
  id: string;
  name: string;
  farmName: string;
  profileImage?: string;
  location: Location;
  phone?: string;
  email?: string;
  establishedYear?: number;
  farmSize?: string;
  certifications: string[];
  specializations: ProductType[];
  trustIndicator: TrustIndicator;
  totalListings: number;
  activeListings: number;
  impactStats: {
    totalFoodSaved: number; // in kg
    mealsProvided: number;
    carbonSaved: number; // in kg CO2
  };
}

export interface MarketplaceListing {
  id: string;
  farmerId: string;
  farmer: FarmerProfile;
  
  // Product Details
  title: string;
  description: string;
  productType: ProductType;
  variety?: string;
  quantity: number;
  availableQuantity: number;
  unit: string;
  images: string[];
  
  // Freshness & Timing
  harvestDate: string;
  shelfLife: number; // in days
  expiryDate: string;
  spoilageIndicator: SpoilageIndicator;
  
  // Pricing
  pricing: PriceInfo;
  sellingMode: SellingMode;
  autoDonateThreshold?: number; // days before expiry to auto-donate
  
  // Location & Logistics
  location: Location;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  deliveryRadius?: number; // in km
  
  // Categorization
  categories: ListingCategory[];
  tags: string[];
  isOrganic: boolean;
  isCertified: boolean;
  
  // Status
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  
  // Smart Features
  aiQualityScore?: number;
  suggestedRouting?: 'direct_sale' | 'ngo' | 'flash_sale' | 'processor';
  distanceFromUser?: number;
  
  // Rescue Priority (for NGO view)
  rescuePriority?: 'critical' | 'high' | 'medium' | 'low';
  estimatedMeals?: number;
}

export interface CartItem {
  listing: MarketplaceListing;
  quantity: number;
  priceAtAdd: number;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerType: UserRole;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod: string;
  deliveryAddress: Location;
  createdAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  driverId?: string;
  trackingInfo?: TrackingInfo;
}

export interface TrackingInfo {
  currentStatus: string;
  currentLocation?: Location;
  updates: {
    timestamp: string;
    status: string;
    location?: string;
    message: string;
  }[];
}

// ============================================
// FILTER & SEARCH INTERFACES
// ============================================

export interface MarketplaceFilters {
  categories: ListingCategory[];
  productTypes: ProductType[];
  freshnessLevels: FreshnessLevel[];
  priceRange: { min: number; max: number };
  distanceRange: number; // in km
  location?: Location;
  sellingMode?: SellingMode[];
  isOrganic?: boolean;
  isCertified?: boolean;
  sortBy: 'freshness' | 'price_low' | 'price_high' | 'distance' | 'urgency' | 'rating';
  searchQuery?: string;
}

export interface SearchSuggestion {
  type: 'product' | 'farmer' | 'location' | 'category';
  text: string;
  metadata?: any;
}

// ============================================
// ANALYTICS & IMPACT INTERFACES
// ============================================

export interface ImpactMetrics {
  foodSaved: number; // in kg
  mealsProvided: number;
  carbonSaved: number; // in kg CO2
  waterSaved: number; // in liters
  farmersSupported: number;
  ngosPartnered: number;
  districtsServed: number;
  transactionsCompleted: number;
  averageTimeSaved: number; // hours from harvest to consumption
}

export interface DistrictAnalytics {
  districtName: string;
  state: string;
  totalListings: number;
  activeListings: number;
  foodRescued: number;
  topProducts: { name: string; quantity: number }[];
  topFarmers: { id: string; name: string; score: number }[];
  ngoActivity: number;
  wastePreventionRate: number;
}

export interface GovernmentReport {
  reportId: string;
  generatedAt: string;
  period: { start: string; end: string };
  summary: ImpactMetrics;
  districtBreakdown: DistrictAnalytics[];
  trends: {
    date: string;
    foodSaved: number;
    transactions: number;
  }[];
  recommendations: string[];
}

// ============================================
// NOTIFICATION INTERFACES
// ============================================

export interface MarketplaceNotification {
  id: string;
  type: 'price_drop' | 'new_listing' | 'expiry_warning' | 'rescue_opportunity' | 'order_update' | 'flash_sale';
  title: string;
  message: string;
  listingId?: string;
  orderId?: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
}

// ============================================
// SMART FEATURES INTERFACES
// ============================================

export interface SmartPriceSuggestion {
  suggestedPrice: number;
  reasoning: string;
  marketComparison: {
    averagePrice: number;
    lowestPrice: number;
    highestPrice: number;
  };
  demandLevel: 'high' | 'medium' | 'low';
  competitorCount: number;
}

export interface SpoilageRiskAssessment {
  productId: string;
  riskScore: number; // 0-100
  riskLevel: FreshnessLevel;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
  recommendations: string[];
  optimalAction: 'sell' | 'discount' | 'flash_sale' | 'donate' | 'process';
}

export interface DynamicRouting {
  listingId: string;
  currentRoute: 'direct_sale' | 'ngo' | 'flash_sale' | 'processor';
  nextRoute?: 'ngo' | 'flash_sale' | 'processor';
  transitionTime?: string;
  reasoning: string;
}

// ============================================
// UI STATE INTERFACES
// ============================================

export interface MarketplaceState {
  listings: MarketplaceListing[];
  filteredListings: MarketplaceListing[];
  filters: MarketplaceFilters;
  cart: CartItem[];
  selectedListing: MarketplaceListing | null;
  userLocation: Location | null;
  isLoading: boolean;
  error: string | null;
  viewMode: 'grid' | 'list' | 'map';
  activeSection: ListingCategory | 'all';
}

export interface UserPreferences {
  preferredCategories: ListingCategory[];
  preferredProductTypes: ProductType[];
  maxDistance: number;
  notifications: {
    priceDrops: boolean;
    newListings: boolean;
    expiryWarnings: boolean;
    rescueOpportunities: boolean;
  };
  displayPreferences: {
    viewMode: 'grid' | 'list' | 'map';
    itemsPerPage: number;
    showImpactMetrics: boolean;
  };
}
