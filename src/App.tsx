import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './Landing'
import AuthPage from './AuthPage'
import HomePage from './HomePage'
import ListingForm from './Listing'
import OrderTracking from './OrderTracking'
import ImpactPage from './Impact'
import HistoryPage from './History'
import SettingsPage from './Settings'
import Analytics from './Analytics'
import AvailablePickups from './AvailablePickups'
import MyDeliveries from './Mydeliveries'
import MyListings from './Mylisting'
import DriverSettings from './DriverSettings'
import EditListing from './EditListing'
import FarmerSettings from './FarmerSettings'
import ForgotPassword from './ForgotPassword'
import VerifyOTP from './VerifyOTP'
import ResetPassword from './ResetPassword'
import Earnings from './Earnings'
import RouteMap from './RouteMap'
import NgoSettings from './NgoSettings'
import ClaimedDonations from './ClaimedDonations'
// Marketplace imports
import Marketplace from './Marketplace'
import FarmerListingForm from './FarmerListingForm'
import ImpactDashboard from './ImpactDashboard'
import Checkout from './Checkout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/listing" element={<ListingForm />} />
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
        <Route path="/leaderboards" element={<ImpactPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/available-pickups" element={<AvailablePickups />} />
        <Route path="/my-deliveries" element={<MyDeliveries />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/driver-settings" element={<DriverSettings />} />
        <Route path="/edit-listing/:id" element={<EditListing />} />
        <Route path="/farmer-settings" element={<FarmerSettings />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/route-map" element={<RouteMap />} />
        <Route path="/ngo-settings" element={<NgoSettings />} />
        <Route path="/claimed-donations" element={<ClaimedDonations />} />
        
        {/* Marketplace Routes */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/category/:category" element={<Marketplace />} />
        <Route path="/marketplace/product/:productId" element={<Marketplace />} />
        <Route path="/farmer/new-listing" element={<FarmerListingForm />} />
        <Route path="/farmer/edit-listing/:listingId" element={<FarmerListingForm />} />
        <Route path="/impact-dashboard" element={<ImpactDashboard />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/tracking" element={<OrderTracking />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
