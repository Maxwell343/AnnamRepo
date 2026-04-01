import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLayout from './layout/AdminLayout';
import AdminDashboard from './dashboard/AdminDashboard';
import UserManagement from './users/UserManagement';
import ListingModeration from './marketplace/ListingModeration';
import CategoryManager from './marketplace/CategoryManager';
import LiveOperations from './logistics/LiveOperations';
import DeliveryMap from './logistics/DeliveryMap';
import OrderControlPanel from './logistics/OrderControlPanel';
import FinancialOverview from './finance/FinancialOverview';
import DriverPayouts from './finance/DriverPayouts';
import Transactions from './finance/Transactions';
import DisputeCenter from './disputes/DisputeCenter';
import DisputeDetails from './disputes/DisputeDetails';
import EvidenceViewer from './disputes/EvidenceViewer';
import GlobalAnalytics from './analytics/GlobalAnalytics';
import ImpactMetrics from './analytics/ImpactMetrics';
import RegionHeatmap from './analytics/RegionHeatmap';
import AdminSettings from './settings/AdminSettings';

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      {/* Dashboard */}
      <Route index element={<AdminDashboard />} />
      <Route path="dashboard" element={<AdminDashboard />} />

      {/* User Management */}
      <Route path="users" element={<UserManagement />} />

      {/* Marketplace */}
      <Route path="listings" element={<ListingModeration />} />
      <Route path="categories" element={<CategoryManager />} />

      {/* Logistics */}
      <Route path="operations" element={<LiveOperations />} />
      <Route path="delivery-map" element={<DeliveryMap />} />
      <Route path="orders" element={<OrderControlPanel />} />

      {/* Finance */}
      <Route path="finance" element={<FinancialOverview />} />
      <Route path="payouts" element={<DriverPayouts />} />
      <Route path="transactions" element={<Transactions />} />

      {/* Disputes */}
      <Route path="disputes" element={<DisputeCenter />} />
      <Route path="disputes/:id" element={<DisputeDetails />} />
      <Route path="disputes/:id/evidence" element={<EvidenceViewer />} />

      {/* Analytics */}
      <Route path="analytics" element={<GlobalAnalytics />} />
      <Route path="impact" element={<ImpactMetrics />} />
      <Route path="heatmap" element={<RegionHeatmap />} />

      {/* Settings */}
      <Route path="settings" element={<AdminSettings />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
