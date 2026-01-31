// API Configuration
// Change this URL when deploying to production

export const API_BASE_URL = 'http://localhost:8000';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/api/login`,
  signup: `${API_BASE_URL}/api/signup`,
  forgotPassword: `${API_BASE_URL}/api/forgot-password`,
  verifyOtp: `${API_BASE_URL}/api/verify-otp`,
  resetPassword: `${API_BASE_URL}/api/reset-password`,
  
  // Listings
  listings: `${API_BASE_URL}/api/listings`,
  
  // Settings
  farmerSettings: (id: string) => `${API_BASE_URL}/api/settings/farmer/${id}`,
  driverSettings: (id: string) => `${API_BASE_URL}/api/settings/driver/${id}`,
  ngoSettings: (id: string) => `${API_BASE_URL}/api/settings/ngo/${id}`,
  
  // Driver
  driverTasks: (id: string) => `${API_BASE_URL}/api/drivers/${id}/tasks`,
  driverEarnings: (id: string) => `${API_BASE_URL}/api/drivers/${id}/earnings`,
  driverStats: (id: string) => `${API_BASE_URL}/api/stats/driver/${id}`,
  
  // Analytics
  farmerAnalytics: (id: string) => `${API_BASE_URL}/api/analytics/farmer/${id}`,
  driverAnalytics: (id: string) => `${API_BASE_URL}/api/analytics/driver/${id}`,
  
  // Notifications
  sendWhatsApp: `${API_BASE_URL}/api/notifications/whatsapp`,
  sendSms: `${API_BASE_URL}/api/notifications/sms`,
  sendNotification: `${API_BASE_URL}/api/notifications/send`,
};
