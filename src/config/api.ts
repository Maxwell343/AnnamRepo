// API Configuration
// Set `VITE_API_BASE_URL` in your environment for non-default backends.
// Example: VITE_API_BASE_URL=http://127.0.0.1:8000

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/api/login`,
  signup: `${API_BASE_URL}/api/signup`,
  googleAuth: {
    check: `${API_BASE_URL}/api/google-auth/check`,
    login: `${API_BASE_URL}/api/google-auth/login`,
    signup: `${API_BASE_URL}/api/google-auth/signup`,
  },
  forgotPassword: `${API_BASE_URL}/api/forgot-password`,
  verifyOtp: `${API_BASE_URL}/api/verify-otp`,
  resetPassword: `${API_BASE_URL}/api/reset-password`,

  // Listings
  listings: `${API_BASE_URL}/api/listings`,

  // Settings
  farmerSettings: (id: string) => `${API_BASE_URL}/api/settings/farmer/${id}`,
  farmerProfile: (id: string) => `${API_BASE_URL}/api/farmer/profile/${id}`,
  farmerDashboard: (id: string) => `${API_BASE_URL}/api/farmer/${id}/dashboard`,
  driverSettings: (id: string) => `${API_BASE_URL}/api/settings/driver/${id}`,
  ngoSettings: (id: string) => `${API_BASE_URL}/api/settings/ngo/${id}`,

  // Driver
  driverTasks: (id: string) => `${API_BASE_URL}/api/drivers/${id}/tasks`,
  driverEarnings: (id: string) => `${API_BASE_URL}/api/drivers/${id}/earnings`,
  driverStats: (id: string) => `${API_BASE_URL}/api/stats/driver/${id}`,
  deliveryTaskStatus: (taskId: string) => `${API_BASE_URL}/api/delivery-tasks/${taskId}/status`,

  // Analytics
  farmerAnalytics: (id: string) => `${API_BASE_URL}/api/analytics/farmer/${id}`,
  driverAnalytics: (id: string) => `${API_BASE_URL}/api/analytics/driver/${id}`,

  // Notifications
  sendWhatsApp: `${API_BASE_URL}/api/notifications/whatsapp`,
  sendSms: `${API_BASE_URL}/api/notifications/sms`,
  sendNotification: `${API_BASE_URL}/api/notifications/send`,

  // Marketplace
  marketplace: {
    // Listings
    listings: `${API_BASE_URL}/api/marketplace/listings`,
    listingById: (id: string) => `${API_BASE_URL}/api/marketplace/listings/${id}`,
    listingsByFarmer: (farmerId: string) => `${API_BASE_URL}/api/marketplace/listings/farmer/${farmerId}`,

    // Categories & Filters
    categories: `${API_BASE_URL}/api/marketplace/categories`,
    filters: `${API_BASE_URL}/api/marketplace/filters`,

    // Search & Discovery
    search: `${API_BASE_URL}/api/marketplace/search`,
    nearExpiry: `${API_BASE_URL}/api/marketplace/near-expiry`,
    flashSales: `${API_BASE_URL}/api/marketplace/flash-sales`,
    ngoRescue: `${API_BASE_URL}/api/marketplace/ngo-rescue`,
    bulkLots: `${API_BASE_URL}/api/marketplace/bulk-lots`,

    // Smart Pricing
    priceSuggestion: `${API_BASE_URL}/api/marketplace/price-suggestion`,
    spoilagePredict: `${API_BASE_URL}/api/marketplace/spoilage-predict`,

    // Orders & Cart
    cart: `${API_BASE_URL}/api/marketplace/cart`,
    orders: `${API_BASE_URL}/api/marketplace/orders`,
    orderById: (id: string) => `${API_BASE_URL}/api/marketplace/orders/${id}`,

    // Impact & Analytics
    impact: `${API_BASE_URL}/api/marketplace/impact`,
    impactByDistrict: `${API_BASE_URL}/api/marketplace/impact/districts`,
    impactTrends: `${API_BASE_URL}/api/marketplace/impact/trends`,
    governmentReport: `${API_BASE_URL}/api/marketplace/impact/government-report`,

    // Farmer Dashboard
    farmerDashboard: (farmerId: string) => `${API_BASE_URL}/api/marketplace/farmer/${farmerId}/dashboard`,
    farmerAnalytics: (farmerId: string) => `${API_BASE_URL}/api/marketplace/farmer/${farmerId}/analytics`,

    // NGO Dashboard
    ngoDashboard: (ngoId: string) => `${API_BASE_URL}/api/marketplace/ngo/${ngoId}/dashboard`,
    ngoRescueHistory: (ngoId: string) => `${API_BASE_URL}/api/marketplace/ngo/${ngoId}/rescues`,

    // Trust & Ratings
    farmerRating: (farmerId: string) => `${API_BASE_URL}/api/marketplace/farmers/${farmerId}/rating`,
    productReviews: (listingId: string) => `${API_BASE_URL}/api/marketplace/listings/${listingId}/reviews`,
  },

  // Admin
  admin: {
    users: `${API_BASE_URL}/api/admin/users`,
  },
};
