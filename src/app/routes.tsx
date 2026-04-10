import { Routes, Route, Outlet } from 'react-router-dom'

// App-level (shared) pages
import LandingPage from './Landing'
import HomePage from './HomePage'
import DashboardLayout from './DashboardLayout'
import HistoryPage from './History'
import SettingsPage from './Settings'

// Auth module
import {
  AuthPage,
  ForgotPassword,
  VerifyOTP,
  ResetPassword,
} from '../modules/auth'

// Farmer module
import {
  FarmerListingForm,
  FarmerProfileSetup,
  EditListing,
  MyListings,
  ListingForm,
  Analytics,
  FarmerDashboard,
  FarmerSettings,
  FarmerRewards,
} from '../modules/farmer'

// Customer module
import {
  CustomerHomepage,
  CustomerAddresses,
  CustomerPayments,
  CustomerSettings,
  Marketplace,
  Checkout,
  OrderTracking,
} from '../modules/customer'

// Driver module
import {
  DriverDashboard,
  DriverSettings,
  AvailablePickups,
  MyDeliveries,
  Earnings,
  RouteMap,
} from '../modules/driver'

// NGO module
import {
  NgoSettings,
  ClaimedDonations,
  ImpactDashboard,
  ImpactPage,
  NgoOrderTracking,
} from '../modules/ngo'

// Admin module
import { AdminRoutes } from '../modules/admin'

// Guards
import { ProtectedRoute, RoleGuard, AdminGuard, FarmerProfileGuard } from '../guards'

// Role-based dashboard — renders the right dashboard for each role
function RoleDashboard() {
  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const user = JSON.parse(raw)
      if (user?.role === 'farmer') return <FarmerDashboard />
      if (user?.role === 'ngo')    return <ImpactDashboard />
      if (user?.role === 'driver') return <DriverDashboard />
    }
  } catch { /* ignore */ }
  return <HomePage />
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Auth Routes ── */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ── Public Marketplace ── */}
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/marketplace/category/:category" element={<Marketplace />} />
      <Route path="/marketplace/product/:productId" element={<Marketplace />} />

      {/* ── Protected Standalone Pages (no sidebar) ── */}
      <Route path="/impact-dashboard" element={<ProtectedRoute><RoleGuard allowedRoles={['ngo']}><ImpactDashboard /></RoleGuard></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><RoleGuard allowedRoles={['customer']}><Checkout /></RoleGuard></ProtectedRoute>} />
      <Route path="/customer-home" element={<ProtectedRoute><RoleGuard allowedRoles={['customer']}><CustomerHomepage /></RoleGuard></ProtectedRoute>} />
      <Route path="/farmer/complete-profile" element={<ProtectedRoute><RoleGuard allowedRoles={['farmer']}><FarmerProfileSetup /></RoleGuard></ProtectedRoute>} />
      <Route path="/farmer-settings" element={<ProtectedRoute><RoleGuard allowedRoles={['farmer']}><FarmerSettings /></RoleGuard></ProtectedRoute>} />
      <Route path="/ngo-settings" element={<ProtectedRoute><RoleGuard allowedRoles={['ngo']}><NgoSettings /></RoleGuard></ProtectedRoute>} />

      {/* ── Admin Panel ── */}
      <Route path="/admin/*" element={<AdminGuard><AdminRoutes /></AdminGuard>} />

      {/* ── Dashboard Routes (with sidebar layout) ── */}
      <Route element={<ProtectedRoute><DashboardLayout><Outlet /></DashboardLayout></ProtectedRoute>}>
        {/* Shared — role-specific dashboards */}
        <Route path="/home" element={<RoleDashboard />} />
        <Route path="/dashboard" element={<RoleDashboard />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Farmer */}
        <Route path="/listing" element={<RoleGuard allowedRoles={['farmer']}><FarmerProfileGuard><ListingForm /></FarmerProfileGuard></RoleGuard>} />
        <Route path="/my-listings" element={<RoleGuard allowedRoles={['farmer']}><FarmerProfileGuard><MyListings /></FarmerProfileGuard></RoleGuard>} />
        <Route path="/edit-listing/:id" element={<RoleGuard allowedRoles={['farmer']}><FarmerProfileGuard><EditListing /></FarmerProfileGuard></RoleGuard>} />
        <Route path="/farmer/new-listing" element={<RoleGuard allowedRoles={['farmer']}><FarmerProfileGuard><FarmerListingForm /></FarmerProfileGuard></RoleGuard>} />
        <Route path="/farmer/edit-listing/:listingId" element={<RoleGuard allowedRoles={['farmer']}><FarmerProfileGuard><FarmerListingForm /></FarmerProfileGuard></RoleGuard>} />
        <Route path="/analytics" element={<RoleGuard allowedRoles={['farmer']}><FarmerProfileGuard><Analytics /></FarmerProfileGuard></RoleGuard>} />
        <Route path="/farmer-rewards" element={<RoleGuard allowedRoles={['farmer']}><FarmerProfileGuard><FarmerRewards /></FarmerProfileGuard></RoleGuard>} />

        {/* Customer */}
        <Route path="/order-tracking" element={<RoleGuard allowedRoles={['customer']}><OrderTracking /></RoleGuard>} />
        <Route path="/order-tracking/:orderId" element={<RoleGuard allowedRoles={['customer']}><OrderTracking /></RoleGuard>} />
        <Route path="/tracking" element={<RoleGuard allowedRoles={['customer']}><OrderTracking /></RoleGuard>} />
        <Route path="/addresses" element={<RoleGuard allowedRoles={['customer']}><CustomerAddresses /></RoleGuard>} />
        <Route path="/payments" element={<RoleGuard allowedRoles={['customer']}><CustomerPayments /></RoleGuard>} />
        <Route path="/customer-settings" element={<RoleGuard allowedRoles={['customer']}><CustomerSettings /></RoleGuard>} />

        {/* Driver */}
        <Route path="/driver-dashboard" element={<RoleGuard allowedRoles={['driver']}><DriverDashboard /></RoleGuard>} />
        <Route path="/available-pickups" element={<RoleGuard allowedRoles={['driver']}><AvailablePickups /></RoleGuard>} />
        <Route path="/my-deliveries" element={<RoleGuard allowedRoles={['driver']}><MyDeliveries /></RoleGuard>} />
        <Route path="/driver-settings" element={<RoleGuard allowedRoles={['driver']}><DriverSettings /></RoleGuard>} />
        <Route path="/earnings" element={<RoleGuard allowedRoles={['driver']}><Earnings /></RoleGuard>} />
        <Route path="/route-map" element={<RoleGuard allowedRoles={['driver']}><RouteMap /></RoleGuard>} />

        {/* NGO */}
        <Route path="/leaderboards" element={<RoleGuard allowedRoles={['ngo']}><ImpactPage /></RoleGuard>} />
        <Route path="/claimed-donations" element={<RoleGuard allowedRoles={['ngo']}><ClaimedDonations /></RoleGuard>} />
        <Route path="/ngo-order-tracking" element={<RoleGuard allowedRoles={['ngo']}><NgoOrderTracking /></RoleGuard>} />
      </Route>
    </Routes>
  )
}
