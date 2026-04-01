import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './NgoOrderTracking.css';
import { API_ENDPOINTS } from '../../../config/api';

// ============================================
// Icons
// ============================================
const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Truck: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Package: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  StarFilled: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Navigation: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  MoreVertical: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  ),
};

// ============================================
// Types
// ============================================
type OrderStatus = 'requested' | 'assigned' | 'pickedUp' | 'inTransit' | 'delivered' | 'cancelled';

interface TimelineEvent {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

interface NgoOrder {
  id: string;
  farmerName: string;
  farmerPhone: string;
  farmerAddress: string;
  driverName: string;
  driverPhone: string;
  driverPhoto: string;
  vehicleType: string;
  vehicleNumber: string;
  status: OrderStatus;
  items: Array<{ name: string; quantity: string; weight: string }>;
  estimatedDelivery: Date;
  createdAt: Date;
  timeline: TimelineEvent[];
  rating?: number;
  notes: string;
  distance: string;
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type SortOption = 'newest' | 'oldest' | 'eta' | 'status';
type FilterStatus = 'all' | OrderStatus;

// ============================================
// Constants
// ============================================
const STATUS_STEPS: Array<{ key: Exclude<OrderStatus, 'cancelled'>; label: string; icon: React.FC }> = [
  { key: 'requested', label: 'Requested', icon: Icons.Package },
  { key: 'assigned', label: 'Assigned', icon: Icons.User },
  { key: 'pickedUp', label: 'Picked Up', icon: Icons.Check },
  { key: 'inTransit', label: 'In Transit', icon: Icons.Truck },
  { key: 'delivered', label: 'Delivered', icon: Icons.MapPin },
];

const statusLabelMap: Record<OrderStatus, string> = {
  requested: 'Requested',
  assigned: 'Assigned',
  pickedUp: 'Picked Up',
  inTransit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusColorMap: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  requested: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
  assigned: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  pickedUp: { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },
  inTransit: { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },
  delivered: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
};

const INITIAL_ORDERS: NgoOrder[] = [
  {
    id: 'ORD-NGO-1201',
    farmerName: 'Ravi Kumar',
    farmerPhone: '+91 98765 11111',
    farmerAddress: 'Green Valley Farm, Sector 12, Gurugram',
    driverName: 'Mohan Singh',
    driverPhone: '+91 98765 43210',
    driverPhoto: '',
    vehicleType: 'Mini Truck',
    vehicleNumber: 'HR-26-AB-1234',
    status: 'inTransit',
    items: [
      { name: 'Fresh Tomatoes', quantity: '50 kg', weight: '50 kg' },
      { name: 'Potatoes', quantity: '30 kg', weight: '30 kg' },
      { name: 'Onions', quantity: '20 kg', weight: '20 kg' },
    ],
    estimatedDelivery: new Date(Date.now() + 45 * 60000),
    createdAt: new Date(Date.now() - 3 * 3600000),
    timeline: [
      { status: 'requested', timestamp: new Date(Date.now() - 3 * 3600000), note: 'Order placed by NGO' },
      { status: 'assigned', timestamp: new Date(Date.now() - 2.5 * 3600000), note: 'Driver Mohan Singh assigned' },
      { status: 'pickedUp', timestamp: new Date(Date.now() - 1.5 * 3600000), note: 'Items picked up from farm' },
      { status: 'inTransit', timestamp: new Date(Date.now() - 30 * 60000), note: 'On the way to destination' },
    ],
    notes: 'Handle with care - fresh produce',
    distance: '12.5 km',
  },
  {
    id: 'ORD-NGO-1202',
    farmerName: 'Lakshmi Devi',
    farmerPhone: '+91 98765 22222',
    farmerAddress: 'Sunrise Organic Farm, Village Palam, Delhi',
    driverName: 'Arjun Patel',
    driverPhone: '+91 99887 77665',
    driverPhoto: '',
    vehicleType: 'Pickup Van',
    vehicleNumber: 'DL-4C-XY-5678',
    status: 'assigned',
    items: [
      { name: 'Organic Rice', quantity: '100 kg', weight: '100 kg' },
      { name: 'Wheat', quantity: '50 kg', weight: '50 kg' },
    ],
    estimatedDelivery: new Date(Date.now() + 2 * 3600000),
    createdAt: new Date(Date.now() - 1 * 3600000),
    timeline: [
      { status: 'requested', timestamp: new Date(Date.now() - 1 * 3600000), note: 'Order placed by NGO' },
      { status: 'assigned', timestamp: new Date(Date.now() - 30 * 60000), note: 'Driver Arjun Patel assigned' },
    ],
    notes: 'Bulk order - need help unloading',
    distance: '8.3 km',
  },
  {
    id: 'ORD-NGO-1203',
    farmerName: 'Suresh Reddy',
    farmerPhone: '+91 98765 33333',
    farmerAddress: 'Happy Harvest Farm, Noida Sector 62',
    driverName: 'Naveen Sharma',
    driverPhone: '+91 90123 45678',
    driverPhoto: '',
    vehicleType: 'Three Wheeler',
    vehicleNumber: 'UP-16-CD-9012',
    status: 'delivered',
    items: [
      { name: 'Fresh Vegetables Mix', quantity: '40 kg', weight: '40 kg' },
      { name: 'Seasonal Fruits', quantity: '25 kg', weight: '25 kg' },
    ],
    estimatedDelivery: new Date(Date.now() - 30 * 60000),
    createdAt: new Date(Date.now() - 5 * 3600000),
    timeline: [
      { status: 'requested', timestamp: new Date(Date.now() - 5 * 3600000), note: 'Order placed by NGO' },
      { status: 'assigned', timestamp: new Date(Date.now() - 4.5 * 3600000), note: 'Driver Naveen Sharma assigned' },
      { status: 'pickedUp', timestamp: new Date(Date.now() - 3 * 3600000), note: 'Items picked up from farm' },
      { status: 'inTransit', timestamp: new Date(Date.now() - 2 * 3600000), note: 'On the way' },
      { status: 'delivered', timestamp: new Date(Date.now() - 30 * 60000), note: 'Successfully delivered' },
    ],
    rating: 5,
    notes: 'Regular supplier - always fresh',
    distance: '5.2 km',
  },
  {
    id: 'ORD-NGO-1204',
    farmerName: 'Meena Kumari',
    farmerPhone: '+91 98765 44444',
    farmerAddress: 'Golden Fields, Faridabad',
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 91234 56789',
    driverPhoto: '',
    vehicleType: 'Mini Truck',
    vehicleNumber: 'HR-55-EF-3456',
    status: 'requested',
    items: [
      { name: 'Fresh Milk', quantity: '200 L', weight: '200 kg' },
      { name: 'Paneer', quantity: '20 kg', weight: '20 kg' },
    ],
    estimatedDelivery: new Date(Date.now() + 4 * 3600000),
    createdAt: new Date(Date.now() - 15 * 60000),
    timeline: [
      { status: 'requested', timestamp: new Date(Date.now() - 15 * 60000), note: 'Order placed by NGO' },
    ],
    notes: 'Dairy products - keep refrigerated',
    distance: '18.7 km',
  },
  {
    id: 'ORD-NGO-1205',
    farmerName: 'Gopal Yadav',
    farmerPhone: '+91 98765 55555',
    farmerAddress: 'Shanti Farm, Greater Noida',
    driverName: 'Vikram Singh',
    driverPhone: '+91 98888 77777',
    driverPhoto: '',
    vehicleType: 'Pickup Van',
    vehicleNumber: 'UP-16-GH-7890',
    status: 'pickedUp',
    items: [
      { name: 'Green Leafy Vegetables', quantity: '35 kg', weight: '35 kg' },
      { name: 'Herbs & Spices', quantity: '10 kg', weight: '10 kg' },
    ],
    estimatedDelivery: new Date(Date.now() + 90 * 60000),
    createdAt: new Date(Date.now() - 2 * 3600000),
    timeline: [
      { status: 'requested', timestamp: new Date(Date.now() - 2 * 3600000), note: 'Order placed by NGO' },
      { status: 'assigned', timestamp: new Date(Date.now() - 1.5 * 3600000), note: 'Driver Vikram Singh assigned' },
      { status: 'pickedUp', timestamp: new Date(Date.now() - 20 * 60000), note: 'Items picked up' },
    ],
    notes: 'Perishable items - deliver ASAP',
    distance: '15.1 km',
  },
];

// ============================================
// Utility Functions
// ============================================
const getStepIndex = (status: OrderStatus): number => {
  if (status === 'cancelled') return -1;
  return STATUS_STEPS.findIndex((step) => step.key === status);
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: Date): string => {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return `Today, ${formatTime(date)}`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const getTimeRemaining = (eta: Date): string => {
  const now = new Date();
  const diff = eta.getTime() - now.getTime();
  if (diff <= 0) return 'Arriving now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
};

const toDate = (value?: string, fallback?: Date): Date => {
  if (!value) return fallback || new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? (fallback || new Date()) : parsed;
};

const toNgoStatus = (taskStatus?: string, listingStatus?: string): OrderStatus => {
  const value = (taskStatus || listingStatus || '').toLowerCase();
  if (value === 'delivered') return 'delivered';
  if (value === 'in_transit') return 'inTransit';
  if (value === 'picked_up') return 'pickedUp';
  if (value === 'assigned' || value === 'pending') return 'assigned';
  if (value === 'cancelled') return 'cancelled';
  return 'requested';
};

const toDistance = (task: any, listing: any): string => {
  if (task?.distance_km !== undefined && task?.distance_km !== null) {
    const km = Number(task.distance_km);
    if (!Number.isNaN(km)) return `${km.toFixed(1)} km`;
  }
  const raw = listing?.delivery_distance || listing?.distance || listing?.assigned_driver?.distance;
  if (raw === undefined || raw === null) return 'N/A';
  const clean = `${raw}`.trim();
  if (!clean) return 'N/A';
  return /km$/i.test(clean) ? clean : `${clean} km`;
};

const buildTimeline = (status: OrderStatus, listing: any, task: any): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  events.push({
    status: 'requested',
    timestamp: toDate(listing?.claimed_at || listing?.created_at),
    note: 'Order placed by NGO',
  });

  if (['assigned', 'pickedUp', 'inTransit', 'delivered'].includes(status)) {
    events.push({
      status: 'assigned',
      timestamp: toDate(listing?.assigned_at || task?.created_at, toDate(listing?.claimed_at || listing?.created_at)),
      note: task?.driver_name ? `Driver ${task.driver_name} assigned` : 'Driver assigned',
    });
  }

  if (['pickedUp', 'inTransit', 'delivered'].includes(status)) {
    events.push({
      status: 'pickedUp',
      timestamp: toDate(listing?.picked_up_at || task?.picked_up_at, toDate(listing?.assigned_at || task?.created_at)),
      note: 'Items picked up from farm',
    });
  }

  if (['inTransit', 'delivered'].includes(status)) {
    events.push({
      status: 'inTransit',
      timestamp: toDate(task?.updated_at || listing?.picked_up_at, toDate(listing?.picked_up_at || listing?.assigned_at)),
      note: 'On the way to destination',
    });
  }

  if (status === 'delivered') {
    events.push({
      status: 'delivered',
      timestamp: toDate(listing?.delivered_at || task?.delivered_at, toDate(task?.updated_at || listing?.updated_at)),
      note: 'Successfully delivered',
    });
  }

  return events;
};

const toNgoOrder = (listing: any, task: any): NgoOrder => {
  const status = toNgoStatus(task?.status, listing?.status);
  const quantity = listing?.claimed_by?.claim_quantity || listing?.quantity || 'N/A';
  const quantityText = `${quantity}`;

  return {
    id: String(listing?.id || ''),
    farmerName: listing?.farmer_name || 'Farmer',
    farmerPhone: listing?.farmer_phone || '+91 00000 00000',
    farmerAddress:
      task?.pickup_address ||
      listing?.pickup_address ||
      listing?.pickup_location ||
      listing?.location_address ||
      'Pickup location not available',
    driverName: task?.driver_name || listing?.assigned_driver?.driver_name || 'Not assigned',
    driverPhone: task?.driver_phone || listing?.assigned_driver?.driver_phone || '',
    driverPhoto: '',
    vehicleType: task?.vehicle_type || listing?.assigned_driver?.vehicle_type || 'Delivery Vehicle',
    vehicleNumber: task?.vehicle_number || listing?.assigned_driver?.vehicle_number || 'N/A',
    status,
    items: [
      {
        name: listing?.title || 'Food Donation',
        quantity: quantityText,
        weight: quantityText,
      },
    ],
    estimatedDelivery: toDate(task?.estimated_delivery || listing?.estimated_delivery, new Date(Date.now() + 60 * 60000)),
    createdAt: toDate(listing?.created_at),
    timeline: buildTimeline(status, listing, task),
    rating: listing?.rating,
    notes: listing?.notes || task?.notes || '',
    distance: toDistance(task, listing),
  };
};

// ============================================
// Sub Components
// ============================================
const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: number) => void }> = ({ toasts, removeToast }) => (
  <div className="ot-toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`ot-toast ot-toast-${toast.type}`}>
        <span className="ot-toast-icon">
          {toast.type === 'success' && <Icons.Check />}
          {toast.type === 'error' && <Icons.X />}
          {toast.type === 'warning' && <Icons.AlertTriangle />}
          {toast.type === 'info' && <Icons.Info />}
        </span>
        <span className="ot-toast-message">{toast.message}</span>
        <button className="ot-toast-close" onClick={() => removeToast(toast.id)}>
          <Icons.X />
        </button>
      </div>
    ))}
  </div>
);

