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
  FarmerSettings,
  EditListing,
  MyListings,
  ListingForm,
  Analytics,
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
} from '../modules/ngo'

// Admin module
import { AdminRoutes } from '../modules/admin'

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

      {/* ── Standalone Pages (no sidebar) ── */}
      <Route path="/impact-dashboard" element={<ImpactDashboard />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/customer-home" element={<CustomerHomepage />} />

      {/* ── Public Marketplace ── */}
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/marketplace/category/:category" element={<Marketplace />} />
      <Route path="/marketplace/product/:productId" element={<Marketplace />} />

      {/* ── Admin Panel ── */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* ── Dashboard Routes (with sidebar layout) ── */}
      <Route element={<DashboardLayout><Outlet /></DashboardLayout>}>
        {/* Shared */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Farmer */}
        <Route path="/listing" element={<ListingForm />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/edit-listing/:id" element={<EditListing />} />
        <Route path="/farmer-settings" element={<FarmerSettings />} />
        <Route path="/farmer/new-listing" element={<FarmerListingForm />} />
        <Route path="/farmer/edit-listing/:listingId" element={<FarmerListingForm />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* Customer */}
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
        <Route path="/tracking" element={<OrderTracking />} />
        <Route path="/addresses" element={<CustomerAddresses />} />
        <Route path="/payments" element={<CustomerPayments />} />
        <Route path="/customer-settings" element={<CustomerSettings />} />

        {/* Driver */}
        <Route path="/available-pickups" element={<AvailablePickups />} />
        <Route path="/my-deliveries" element={<MyDeliveries />} />
        <Route path="/driver-settings" element={<DriverSettings />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/route-map" element={<RouteMap />} />

        {/* NGO */}
        <Route path="/leaderboards" element={<ImpactPage />} />
        <Route path="/ngo-settings" element={<NgoSettings />} />
        <Route path="/claimed-donations" element={<ClaimedDonations />} />
      </Route>
    </Routes>
  )
}
