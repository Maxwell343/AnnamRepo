import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './Landing'
import AuthPage from './AuthPage'
import HomePage from './HomePage'
import ListingForm from './Listing'
import OrderTracking from './OrderTracking'
import ImpactPage from './Impact'
import HistoryPage from './History'
import SettingsPage from './settings'

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
        <Route path="/leaderboards" element={<ImpactPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