const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onClose: () => void;
}> = ({ isOpen, title, message, confirmText, cancelText, variant, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="ot-modal-overlay" onClick={onClose}>
      <div className={`ot-modal ot-modal-${variant}`} onClick={(e) => e.stopPropagation()}>
        <div className="ot-modal-header">
          <div className={`ot-modal-icon ot-modal-icon-${variant}`}>
            <Icons.AlertTriangle />
          </div>
          <h3>{title}</h3>
        </div>
        <p className="ot-modal-message">{message}</p>
        <div className="ot-modal-actions">
          <button className="ot-btn ot-btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`ot-btn ot-btn-${variant}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const RatingStars: React.FC<{
  rating: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}> = ({ rating, interactive = false, onRate }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className={`ot-rating-stars ${interactive ? 'interactive' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`ot-star ${(hoverRating || rating) >= star ? 'filled' : ''}`}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          disabled={!interactive}
        >
          {(hoverRating || rating) >= star ? <Icons.StarFilled /> : <Icons.Star />}
        </button>
      ))}
    </div>
  );
};

const LiveMapPlaceholder: React.FC<{ status: OrderStatus; distance: string }> = ({ status, distance }) => {
  const isActive = status === 'inTransit' || status === 'pickedUp';

  return (
    <div className={`ot-map-container ${isActive ? 'active' : ''}`}>
      <div className="ot-map-overlay">
        <div className="ot-map-grid" />
        {isActive && (
          <>
            <div className="ot-map-route" />
            <div className="ot-map-vehicle">
              <Icons.Truck />
            </div>
            <div className="ot-map-destination">
              <Icons.MapPin />
            </div>
          </>
        )}
      </div>
      <div className="ot-map-info">
        <Icons.Navigation />
        <span>{isActive ? `${distance} away` : 'Live tracking available when in transit'}</span>
      </div>
    </div>
  );
};

const OrderTimeline: React.FC<{ timeline: TimelineEvent[] }> = ({ timeline }) => (
  <div className="ot-timeline">
    {timeline.map((event, index) => (
      <div key={index} className={`ot-timeline-item status-${event.status}`}>
        <div className="ot-timeline-marker">
          <div className="ot-timeline-dot" />
          {index < timeline.length - 1 && <div className="ot-timeline-line" />}
        </div>
        <div className="ot-timeline-content">
          <div className="ot-timeline-header">
            <span className="ot-timeline-status">{statusLabelMap[event.status]}</span>
            <span className="ot-timeline-time">{formatDate(event.timestamp)}</span>
          </div>
          {event.note && <p className="ot-timeline-note">{event.note}</p>}
        </div>
      </div>
    ))}
  </div>
);

const StatCard: React.FC<{
  icon: React.FC;
  label: string;
  value: string | number;
  color: string;
  trend?: { value: number; positive: boolean };
}> = ({ icon: Icon, label, value, color, trend }) => (
  <div className="ot-stat-card" style={{ '--accent-color': color } as React.CSSProperties}>
    <div className="ot-stat-icon">
      <Icon />
    </div>
    <div className="ot-stat-content">
      <span className="ot-stat-value">{value}</span>
      <span className="ot-stat-label">{label}</span>
      {trend && (
        <span className={`ot-stat-trend ${trend.positive ? 'positive' : 'negative'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </span>
      )}
    </div>
  </div>
);

// ============================================
// Order Detail Modal
// ============================================
const OrderDetailModal: React.FC<{
  order: NgoOrder | null;
  onClose: () => void;
  onRate: (orderId: string, rating: number) => void;
  onCancel: (orderId: string) => void;
  onContact: (phone: string, method: 'call' | 'message') => void;
}> = ({ order, onClose, onRate, onCancel, onContact }) => {
  if (!order) return null;

  const currentStepIndex = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="ot-detail-overlay" onClick={onClose}>
      <div className="ot-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ot-detail-close" onClick={onClose}>
          <Icons.X />
        </button>

        <div className="ot-detail-header">
          <div>
            <span className="ot-detail-id">{order.id}</span>
            <h2 className="ot-detail-title">Order from {order.farmerName}</h2>
            <p className="ot-detail-subtitle">Created {formatDate(order.createdAt)}</p>
          </div>
          <span
            className="ot-status-badge large"
            style={{
              backgroundColor: statusColorMap[order.status].bg,
              color: statusColorMap[order.status].text,
              borderColor: statusColorMap[order.status].border,
            }}
          >
            {statusLabelMap[order.status]}
          </span>
        </div>

        {!isCancelled && !isDelivered && (
          <div className="ot-detail-eta">
            <Icons.Clock />
            <span>Estimated Arrival: <strong>{getTimeRemaining(order.estimatedDelivery)}</strong></span>
          </div>
        )}

        <div className="ot-detail-progress">
          {!isCancelled ? (
            <div className="ot-progress-track">
              {STATUS_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isDone = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const stateClass = isDone ? 'done' : isCurrent ? 'current' : 'todo';

                return (
                  <React.Fragment key={step.key}>
                    <div className={`ot-progress-step ${stateClass}`}>
                      <div className="ot-progress-icon">
                        <StepIcon />
                      </div>
                      <span className="ot-progress-label">{step.label}</span>
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div className={`ot-progress-connector ${isDone ? 'done' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="ot-cancelled-banner">
              <Icons.X />
              <span>This order has been cancelled</span>
            </div>
          )}
        </div>

        <LiveMapPlaceholder status={order.status} distance={order.distance} />

        <div className="ot-detail-grid">
          <div className="ot-detail-section">
            <h3>
              <Icons.User /> Driver Information
            </h3>
            <div className="ot-driver-info">
              <div className="ot-driver-avatar">
                <Icons.User />
              </div>
              <div className="ot-driver-details">
                <strong>{order.driverName}</strong>
                <span>{order.vehicleType} • {order.vehicleNumber}</span>
              </div>
            </div>
            <div className="ot-contact-buttons">
              <button
                className="ot-btn ot-btn-primary"
                onClick={() => onContact(order.driverPhone, 'call')}
                disabled={isCancelled}
              >
                <Icons.Phone /> Call Driver
              </button>
              <button
                className="ot-btn ot-btn-secondary"
                onClick={() => onContact(order.driverPhone, 'message')}
                disabled={isCancelled}
              >
                <Icons.MessageCircle /> Message
              </button>
            </div>
          </div>

          <div className="ot-detail-section">
            <h3>
              <Icons.MapPin /> Pickup Location
            </h3>
            <p className="ot-address">{order.farmerAddress}</p>
            <div className="ot-farmer-contact">
              <span>Farmer: {order.farmerName}</span>
              <a href={`tel:${order.farmerPhone.replace(/\s+/g, '')}`}>{order.farmerPhone}</a>
            </div>
          </div>
        </div>

        <div className="ot-detail-section">
          <h3>
            <Icons.Package /> Order Items
          </h3>
          <div className="ot-items-list">
            {order.items.map((item, index) => (
              <div key={index} className="ot-item">
                <span className="ot-item-name">{item.name}</span>
                <span className="ot-item-quantity">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {order.notes && (
          <div className="ot-detail-section ot-notes">
            <h3>
              <Icons.Info /> Notes
            </h3>
            <p>{order.notes}</p>
          </div>
        )}

        <div className="ot-detail-section">
          <h3>
            <Icons.Clock /> Order Timeline
          </h3>
          <OrderTimeline timeline={order.timeline} />
        </div>

        {isDelivered && (
          <div className="ot-detail-section ot-rating-section">
            <h3>
              <Icons.Star /> Rate this Delivery
            </h3>
            <p>How was your experience with this delivery?</p>
            <RatingStars
              rating={order.rating || 0}
              interactive={!order.rating}
              onRate={(rating) => onRate(order.id, rating)}
            />
            {order.rating && <span className="ot-rating-thanks">Thank you for your feedback!</span>}
          </div>
        )}

        <div className="ot-detail-actions">
          {!isDelivered && !isCancelled && (
            <button className="ot-btn ot-btn-danger" onClick={() => onCancel(order.id)}>
              Cancel Order
            </button>
          )}
          <button className="ot-btn ot-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================
const NgoOrderTracking: React.FC = () => {
  const [orders, setOrders] = useState<NgoOrder[]>([]);
  const [ngoId, setNgoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedOrder, setSelectedOrder] = useState<NgoOrder | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; orderId: string }>({
    isOpen: false,
    orderId: '',
  });

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Toast management
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchLiveOrders = useCallback(async (showSuccessToast = false) => {
    if (!ngoId) return;

    try {
      const response = await fetch(API_ENDPOINTS.claimedListings(ngoId));
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();
      const listings = Array.isArray(data?.listings) ? data.listings : [];

      const tracked = await Promise.all(
        listings.map(async (listing: any) => {
          try {
            const trackingResponse = await fetch(API_ENDPOINTS.listingTracking(String(listing.id)));
            if (!trackingResponse.ok) {
              return { listing, task: null };
            }
            const trackingData = await trackingResponse.json();
            return {
              listing: trackingData?.listing || listing,
              task: trackingData?.task || null,
            };
          } catch {
            return { listing, task: null };
          }
        })
      );

      setOrders(tracked.map((entry) => toNgoOrder(entry.listing, entry.task)));

      if (showSuccessToast) {
        addToast('Orders refreshed successfully', 'success');
      }
    } catch (error) {
      console.error('Error fetching NGO live orders:', error);
      addToast('Failed to load live tracking orders', 'error');
    }
  }, [addToast, ngoId]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;

    try {
      const parsed = JSON.parse(savedUser);
      if (parsed?.id) {
        setNgoId(String(parsed.id));
      }
    } catch {
      // Ignore malformed storage payload.
    }
  }, []);

  useEffect(() => {
    if (!ngoId) return;

    fetchLiveOrders();
    refreshIntervalRef.current = setInterval(() => {
      fetchLiveOrders();
    }, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchLiveOrders, ngoId]);

  useEffect(() => {
    if (!selectedOrder) return;
    const refreshed = orders.find((order) => order.id === selectedOrder.id);
    if (refreshed) {
      setSelectedOrder(refreshed);
    }
  }, [orders, selectedOrder]);

  // Dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const inTransit = orders.filter((o) => o.status === 'inTransit').length;
    return { total, active, delivered, cancelled, inTransit };
  }, [orders]);

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.id.toLowerCase().includes(query) ||
          order.farmerName.toLowerCase().includes(query) ||
          order.driverName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((order) => order.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'eta':
          return a.estimatedDelivery.getTime() - b.estimatedDelivery.getTime();
        case 'status':
          return getStepIndex(b.status) - getStepIndex(a.status);
        default:
          return 0;
      }
    });

    return result;
  }, [orders, searchQuery, filterStatus, sortBy]);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveOrders(true);
    setIsRefreshing(false);
  };

  const handleContactDriver = (phone: string, method: 'call' | 'message') => {
    const cleanPhone = phone.replace(/\s+/g, '');
    if (method === 'call') {
      window.location.href = `tel:${cleanPhone}`;
    } else {
      window.location.href = `sms:${cleanPhone}`;
    }
  };

  const handleCancelOrder = (orderId: string) => {
    setCancelModal({ isOpen: true, orderId });
  };

  const confirmCancelOrder = () => {
    const orderId = cancelModal.orderId;
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId && !['delivered', 'cancelled'].includes(order.status)
          ? {
              ...order,
              status: 'cancelled' as OrderStatus,
              timeline: [
                ...order.timeline,
                {
                  status: 'cancelled' as OrderStatus,
                  timestamp: new Date(),
                  note: 'Order cancelled by NGO',
                },
              ],
            }
          : order
      )
    );
    setCancelModal({ isOpen: false, orderId: '' });
    setSelectedOrder(null);
    addToast('Order cancelled successfully', 'warning');
  };

  const handleRateOrder = (orderId: string, rating: number) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, rating } : order))
    );
    setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, rating } : prev));
    addToast('Thank you for your feedback!', 'success');
  };

  const handleExport = () => {
    const data = orders.map((o) => ({
      id: o.id,
      farmer: o.farmerName,
      driver: o.driverName,
      status: o.status,
      items: o.items.map((i) => `${i.name} (${i.quantity})`).join(', '),
      created: o.createdAt.toISOString(),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Orders exported successfully', 'success');
  };

  return (
    <div className={`ot-page ${isDarkMode ? 'dark' : ''}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <ConfirmModal
        isOpen={cancelModal.isOpen}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order"
        variant="danger"
        onConfirm={confirmCancelOrder}
        onClose={() => setCancelModal({ isOpen: false, orderId: '' })}
      />

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRate={handleRateOrder}
        onCancel={handleCancelOrder}
        onContact={handleContactDriver}
      />

      {/* Header */}
      <header className="ot-header">
        <div className="ot-header-content">
          <div className="ot-header-text">
            <h1>
              <Icons.Truck />
              Order Tracking
            </h1>
            <p>Track incoming food deliveries from farmers in real-time</p>
          </div>
          <div className="ot-header-actions">
            <button
              className={`ot-btn ot-btn-icon ${isRefreshing ? 'refreshing' : ''}`}
              onClick={handleRefresh}
              title="Refresh orders"
            >
              <Icons.Refresh />
            </button>
            <button
              className="ot-btn ot-btn-icon"
              onClick={handleExport}
              title="Export orders"
            >
              <Icons.Download />
            </button>
            <button
              className="ot-btn ot-btn-icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle theme"
            >
              {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="ot-stats">
        <StatCard
          icon={Icons.Package}
          label="Total Orders"
          value={stats.total}
          color="#6366f1"
        />
        <StatCard
          icon={Icons.Clock}
          label="Active"
          value={stats.active}
          color="#f59e0b"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          icon={Icons.Truck}
          label="In Transit"
          value={stats.inTransit}
          color="#ec4899"
        />
        <StatCard
          icon={Icons.Check}
          label="Delivered"
          value={stats.delivered}
          color="#10b981"
        />
      </section>

      {/* Filters */}
      <section className="ot-filters">
        <div className="ot-search-box">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search orders, farmers, drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="ot-search-clear" onClick={() => setSearchQuery('')}>
              <Icons.X />
            </button>
          )}
        </div>

        <button
          className={`ot-btn ot-btn-filter ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Icons.Filter />
          Filters
          {filterStatus !== 'all' && <span className="ot-filter-badge">1</span>}
        </button>

        <div className="ot-sort-select">
          <Icons.ChevronDown />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="eta">ETA</option>
            <option value="status">Status</option>
          </select>
        </div>
      </section>

      {/* Filter Panel */}
      {showFilters && (
        <section className="ot-filter-panel">
          <h3>Filter by Status</h3>
          <div className="ot-filter-chips">
            <button
              className={`ot-filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            {(Object.keys(statusLabelMap) as OrderStatus[]).map((status) => (
              <button
                key={status}
                className={`ot-filter-chip ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
                style={
                  filterStatus === status
                    ? {
                        backgroundColor: statusColorMap[status].bg,
                        color: statusColorMap[status].text,
                        borderColor: statusColorMap[status].border,
                      }
                    : undefined
                }
              >
                {statusLabelMap[status]}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Orders Grid */}
      <section className="ot-orders-section">
        <div className="ot-orders-header">
          <h2>Orders ({filteredOrders.length})</h2>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="ot-empty-state">
            <Icons.Package />
            <h3>No orders found</h3>
            <p>
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No orders have been placed yet'}
            </p>
            {(searchQuery || filterStatus !== 'all') && (
              <button
                className="ot-btn ot-btn-primary"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="ot-orders-grid">
            {filteredOrders.map((order) => {
              const currentStepIndex = getStepIndex(order.status);
              const isCancelled = order.status === 'cancelled';
              const isDelivered = order.status === 'delivered';
              const isActive = !isCancelled && !isDelivered;

              return (
                <article
                  key={order.id}
                  className={`ot-order-card ${isCancelled ? 'cancelled' : ''} ${isDelivered ? 'delivered' : ''}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="ot-card-header">
                    <div className="ot-card-info">
                      <span className="ot-order-id">{order.id}</span>
                      <h3 className="ot-farmer-name">{order.farmerName}</h3>
                      <p className="ot-items-summary">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''} •{' '}
                        {order.items.reduce((acc, item) => {
                          const weight = parseFloat(item.weight);
                          return acc + (isNaN(weight) ? 0 : weight);
                        }, 0)}{' '}
                        kg
                      </p>
                    </div>
                    <span
                      className="ot-status-badge"
                      style={{
                        backgroundColor: statusColorMap[order.status].bg,
                        color: statusColorMap[order.status].text,
                        borderColor: statusColorMap[order.status].border,
                      }}
                    >
                      {statusLabelMap[order.status]}
                    </span>
                  </div>

                  {!isCancelled && (
                    <div className="ot-progress-bar-container">
                      <div className="ot-progress-bar">
                        <div
                          className="ot-progress-fill"
                          style={{
                            width: `${((currentStepIndex + 1) / STATUS_STEPS.length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="ot-progress-dots">
                        {STATUS_STEPS.map((step, index) => (
                          <div
                            key={step.key}
                            className={`ot-dot ${
                              index <= currentStepIndex ? 'active' : ''
                            } ${index === currentStepIndex ? 'current' : ''}`}
                            title={step.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="ot-cancelled-banner-small">
                      <Icons.X />
                      Order Cancelled
                    </div>
                  )}

                  <div className="ot-card-details">
                    <div className="ot-detail-row">
                      <Icons.User />
                      <span>
                        {order.driverName} • {order.vehicleType}
                      </span>
                    </div>
                    <div className="ot-detail-row">
                      <Icons.MapPin />
                      <span>{order.distance}</span>
                    </div>
                    {isActive && (
                      <div className="ot-detail-row ot-eta">
                        <Icons.Clock />
                        <span>ETA: {getTimeRemaining(order.estimatedDelivery)}</span>
                      </div>
                    )}
                  </div>

                  {isDelivered && order.rating && (
                    <div className="ot-card-rating">
                      <RatingStars rating={order.rating} />
                    </div>
                  )}

                  <div className="ot-card-actions">
                    <button
                      className="ot-btn ot-btn-sm ot-btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactDriver(order.driverPhone, 'call');
                      }}
                      disabled={isCancelled}
                    >
                      <Icons.Phone />
                      Call
                    </button>
                    <button
                      className="ot-btn ot-btn-sm ot-btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                    >
                      <Icons.Eye />
                      Details
                    </button>
                    {isActive && (
                      <button
                        className="ot-btn ot-btn-sm ot-btn-danger-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelOrder(order.id);
                        }}
                      >
                        <Icons.X />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default NgoOrderTracking;