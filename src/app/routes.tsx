import React, { Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

// Guards
import { ProtectedRoute, RoleGuard, AdminGuard, FarmerProfileGuard } from '../guards';

// App-level (shared) pages
const LandingPage = React.lazy(() => import('./Landing'));
const HomePage = React.lazy(() => import('./HomePage'));
const DashboardLayout = React.lazy(() => import('./DashboardLayout'));
const HistoryPage = React.lazy(() => import('./History'));
const SettingsPage = React.lazy(() => import('./Settings'));
const NotFound = React.lazy(() => import('./NotFound'));

// Auth module
const AuthPage = React.lazy(() => import('../modules/auth').then(m => ({ default: m.AuthPage })));
const ForgotPassword = React.lazy(() => import('../modules/auth').then(m => ({ default: m.ForgotPassword })));
const VerifyOTP = React.lazy(() => import('../modules/auth').then(m => ({ default: m.VerifyOTP })));
const ResetPassword = React.lazy(() => import('../modules/auth').then(m => ({ default: m.ResetPassword })));

// Farmer module
const FarmerListingForm = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.FarmerListingForm })));
const FarmerProfileSetup = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.FarmerProfileSetup })));
const EditListing = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.EditListing })));
const MyListings = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.MyListings })));
const ListingForm = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.ListingForm })));
const Analytics = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.Analytics })));
const FarmerDashboard = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.FarmerDashboard })));
const FarmerSettings = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.FarmerSettings })));
const FarmerRewards = React.lazy(() => import('../modules/farmer').then(m => ({ default: m.FarmerRewards })));

// Customer module
const CustomerHomepage = React.lazy(() => import('../modules/customer').then(m => ({ default: m.CustomerHomepage })));
const CustomerAddresses = React.lazy(() => import('../modules/customer').then(m => ({ default: m.CustomerAddresses })));
const CustomerPayments = React.lazy(() => import('../modules/customer').then(m => ({ default: m.CustomerPayments })));
const CustomerSettings = React.lazy(() => import('../modules/customer').then(m => ({ default: m.CustomerSettings })));
const Marketplace = React.lazy(() => import('../modules/customer').then(m => ({ default: m.Marketplace })));
const Checkout = React.lazy(() => import('../modules/customer').then(m => ({ default: m.Checkout })));
const OrderTracking = React.lazy(() => import('../modules/customer').then(m => ({ default: m.OrderTracking })));

// Driver module
const DriverDashboard = React.lazy(() => import('../modules/driver').then(m => ({ default: m.DriverDashboard })));
const DriverSettings = React.lazy(() => import('../modules/driver').then(m => ({ default: m.DriverSettings })));
const AvailablePickups = React.lazy(() => import('../modules/driver').then(m => ({ default: m.AvailablePickups })));
const MyDeliveries = React.lazy(() => import('../modules/driver').then(m => ({ default: m.MyDeliveries })));
const Earnings = React.lazy(() => import('../modules/driver').then(m => ({ default: m.Earnings })));
const RouteMap = React.lazy(() => import('../modules/driver').then(m => ({ default: m.RouteMap })));

// NGO module
const NgoSettings = React.lazy(() => import('../modules/ngo').then(m => ({ default: m.NgoSettings })));
const ClaimedDonations = React.lazy(() => import('../modules/ngo').then(m => ({ default: m.ClaimedDonations })));
const ImpactDashboard = React.lazy(() => import('../modules/ngo').then(m => ({ default: m.ImpactDashboard })));
const ImpactPage = React.lazy(() => import('../modules/ngo').then(m => ({ default: m.ImpactPage })));
const NgoOrderTracking = React.lazy(() => import('../modules/ngo').then(m => ({ default: m.NgoOrderTracking })));

// Admin module
const AdminRoutes = React.lazy(() => import('../modules/admin').then(m => ({ default: m.AdminRoutes })));

// Role-based dashboard — renders the right dashboard for each role
function RoleDashboard() {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.role === 'farmer') return <FarmerDashboard />;
      if (user?.role === 'ngo')    return <ImpactDashboard />;
      if (user?.role === 'driver') return <DriverDashboard />;
    }
  } catch { /* ignore */ }
  return <HomePage />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
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

        {/* ── Catch-All 404 Route ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
