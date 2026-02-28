import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, User, Package, Truck, Check, X, AlertTriangle, Circle, Heart, Building2,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MapPin, Flag, Eye, ClipboardList,
  ScrollText, Phone, Search, Download, SlidersHorizontal, List, LayoutGrid,
  CheckSquare, HelpCircle, Info, Trash2, Map,
} from 'lucide-react';
import './OrderControlPanel.css';

// ============ Types ============
type OrderStatus = 'pending' | 'assigned' | 'picked-up' | 'in-transit' | 'delivered' | 'cancelled' | 'failed';
type OrderPriority = 'urgent' | 'high' | 'medium' | 'low';
type ViewMode = 'table' | 'kanban' | 'timeline';
type SortField = 'orderId' | 'customer' | 'createdAt' | 'total' | 'priority' | 'status';
type SortOrder = 'asc' | 'desc';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

interface Location {
  address: string;
  city: string;
  coordinates?: { lat: number; lng: number };
  contactName?: string;
  contactPhone?: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  rating: number;
  vehicleType: string;
  vehicleNumber: string;
  status: 'available' | 'busy' | 'offline';
  currentLocation?: string;
  completedToday: number;
}

interface OrderTimeline {
  id: string;
  status: string;
  description: string;
  timestamp: string;
  actor?: string;
}

interface Order {
  id: string;
  orderId: string;
  customer: {
    id: string;
    name: string;
    type: 'individual' | 'ngo' | 'business';
    phone?: string;
    email?: string;
  };
  pickup: Location;
  dropoff: Location;
  driver: Driver | null;
  status: OrderStatus;
  priority: OrderPriority;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  scheduledAt?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  timeline: OrderTimeline[];
  distance?: number;
  duration?: number;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface FilterState {
  status: OrderStatus | 'all';
  priority: OrderPriority | 'all';
  paymentStatus: 'all' | 'pending' | 'paid' | 'failed' | 'refunded';
  customerType: 'all' | 'individual' | 'ngo' | 'business';
  dateRange: 'all' | 'today' | 'week' | 'month';
  hasDriver: 'all' | 'assigned' | 'unassigned';
}

// ============ Constants ============
const STATUS_CONFIG: Record<OrderStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pending: { icon: <Clock size={14} />, color: '#d97706', bgColor: '#fef3c7', label: 'Pending' },
  assigned: { icon: <User size={14} />, color: '#3b82f6', bgColor: '#dbeafe', label: 'Assigned' },
  'picked-up': { icon: <Package size={14} />, color: '#8b5cf6', bgColor: '#ede9fe', label: 'Picked Up' },
  'in-transit': { icon: <Truck size={14} />, color: '#06b6d4', bgColor: '#cffafe', label: 'In Transit' },
  delivered: { icon: <Check size={14} />, color: '#16a34a', bgColor: '#dcfce7', label: 'Delivered' },
  cancelled: { icon: <X size={14} />, color: '#6b7280', bgColor: '#f3f4f6', label: 'Cancelled' },
  failed: { icon: <AlertTriangle size={14} />, color: '#dc2626', bgColor: '#fee2e2', label: 'Failed' },
};

const PRIORITY_CONFIG: Record<OrderPriority, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  urgent: { icon: <Circle size={14} fill="#dc2626" color="#dc2626" />, color: '#dc2626', bgColor: '#fee2e2', label: 'Urgent' },
  high: { icon: <Circle size={14} fill="#ea580c" color="#ea580c" />, color: '#ea580c', bgColor: '#ffedd5', label: 'High' },
  medium: { icon: <Circle size={14} fill="#d97706" color="#d97706" />, color: '#d97706', bgColor: '#fef3c7', label: 'Medium' },
  low: { icon: <Circle size={14} fill="#16a34a" color="#16a34a" />, color: '#16a34a', bgColor: '#dcfce7', label: 'Low' },
};

const CUSTOMER_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  individual: { icon: <User size={14} />, color: '#6b7280' },
  ngo: { icon: <Heart size={14} />, color: '#16a34a' },
  business: { icon: <Building2 size={14} />, color: '#3b82f6' },
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const MOCK_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Rakesh Patel', phone: '+91-9876543210', rating: 4.8, vehicleType: 'Tempo', vehicleNumber: 'MH-12-AB-1234', status: 'available', currentLocation: 'Pune Central', completedToday: 5 },
  { id: 'd2', name: 'Sunil Mehta', phone: '+91-9876543211', rating: 4.6, vehicleType: 'Mini Truck', vehicleNumber: 'MH-12-CD-5678', status: 'busy', currentLocation: 'Kothrud', completedToday: 3 },
  { id: 'd3', name: 'Priya Kumar', phone: '+91-9876543212', rating: 4.9, vehicleType: 'Van', vehicleNumber: 'MH-12-EF-9012', status: 'available', currentLocation: 'Hadapsar', completedToday: 7 },
  { id: 'd4', name: 'Deepa Rao', phone: '+91-9876543213', rating: 4.7, vehicleType: 'Tempo', vehicleNumber: 'MH-12-GH-3456', status: 'available', currentLocation: 'Aundh', completedToday: 4 },
  { id: 'd5', name: 'Amit Singh', phone: '+91-9876543214', rating: 4.5, vehicleType: 'Mini Truck', vehicleNumber: 'MH-12-IJ-7890', status: 'offline', currentLocation: 'N/A', completedToday: 0 },
];

const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    orderId: 'ORD-2401',
    customer: { id: 'c1', name: 'Hope NGO', type: 'ngo', phone: '+91-9876500001', email: 'contact@hopengo.org' },
    pickup: { address: 'Green Valley Farm, Sector 15', city: 'Pune', contactName: 'Ramesh Kumar', contactPhone: '+91-9876543001' },
    dropoff: { address: 'Hope NGO Center, MG Road', city: 'Pune', contactName: 'Volunteer Team', contactPhone: '+91-9876543002' },
    driver: MOCK_DRIVERS[0],
    status: 'in-transit',
    priority: 'high',
    items: [
      { id: 'i1', name: 'Organic Tomatoes', quantity: 50, unit: 'kg', price: 35 },
      { id: 'i2', name: 'Fresh Spinach', quantity: 20, unit: 'kg', price: 40 },
      { id: 'i3', name: 'Carrots', quantity: 30, unit: 'kg', price: 25 },
    ],
    itemCount: 3,
    subtotal: 2300,
    deliveryFee: 150,
    total: 2450,
    currency: 'INR',
    paymentMethod: 'Online',
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    distance: 12.5,
    duration: 35,
    timeline: [
      { id: 't1', status: 'created', description: 'Order placed', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), actor: 'Hope NGO' },
      { id: 't2', status: 'assigned', description: 'Driver assigned', timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), actor: 'System' },
      { id: 't3', status: 'picked-up', description: 'Order picked up from farm', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), actor: 'Rakesh Patel' },
      { id: 't4', status: 'in-transit', description: 'On the way to destination', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), actor: 'Rakesh Patel' },
    ],
  },
  {
    id: '2',
    orderId: 'ORD-2402',
    customer: { id: 'c2', name: 'City Food Bank', type: 'ngo', phone: '+91-9876500002' },
    pickup: { address: 'Sunrise Organics, Wakad', city: 'Pune', contactName: 'Vikram Singh', contactPhone: '+91-9876543003' },
    dropoff: { address: 'City Food Bank, Camp Area', city: 'Pune', contactName: 'Manager', contactPhone: '+91-9876543004' },
    driver: MOCK_DRIVERS[1],
    status: 'assigned',
    priority: 'medium',
    items: [
      { id: 'i4', name: 'Rice', quantity: 100, unit: 'kg', price: 35 },
      { id: 'i5', name: 'Dal', quantity: 30, unit: 'kg', price: 80 },
    ],
    itemCount: 5,
    subtotal: 3900,
    deliveryFee: 300,
    total: 4200,
    currency: 'INR',
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    distance: 18.2,
    duration: 45,
    timeline: [
      { id: 't5', status: 'created', description: 'Order placed', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
      { id: 't6', status: 'assigned', description: 'Driver assigned', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: '3',
    orderId: 'ORD-2403',
    customer: { id: 'c3', name: 'Annapurna Shelter', type: 'ngo', phone: '+91-9876500003' },
    pickup: { address: 'Fresh Fields Farm, Hinjewadi', city: 'Pune', contactName: 'Farmer Collective', contactPhone: '+91-9876543005' },
    dropoff: { address: 'Annapurna Shelter, Koregaon Park', city: 'Pune', contactName: 'Shelter Manager', contactPhone: '+91-9876543006' },
    driver: MOCK_DRIVERS[2],
    status: 'delivered',
    priority: 'low',
    items: [
      { id: 'i6', name: 'Mixed Vegetables', quantity: 40, unit: 'kg', price: 45 },
    ],
    itemCount: 2,
    subtotal: 1650,
    deliveryFee: 150,
    total: 1800,
    currency: 'INR',
    paymentMethod: 'Online',
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    actualDelivery: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    distance: 8.5,
    duration: 25,
    timeline: [
      { id: 't7', status: 'created', description: 'Order placed', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      { id: 't8', status: 'assigned', description: 'Driver assigned', timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString() },
      { id: 't9', status: 'picked-up', description: 'Order picked up', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
      { id: 't10', status: 'in-transit', description: 'In transit', timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
      { id: 't11', status: 'delivered', description: 'Order delivered successfully', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: '4',
    orderId: 'ORD-2404',
    customer: { id: 'c4', name: 'Community Kitchen', type: 'ngo', phone: '+91-9876500004' },
    pickup: { address: 'Organic Roots, Baner', city: 'Pune', contactName: 'Store Manager', contactPhone: '+91-9876543007' },
    dropoff: { address: 'Community Kitchen, Shivaji Nagar', city: 'Pune', contactName: 'Head Chef', contactPhone: '+91-9876543008' },
    driver: null,
    status: 'pending',
    priority: 'urgent',
    items: [
      { id: 'i7', name: 'Potatoes', quantity: 80, unit: 'kg', price: 25 },
      { id: 'i8', name: 'Onions', quantity: 60, unit: 'kg', price: 30 },
      { id: 'i9', name: 'Tomatoes', quantity: 40, unit: 'kg', price: 35 },
    ],
    itemCount: 8,
    subtotal: 6000,
    deliveryFee: 500,
    total: 6500,
    currency: 'INR',
    paymentMethod: 'Online',
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    notes: 'Urgent delivery needed for lunch preparation',
    distance: 15.8,
    duration: 40,
    timeline: [
      { id: 't12', status: 'created', description: 'Order placed with high priority', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: '5',
    orderId: 'ORD-2405',
    customer: { id: 'c5', name: 'Ravi Sharma', type: 'individual', phone: '+91-9876500005' },
    pickup: { address: 'Harvest Hub, Viman Nagar', city: 'Pune', contactName: 'Hub Manager', contactPhone: '+91-9876543009' },
    dropoff: { address: '22, MG Road, Camp', city: 'Pune', contactName: 'Ravi Sharma', contactPhone: '+91-9876500005' },
    driver: MOCK_DRIVERS[3],
    status: 'in-transit',
    priority: 'medium',
    items: [
      { id: 'i10', name: 'Fresh Fruits Basket', quantity: 1, unit: 'basket', price: 350 },
    ],
    itemCount: 1,
    subtotal: 350,
    deliveryFee: 0,
    total: 350,
    currency: 'INR',
    paymentMethod: 'Online',
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    distance: 6.2,
    duration: 18,
    timeline: [
      { id: 't13', status: 'created', description: 'Order placed', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
      { id: 't14', status: 'assigned', description: 'Driver assigned', timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
      { id: 't15', status: 'picked-up', description: 'Order picked up', timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
      { id: 't16', status: 'in-transit', description: 'On the way', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: '6',
    orderId: 'ORD-2399',
    customer: { id: 'c6', name: 'Helping Hands NGO', type: 'ngo', phone: '+91-9876500006' },
    pickup: { address: 'Valley Fresh, Kharadi', city: 'Pune', contactName: 'Farm Owner', contactPhone: '+91-9876543010' },
    dropoff: { address: 'HH Center, Kalyani Nagar', city: 'Pune', contactName: 'NGO Coordinator', contactPhone: '+91-9876543011' },
    driver: null,
    status: 'cancelled',
    priority: 'low',
    items: [
      { id: 'i11', name: 'Assorted Vegetables', quantity: 60, unit: 'kg', price: 40 },
    ],
    itemCount: 4,
    subtotal: 2800,
    deliveryFee: 300,
    total: 3100,
    currency: 'INR',
    paymentMethod: 'Online',
    paymentStatus: 'refunded',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    notes: 'Cancelled due to inventory shortage',
    distance: 10.5,
    duration: 30,
    timeline: [
      { id: 't17', status: 'created', description: 'Order placed', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { id: 't18', status: 'cancelled', description: 'Order cancelled - Inventory shortage', timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), actor: 'Admin' },
    ],
  },
  {
    id: '7',
    orderId: 'ORD-2406',
    customer: { id: 'c7', name: 'Metro Restaurant', type: 'business', phone: '+91-9876500007' },
    pickup: { address: 'Farm Direct, Undri', city: 'Pune', contactName: 'Supplier', contactPhone: '+91-9876543012' },
    dropoff: { address: 'Metro Restaurant, FC Road', city: 'Pune', contactName: 'Kitchen Manager', contactPhone: '+91-9876543013' },
    driver: null,
    status: 'pending',
    priority: 'high',
    items: [
      { id: 'i12', name: 'Premium Vegetables', quantity: 100, unit: 'kg', price: 50 },
    ],
    itemCount: 6,
    subtotal: 5000,
    deliveryFee: 400,
    total: 5400,
    currency: 'INR',
    paymentMethod: 'Credit',
    paymentStatus: 'pending',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    notes: 'Scheduled delivery for lunch prep',
    distance: 14.3,
    duration: 38,
    timeline: [
      { id: 't19', status: 'created', description: 'Scheduled order placed', timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
    ],
  },
];

// ============ Helper Functions ============
const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

const getTimeUntil = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 0) return 'Overdue';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  return formatDateTime(dateString);
};

// ============ Sub Components ============
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: { value: number; isPositive: boolean };
  color: string;
  onClick?: () => void;
}> = ({ icon, label, value, trend, color, onClick }) => (
  <div
    className={`ocp-stat-card ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
    style={{ '--stat-color': color } as React.CSSProperties}
  >
    <div className="ocp-stat-card__icon">
      <span>{icon}</span>
    </div>
    <div className="ocp-stat-card__content">
      <span className="ocp-stat-card__value">{value}</span>
      <span className="ocp-stat-card__label">{label}</span>
    </div>
    {trend && (
      <div className={`ocp-stat-card__trend ${trend.isPositive ? 'positive' : 'negative'}`}>
        {trend.isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {Math.abs(trend.value)}%
      </div>
    )}
  </div>
);

const OrderRow: React.FC<{
  order: Order;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (order: Order) => void;
  onAssign: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onCancel: (orderId: string) => void;
  selectionMode: boolean;
}> = ({ order, isSelected, onSelect, onView, onAssign, onUpdateStatus, onCancel, selectionMode }) => {
  const statusConfig = STATUS_CONFIG[order.status];
  const priorityConfig = PRIORITY_CONFIG[order.priority];
  const customerTypeConfig = CUSTOMER_TYPE_CONFIG[order.customer.type];

  const canAssign = order.status === 'pending' && !order.driver;
  const canCancel = ['pending', 'assigned'].includes(order.status);
  const canUpdateStatus = ['assigned', 'picked-up', 'in-transit'].includes(order.status);

  return (
    <tr className={`ocp-row ${isSelected ? 'selected' : ''} status--${order.status}`}>
      {selectionMode && (
        <td className="ocp-row__checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(order.id)}
          />
        </td>
      )}
      <td>
        <div className="ocp-row__order">
          <span className="ocp-row__order-id">{order.orderId}</span>
          <span className="ocp-row__order-time">{getTimeAgo(order.createdAt)}</span>
        </div>
      </td>
      <td>
        <div className="ocp-row__customer">
          <span className="ocp-row__customer-icon" style={{ color: customerTypeConfig.color }}>
            {customerTypeConfig.icon}
          </span>
          <div className="ocp-row__customer-info">
            <span className="ocp-row__customer-name">{order.customer.name}</span>
            <span className="ocp-row__customer-type">{order.customer.type}</span>
          </div>
        </div>
      </td>
      <td>
        <div className="ocp-row__route">
          <div className="ocp-row__route-point">
            <span className="ocp-row__route-icon pickup"><MapPin size={14} /></span>
            <span className="ocp-row__route-address">{order.pickup.address.split(',')[0]}</span>
          </div>
          <div className="ocp-row__route-line" />
          <div className="ocp-row__route-point">
            <span className="ocp-row__route-icon dropoff"><Flag size={14} /></span>
            <span className="ocp-row__route-address">{order.dropoff.address.split(',')[0]}</span>
          </div>
        </div>
      </td>
      <td>
        {order.driver ? (
          <div className="ocp-row__driver">
            <div className="ocp-row__driver-avatar">
              {order.driver.name.charAt(0)}
            </div>
            <div className="ocp-row__driver-info">
              <span className="ocp-row__driver-name">{order.driver.name}</span>
              <span className="ocp-row__driver-vehicle">{order.driver.vehicleNumber}</span>
            </div>
          </div>
        ) : (
          <span className="ocp-row__unassigned">
            <span className="icon"><AlertTriangle size={14} /></span>
            Unassigned
          </span>
        )}
      </td>
      <td>
        <span
          className="ocp-badge"
          style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
        >
          {priorityConfig.icon} {priorityConfig.label}
        </span>
      </td>
      <td>
        <span
          className="ocp-badge"
          style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
        >
          {statusConfig.icon} {statusConfig.label}
        </span>
      </td>
      <td>
        <div className="ocp-row__total">
          <span className="ocp-row__amount">{formatCurrency(order.total)}</span>
          <span className={`ocp-row__payment ${order.paymentStatus}`}>
            {order.paymentStatus === 'paid' ? <><Check size={12} /> Paid</> : order.paymentStatus}
          </span>
        </div>
      </td>
      <td>
        {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="ocp-row__eta">
            <span className="icon"><Clock size={14} /></span>
            <span className="time">{getTimeUntil(order.estimatedDelivery)}</span>
          </div>
        )}
        {order.actualDelivery && order.status === 'delivered' && (
          <div className="ocp-row__delivered">
            <span className="icon"><Check size={14} /></span>
            <span className="time">{formatTime(order.actualDelivery)}</span>
          </div>
        )}
      </td>
      <td>
        <div className="ocp-row__actions">
          <button
            className="ocp-action-btn ocp-action-btn--view"
            onClick={() => onView(order)}
            title="View Details"
          >
            <Eye size={14} />
          </button>
          {canAssign && (
            <button
              className="ocp-action-btn ocp-action-btn--assign"
              onClick={() => onAssign(order)}
              title="Assign Driver"
            >
              <Truck size={14} />
            </button>
          )}
          {canUpdateStatus && (
            <button
              className="ocp-action-btn ocp-action-btn--update"
              onClick={() => {
                const nextStatus: Record<string, OrderStatus> = {
                  assigned: 'picked-up',
                  'picked-up': 'in-transit',
                  'in-transit': 'delivered',
                };
                onUpdateStatus(order.id, nextStatus[order.status]);
              }}
              title="Update Status"
            >
              <ArrowRight size={14} />
            </button>
          )}
          {canCancel && (
            <button
              className="ocp-action-btn ocp-action-btn--cancel"
              onClick={() => onCancel(order.id)}
              title="Cancel Order"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const KanbanCard: React.FC<{
  order: Order;
  onView: (order: Order) => void;
  onAssign: (order: Order) => void;
  onDragStart: (e: React.DragEvent, orderId: string) => void;
}> = ({ order, onView, onAssign, onDragStart }) => {
  const priorityConfig = PRIORITY_CONFIG[order.priority];
  const customerTypeConfig = CUSTOMER_TYPE_CONFIG[order.customer.type];

  return (
    <div
      className="ocp-kanban-card"
      draggable
      onDragStart={(e) => onDragStart(e, order.id)}
      onClick={() => onView(order)}
    >
      <div className="ocp-kanban-card__header">
        <span className="ocp-kanban-card__id">{order.orderId}</span>
        <span
          className="ocp-kanban-card__priority"
          style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
        >
          {priorityConfig.icon}
        </span>
      </div>
      
      <div className="ocp-kanban-card__customer">
        <span style={{ color: customerTypeConfig.color }}>{customerTypeConfig.icon}</span>
        <span>{order.customer.name}</span>
      </div>

      <div className="ocp-kanban-card__route">
        <div className="pickup">
          <span><MapPin size={14} /></span>
          <span>{order.pickup.address.split(',')[0]}</span>
        </div>
        <div className="dropoff">
          <span><Flag size={14} /></span>
          <span>{order.dropoff.address.split(',')[0]}</span>
        </div>
      </div>

      <div className="ocp-kanban-card__footer">
        <span className="ocp-kanban-card__total">{formatCurrency(order.total)}</span>
        <span className="ocp-kanban-card__time">{getTimeAgo(order.createdAt)}</span>
      </div>

      {order.driver && (
        <div className="ocp-kanban-card__driver">
          <div className="avatar">{order.driver.name.charAt(0)}</div>
          <span>{order.driver.name}</span>
        </div>
      )}

      {!order.driver && order.status === 'pending' && (
        <button
          className="ocp-kanban-card__assign-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAssign(order);
          }}
        >
          Assign Driver
        </button>
      )}
    </div>
  );
};

const KanbanColumn: React.FC<{
  status: OrderStatus;
  orders: Order[];
  onView: (order: Order) => void;
  onAssign: (order: Order) => void;
  onDragStart: (e: React.DragEvent, orderId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: OrderStatus) => void;
}> = ({ status, orders, onView, onAssign, onDragStart, onDragOver, onDrop }) => {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className="ocp-kanban-column"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="ocp-kanban-column__header" style={{ borderColor: config.color }}>
        <span className="ocp-kanban-column__icon">{config.icon}</span>
        <span className="ocp-kanban-column__title">{config.label}</span>
        <span className="ocp-kanban-column__count">{orders.length}</span>
      </div>
      <div className="ocp-kanban-column__body">
        {orders.map((order) => (
          <KanbanCard
            key={order.id}
            order={order}
            onView={onView}
            onAssign={onAssign}
            onDragStart={onDragStart}
          />
        ))}
        {orders.length === 0 && (
          <div className="ocp-kanban-column__empty">
            No orders
          </div>
        )}
      </div>
    </div>
  );
};

const OrderDetailsModal: React.FC<{
  order: Order;
  onClose: () => void;
  onAssign: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onCancel: (orderId: string) => void;
}> = ({ order, onClose, onAssign, onUpdateStatus, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'timeline' | 'tracking'>('details');
  const statusConfig = STATUS_CONFIG[order.status];
  const priorityConfig = PRIORITY_CONFIG[order.priority];

  const canUpdateStatus = ['assigned', 'picked-up', 'in-transit'].includes(order.status);
  const nextStatusMap: Record<string, OrderStatus> = {
    assigned: 'picked-up',
    'picked-up': 'in-transit',
    'in-transit': 'delivered',
  };

  return (
    <div className="ocp-modal-overlay" onClick={onClose}>
      <div className="ocp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ocp-modal__header">
          <div className="ocp-modal__header-left">
            <h2 className="ocp-modal__title">Order {order.orderId}</h2>
            <div className="ocp-modal__badges">
              <span
                className="ocp-badge"
                style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
              >
                {statusConfig.icon} {statusConfig.label}
              </span>
              <span
                className="ocp-badge"
                style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
              >
                {priorityConfig.icon} {priorityConfig.label}
              </span>
            </div>
          </div>
          <button className="ocp-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ocp-modal__tabs">
          {[
            { key: 'details', label: 'Details', icon: <ClipboardList size={14} /> },
            { key: 'items', label: 'Items', icon: <Package size={14} /> },
            { key: 'timeline', label: 'Timeline', icon: <ScrollText size={14} /> },
            { key: 'tracking', label: 'Tracking', icon: <MapPin size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`ocp-modal__tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="ocp-modal__content">
          {activeTab === 'details' && (
            <div className="ocp-order-details">
              <div className="ocp-detail-section">
                <h4>Customer Information</h4>
                <div className="ocp-detail-grid">
                  <div className="ocp-detail-item">
                    <label>Name</label>
                    <span>{order.customer.name}</span>
                  </div>
                  <div className="ocp-detail-item">
                    <label>Type</label>
                    <span style={{ textTransform: 'capitalize' }}>{order.customer.type}</span>
                  </div>
                  {order.customer.phone && (
                    <div className="ocp-detail-item">
                      <label>Phone</label>
                      <span>{order.customer.phone}</span>
                    </div>
                  )}
                  {order.customer.email && (
                    <div className="ocp-detail-item">
                      <label>Email</label>
                      <span>{order.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ocp-detail-section">
                <h4>Pickup Location</h4>
                <div className="ocp-location-card">
                  <div className="ocp-location-icon pickup"><MapPin size={16} /></div>
                  <div className="ocp-location-info">
                    <span className="address">{order.pickup.address}</span>
                    <span className="city">{order.pickup.city}</span>
                    {order.pickup.contactName && (
                      <span className="contact">
                        {order.pickup.contactName} • {order.pickup.contactPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ocp-detail-section">
                <h4>Delivery Location</h4>
                <div className="ocp-location-card">
                  <div className="ocp-location-icon dropoff"><Flag size={16} /></div>
                  <div className="ocp-location-info">
                    <span className="address">{order.dropoff.address}</span>
                    <span className="city">{order.dropoff.city}</span>
                    {order.dropoff.contactName && (
                      <span className="contact">
                        {order.dropoff.contactName} • {order.dropoff.contactPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {order.driver && (
                <div className="ocp-detail-section">
                  <h4>Driver Information</h4>
                  <div className="ocp-driver-card">
                    <div className="ocp-driver-avatar">
                      {order.driver.name.charAt(0)}
                    </div>
                    <div className="ocp-driver-info">
                      <span className="name">{order.driver.name}</span>
                      <span className="phone">{order.driver.phone}</span>
                      <span className="vehicle">
                        {order.driver.vehicleType} • {order.driver.vehicleNumber}
                      </span>
                      <span className="rating">⭐ {order.driver.rating}</span>
                    </div>
                    <button className="ocp-call-btn"><Phone size={14} /> Call</button>
                  </div>
                </div>
              )}

              <div className="ocp-detail-section">
                <h4>Order Information</h4>
                <div className="ocp-detail-grid">
                  <div className="ocp-detail-item">
                    <label>Created</label>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                  {order.scheduledAt && (
                    <div className="ocp-detail-item">
                      <label>Scheduled For</label>
                      <span>{formatDateTime(order.scheduledAt)}</span>
                    </div>
                  )}
                  {order.estimatedDelivery && (
                    <div className="ocp-detail-item">
                      <label>Est. Delivery</label>
                      <span>{formatDateTime(order.estimatedDelivery)}</span>
                    </div>
                  )}
                  <div className="ocp-detail-item">
                    <label>Payment</label>
                    <span>{order.paymentMethod} - {order.paymentStatus}</span>
                  </div>
                  {order.distance && (
                    <div className="ocp-detail-item">
                      <label>Distance</label>
                      <span>{order.distance} km</span>
                    </div>
                  )}
                  {order.duration && (
                    <div className="ocp-detail-item">
                      <label>Est. Duration</label>
                      <span>{order.duration} min</span>
                    </div>
                  )}
                </div>
              </div>

              {order.notes && (
                <div className="ocp-detail-section">
                  <h4>Notes</h4>
                  <p className="ocp-notes">{order.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="ocp-order-items">
              <table className="ocp-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatCurrency(item.price)}/{item.unit}</td>
                      <td>{formatCurrency(item.quantity * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Subtotal</td>
                    <td>{formatCurrency(order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3}>Delivery Fee</td>
                    <td>{formatCurrency(order.deliveryFee)}</td>
                  </tr>
                  <tr className="total">
                    <td colSpan={3}>Total</td>
                    <td>{formatCurrency(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="ocp-order-timeline">
              {order.timeline.map((event, index) => (
                <div
                  key={event.id}
                  className={`ocp-timeline-item status--${event.status}`}
                >
                  <div className="ocp-timeline-marker">
                    <span className="ocp-timeline-icon">
                      {STATUS_CONFIG[event.status as OrderStatus]?.icon || '•'}
                    </span>
                    {index < order.timeline.length - 1 && <div className="ocp-timeline-line" />}
                  </div>
                  <div className="ocp-timeline-content">
                    <div className="ocp-timeline-header">
                      <span className="ocp-timeline-title">{event.description}</span>
                      <span className="ocp-timeline-time">{formatDateTime(event.timestamp)}</span>
                    </div>
                    {event.actor && (
                      <span className="ocp-timeline-actor">by {event.actor}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="ocp-order-tracking">
              <div className="ocp-tracking-map">
                <div className="ocp-tracking-placeholder">
                  <span className="icon"><Map size={24} /></span>
                  <p>Live tracking map would appear here</p>
                  <p className="sub">Integrated with Google Maps or Mapbox</p>
                </div>
              </div>
              <div className="ocp-tracking-info">
                <div className="ocp-tracking-stat">
                  <span className="label">Distance</span>
                  <span className="value">{order.distance || 0} km</span>
                </div>
                <div className="ocp-tracking-stat">
                  <span className="label">ETA</span>
                  <span className="value">
                    {order.estimatedDelivery ? getTimeUntil(order.estimatedDelivery) : 'N/A'}
                  </span>
                </div>
                <div className="ocp-tracking-stat">
                  <span className="label">Status</span>
                  <span className="value">{statusConfig.label}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ocp-modal__footer">
          <button className="ocp-btn ocp-btn--secondary" onClick={onClose}>
            Close
          </button>
          {!order.driver && order.status === 'pending' && (
            <button className="ocp-btn ocp-btn--primary" onClick={() => onAssign(order)}>
              <Truck size={14} /> Assign Driver
            </button>
          )}
          {canUpdateStatus && (
            <button
              className="ocp-btn ocp-btn--primary"
              onClick={() => onUpdateStatus(order.id, nextStatusMap[order.status])}
            >
              <ArrowRight size={14} /> Mark as {STATUS_CONFIG[nextStatusMap[order.status]].label}
            </button>
          )}
          {['pending', 'assigned'].includes(order.status) && (
            <button
              className="ocp-btn ocp-btn--danger"
              onClick={() => onCancel(order.id)}
            >
              <X size={14} /> Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const DriverAssignmentModal: React.FC<{
  order: Order;
  drivers: Driver[];
  onClose: () => void;
  onAssign: (orderId: string, driverId: string) => void;
}> = ({ order, drivers, onClose, onAssign }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDrivers = drivers.filter((driver) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        driver.name.toLowerCase().includes(q) ||
        driver.vehicleNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableDrivers = filteredDrivers.filter((d) => d.status === 'available');
  const busyDrivers = filteredDrivers.filter((d) => d.status === 'busy');
  const offlineDrivers = filteredDrivers.filter((d) => d.status === 'offline');

  return (
    <div className="ocp-modal-overlay" onClick={onClose}>
      <div className="ocp-modal ocp-modal--driver" onClick={(e) => e.stopPropagation()}>
        <div className="ocp-modal__header">
          <div className="ocp-modal__header-left">
            <h2 className="ocp-modal__title">Assign Driver</h2>
            <p className="ocp-modal__subtitle">
              For order {order.orderId} to {order.customer.name}
            </p>
          </div>
          <button className="ocp-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ocp-driver-search">
          <span className="icon"><Search size={14} /></span>
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="ocp-modal__content">
          <div className="ocp-driver-section">
            <h4 className="ocp-driver-section__title available">
              <span><Check size={14} /></span> Available ({availableDrivers.length})
            </h4>
            <div className="ocp-driver-list">
              {availableDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`ocp-driver-option ${selectedDriverId === driver.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDriverId(driver.id)}
                >
                  <div className="ocp-driver-option__avatar">
                    {driver.name.charAt(0)}
                    <span className="status-dot available" />
                  </div>
                  <div className="ocp-driver-option__info">
                    <span className="name">{driver.name}</span>
                    <span className="vehicle">{driver.vehicleType} • {driver.vehicleNumber}</span>
                    <span className="location"><MapPin size={12} /> {driver.currentLocation}</span>
                  </div>
                  <div className="ocp-driver-option__stats">
                    <span className="rating">⭐ {driver.rating}</span>
                    <span className="completed">{driver.completedToday} today</span>
                  </div>
                  <div className="ocp-driver-option__check">
                    {selectedDriverId === driver.id && <span><Check size={14} /></span>}
                  </div>
                </div>
              ))}
              {availableDrivers.length === 0 && (
                <p className="ocp-driver-empty">No available drivers</p>
              )}
            </div>
          </div>

          {busyDrivers.length > 0 && (
            <div className="ocp-driver-section">
              <h4 className="ocp-driver-section__title busy">
                <span><Truck size={14} /></span> Busy ({busyDrivers.length})
              </h4>
              <div className="ocp-driver-list">
                {busyDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="ocp-driver-option disabled"
                  >
                    <div className="ocp-driver-option__avatar">
                      {driver.name.charAt(0)}
                      <span className="status-dot busy" />
                    </div>
                    <div className="ocp-driver-option__info">
                      <span className="name">{driver.name}</span>
                      <span className="vehicle">{driver.vehicleType} • {driver.vehicleNumber}</span>
                      <span className="location"><MapPin size={12} /> {driver.currentLocation}</span>
                    </div>
                    <div className="ocp-driver-option__stats">
                      <span className="rating">⭐ {driver.rating}</span>
                      <span className="status-text">On Delivery</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {offlineDrivers.length > 0 && (
            <div className="ocp-driver-section">
              <h4 className="ocp-driver-section__title offline">
                <span>○</span> Offline ({offlineDrivers.length})
              </h4>
              <div className="ocp-driver-list collapsed">
                {offlineDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="ocp-driver-option disabled"
                  >
                    <div className="ocp-driver-option__avatar">
                      {driver.name.charAt(0)}
                      <span className="status-dot offline" />
                    </div>
                    <div className="ocp-driver-option__info">
                      <span className="name">{driver.name}</span>
                      <span className="status-text">Offline</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ocp-modal__footer">
          <button className="ocp-btn ocp-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ocp-btn ocp-btn--primary"
            onClick={() => selectedDriverId && onAssign(order.id, selectedDriverId)}
            disabled={!selectedDriverId}
          >
            Assign Driver
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ isOpen, title, message, confirmLabel, confirmVariant, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="ocp-confirm-overlay" onClick={onCancel}>
      <div className="ocp-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ocp-confirm-dialog__icon" data-variant={confirmVariant}>
          {confirmVariant === 'danger' ? <AlertTriangle size={20} /> : confirmVariant === 'warning' ? <HelpCircle size={20} /> : <Info size={20} />}
        </div>
        <h3 className="ocp-confirm-dialog__title">{title}</h3>
        <p className="ocp-confirm-dialog__message">{message}</p>
        <div className="ocp-confirm-dialog__actions">
          <button
            className="ocp-btn ocp-btn--secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`ocp-btn ocp-btn--${confirmVariant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <span className="btn-spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => (
  <div className="ocp-toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`ocp-toast ocp-toast--${toast.type}`}>
        <span className="ocp-toast__icon">
          {toast.type === 'success' && <Check size={14} />}
          {toast.type === 'error' && <X size={14} />}
          {toast.type === 'warning' && <AlertTriangle size={14} />}
          {toast.type === 'info' && <Info size={14} />}
        </span>
        <span className="ocp-toast__message">{toast.message}</span>
        <button className="ocp-toast__close" onClick={() => onDismiss(toast.id)}>
          ×
        </button>
      </div>
    ))}
  </div>
);

// ============ Manual Order Modal ============
interface ManualOrderFormData {
  customerName: string;
  customerType: 'individual' | 'ngo' | 'business';
  customerPhone: string;
  customerEmail: string;
  pickupAddress: string;
  pickupCity: string;
  pickupContact: string;
  pickupPhone: string;
  dropoffAddress: string;
  dropoffCity: string;
  dropoffContact: string;
  dropoffPhone: string;
  priority: OrderPriority;
  paymentMethod: string;
  notes: string;
  items: { name: string; quantity: number; unit: string; price: number }[];
  scheduledAt: string;
}

const EMPTY_MANUAL_ORDER: ManualOrderFormData = {
  customerName: '',
  customerType: 'individual',
  customerPhone: '',
  customerEmail: '',
  pickupAddress: '',
  pickupCity: '',
  pickupContact: '',
  pickupPhone: '',
  dropoffAddress: '',
  dropoffCity: '',
  dropoffContact: '',
  dropoffPhone: '',
  priority: 'medium',
  paymentMethod: 'Cash',
  notes: '',
  items: [{ name: '', quantity: 1, unit: 'kg', price: 0 }],
  scheduledAt: '',
};

const ManualOrderModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: ManualOrderFormData) => void;
  isLoading: boolean;
}> = ({ onClose, onSubmit, isLoading }) => {
  const [form, setForm] = useState<ManualOrderFormData>(EMPTY_MANUAL_ORDER);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateItem = (index: number, field: string, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, unit: 'kg', price: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = subtotal > 0 ? 150 : 0;
  const total = subtotal + deliveryFee;

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!form.customerName.trim()) newErrors.customerName = 'Customer name is required';
      if (!form.customerPhone.trim()) newErrors.customerPhone = 'Phone is required';
    } else if (step === 2) {
      if (!form.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup address is required';
      if (!form.pickupCity.trim()) newErrors.pickupCity = 'Pickup city is required';
      if (!form.dropoffAddress.trim()) newErrors.dropoffAddress = 'Delivery address is required';
      if (!form.dropoffCity.trim()) newErrors.dropoffCity = 'Delivery city is required';
    } else if (step === 3) {
      const validItems = form.items.filter((item) => item.name.trim() && item.quantity > 0 && item.price > 0);
      if (validItems.length === 0) newErrors.items = 'Add at least one valid item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, 3) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3);
  };

  const handleSubmit = () => {
    if (validateStep(3)) {
      onSubmit(form);
    }
  };

  const steps = [
    { num: 1, label: 'Customer' },
    { num: 2, label: 'Locations' },
    { num: 3, label: 'Items & Review' },
  ];

  return (
    <div className="ocp-modal-overlay" onClick={onClose}>
      <div className="ocp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="ocp-modal__header">
          <div className="ocp-modal__header-left">
            <h2 className="ocp-modal__title">Create Manual Order</h2>
            <p className="ocp-modal__subtitle">Fill in the details to create a new order</p>
          </div>
          <button className="ocp-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', marginBottom: 8 }}>
          {steps.map((step) => (
            <div
              key={step.num}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 0',
                fontSize: 13,
                fontWeight: activeStep === step.num ? 700 : 500,
                color: activeStep >= step.num ? '#4f46e5' : '#9ca3af',
                borderBottom: `3px solid ${activeStep >= step.num ? '#4f46e5' : '#e5e7eb'}`,
                cursor: 'pointer',
              }}
              onClick={() => {
                if (step.num < activeStep) setActiveStep(step.num as 1 | 2 | 3);
              }}
            >
              {step.num}. {step.label}
            </div>
          ))}
        </div>

        <div className="ocp-modal__content" style={{ padding: '20px 24px', maxHeight: 480, overflowY: 'auto' }}>
          {/* Step 1: Customer Info */}
          {activeStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Customer Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Customer Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Enter customer name"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: `1px solid ${errors.customerName ? '#dc2626' : '#d1d5db'}`,
                      fontSize: 14, outline: 'none',
                    }}
                  />
                  {errors.customerName && <span style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.customerName}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Customer Type</label>
                  <select
                    value={form.customerType}
                    onChange={(e) => setForm({ ...form, customerType: e.target.value as ManualOrderFormData['customerType'] })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff',
                    }}
                  >
                    <option value="individual">Individual</option>
                    <option value="ngo">NGO</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as OrderPriority })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff',
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Phone <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="+91-9876543210"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: `1px solid ${errors.customerPhone ? '#dc2626' : '#d1d5db'}`,
                      fontSize: 14, outline: 'none',
                    }}
                  />
                  {errors.customerPhone && <span style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.customerPhone}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    placeholder="customer@email.com"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff',
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Locations */}
          {activeStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Pickup */}
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}><MapPin size={18} /></span> Pickup Location
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.pickupAddress}
                      onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
                      placeholder="Enter pickup address"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: `1px solid ${errors.pickupAddress ? '#dc2626' : '#d1d5db'}`,
                        fontSize: 14, outline: 'none',
                      }}
                    />
                    {errors.pickupAddress && <span style={{ fontSize: 12, color: '#dc2626' }}>{errors.pickupAddress}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      City <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.pickupCity}
                      onChange={(e) => setForm({ ...form, pickupCity: e.target.value })}
                      placeholder="City"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: `1px solid ${errors.pickupCity ? '#dc2626' : '#d1d5db'}`,
                        fontSize: 14, outline: 'none',
                      }}
                    />
                    {errors.pickupCity && <span style={{ fontSize: 12, color: '#dc2626' }}>{errors.pickupCity}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contact Name</label>
                    <input
                      type="text"
                      value={form.pickupContact}
                      onChange={(e) => setForm({ ...form, pickupContact: e.target.value })}
                      placeholder="Contact person"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contact Phone</label>
                    <input
                      type="tel"
                      value={form.pickupPhone}
                      onChange={(e) => setForm({ ...form, pickupPhone: e.target.value })}
                      placeholder="+91-..."
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Dropoff */}
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}><Flag size={18} /></span> Delivery Location
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.dropoffAddress}
                      onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })}
                      placeholder="Enter delivery address"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: `1px solid ${errors.dropoffAddress ? '#dc2626' : '#d1d5db'}`,
                        fontSize: 14, outline: 'none',
                      }}
                    />
                    {errors.dropoffAddress && <span style={{ fontSize: 12, color: '#dc2626' }}>{errors.dropoffAddress}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      City <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.dropoffCity}
                      onChange={(e) => setForm({ ...form, dropoffCity: e.target.value })}
                      placeholder="City"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: `1px solid ${errors.dropoffCity ? '#dc2626' : '#d1d5db'}`,
                        fontSize: 14, outline: 'none',
                      }}
                    />
                    {errors.dropoffCity && <span style={{ fontSize: 12, color: '#dc2626' }}>{errors.dropoffCity}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contact Name</label>
                    <input
                      type="text"
                      value={form.dropoffContact}
                      onChange={(e) => setForm({ ...form, dropoffContact: e.target.value })}
                      placeholder="Contact person"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contact Phone</label>
                    <input
                      type="tel"
                      value={form.dropoffPhone}
                      onChange={(e) => setForm({ ...form, dropoffPhone: e.target.value })}
                      placeholder="+91-..."
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Schedule For (optional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Items & Review */}
          {activeStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Order Items</div>
              {errors.items && <span style={{ fontSize: 12, color: '#dc2626' }}>{errors.items}</span>}

              {form.items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10,
                    alignItems: 'end', padding: 12, background: '#f9fafb', borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder="e.g. Tomatoes"
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 6,
                        border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Qty</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      min={1}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 6,
                        border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 6,
                        border: '1px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff',
                      }}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="pcs">pcs</option>
                      <option value="dozen">dozen</option>
                      <option value="bundle">bundle</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Price/Unit (₹)</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                      min={0}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 6,
                        border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={form.items.length <= 1}
                    style={{
                      padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                      background: form.items.length <= 1 ? '#f3f4f6' : '#fee2e2',
                      color: form.items.length <= 1 ? '#9ca3af' : '#dc2626',
                      cursor: form.items.length <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                onClick={addItem}
                style={{
                  padding: '10px', borderRadius: 8, border: '2px dashed #d1d5db',
                  background: 'transparent', color: '#6b7280', cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
                }}
              >
                + Add Item
              </button>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special instructions, delivery notes..."
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Order Summary */}
              <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Order Summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                    <span>Customer</span>
                    <span>{form.customerName || '—'} ({form.customerType})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                    <span>Pickup</span>
                    <span style={{ maxWidth: 240, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.pickupAddress || '—'}, {form.pickupCity || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                    <span>Delivery</span>
                    <span style={{ maxWidth: 240, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.dropoffAddress || '—'}, {form.dropoffCity || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                    <span>Items ({form.items.filter((i) => i.name.trim()).length})</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                    <span>Delivery Fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: '#111827', borderTop: '1px solid #bbf7d0', paddingTop: 8, marginTop: 4 }}>
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ocp-modal__footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {activeStep > 1 && (
              <button className="ocp-btn ocp-btn--secondary" onClick={handleBack}><ArrowLeft size={14} /> Back</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ocp-btn ocp-btn--secondary" onClick={onClose}>Cancel</button>
            {activeStep < 3 ? (
              <button className="ocp-btn ocp-btn--primary" onClick={handleNext}>Next <ArrowRight size={14} /></button>
            ) : (
              <button
                className="ocp-btn ocp-btn--primary"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : <><Check size={14} /> Create Order</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Main Component ============
const OrderControlPanel: React.FC = () => {
  // State
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [drivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    paymentStatus: 'all',
    customerType: 'all',
    dateRange: 'all',
    hasDriver: 'all',
  });
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-refresh for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In production, this would fetch new data from API
      // For now, just trigger a re-render to update time displays
      setOrders((prev) => [...prev]);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Toast functions
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Statistics
  const statistics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const inTransit = orders.filter((o) => ['assigned', 'picked-up', 'in-transit'].includes(o.status)).length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const urgent = orders.filter((o) => o.priority === 'urgent' && o.status === 'pending').length;
    const unassigned = orders.filter((o) => !o.driver && o.status === 'pending').length;
    const totalRevenue = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.total, 0);

    return {
      total,
      pending,
      inTransit,
      delivered,
      cancelled,
      urgent,
      unassigned,
      totalRevenue,
    };
  }, [orders]);

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter((o) => o.status === filters.status);
    }
    if (filters.priority !== 'all') {
      result = result.filter((o) => o.priority === filters.priority);
    }
    if (filters.paymentStatus !== 'all') {
      result = result.filter((o) => o.paymentStatus === filters.paymentStatus);
    }
    if (filters.customerType !== 'all') {
      result = result.filter((o) => o.customer.type === filters.customerType);
    }
    if (filters.hasDriver === 'assigned') {
      result = result.filter((o) => o.driver !== null);
    } else if (filters.hasDriver === 'unassigned') {
      result = result.filter((o) => o.driver === null);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (filters.dateRange) {
        case 'today':
          cutoff = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter((o) => new Date(o.createdAt) >= cutoff);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          (o.driver && o.driver.name.toLowerCase().includes(q)) ||
          o.pickup.address.toLowerCase().includes(q) ||
          o.dropoff.address.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'orderId':
          comparison = a.orderId.localeCompare(b.orderId);
          break;
        case 'customer':
          comparison = a.customer.name.localeCompare(b.customer.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [orders, filters, searchQuery, sortField, sortOrder]);

  // Paginated orders
  const paginatedOrders = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const end = start + pagination.itemsPerPage;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, pagination.currentPage, pagination.itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / pagination.itemsPerPage);

  // Orders grouped by status for Kanban view
  const ordersByStatus = useMemo(() => {
    const groups: Record<OrderStatus, Order[]> = {
      pending: [],
      assigned: [],
      'picked-up': [],
      'in-transit': [],
      delivered: [],
      cancelled: [],
      failed: [],
    };

    filteredOrders.forEach((order) => {
      groups[order.status].push(order);
    });

    return groups;
  }, [filteredOrders]);

  // Handlers
  const handleSelectOrder = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOrders.map((o) => o.id)));
    }
  };

  const handleAssignDriver = (orderId: string, driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              driver,
              status: 'assigned' as OrderStatus,
              timeline: [
                {
                  id: `t${Date.now()}`,
                  status: 'assigned',
                  description: `Driver ${driver.name} assigned`,
                  timestamp: new Date().toISOString(),
                  actor: 'Admin',
                },
                ...o.timeline,
              ],
            }
          : o
      )
    );

    setAssigningOrder(null);
    showToast('success', `Driver ${driver.name} assigned to order`);
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              ...(newStatus === 'delivered' ? { actualDelivery: new Date().toISOString() } : {}),
              timeline: [
                {
                  id: `t${Date.now()}`,
                  status: newStatus,
                  description: `Order ${STATUS_CONFIG[newStatus].label.toLowerCase()}`,
                  timestamp: new Date().toISOString(),
                  actor: 'Admin',
                },
                ...o.timeline,
              ],
            }
          : o
      )
    );

    showToast('success', `Order status updated to ${STATUS_CONFIG[newStatus].label}`);
    setSelectedOrder(null);
  };

  const handleCancelOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Order',
      message: `Are you sure you want to cancel order ${order.orderId}? This action cannot be undone.`,
      confirmLabel: 'Cancel Order',
      confirmVariant: 'danger',
      onConfirm: () => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'cancelled' as OrderStatus,
                  timeline: [
                    {
                      id: `t${Date.now()}`,
                      status: 'cancelled',
                      description: 'Order cancelled by admin',
                      timestamp: new Date().toISOString(),
                      actor: 'Admin',
                    },
                    ...o.timeline,
                  ],
                }
              : o
          )
        );

        setConfirmDialog(null);
        setSelectedOrder(null);
        showToast('success', `Order ${order.orderId} cancelled`);
      },
    });
  };

  // Drag and drop for Kanban
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    if (!draggedOrderId) return;

    const order = orders.find((o) => o.id === draggedOrderId);
    if (!order) return;

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['picked-up', 'cancelled'],
      'picked-up': ['in-transit'],
      'in-transit': ['delivered', 'failed'],
      delivered: [],
      cancelled: [],
      failed: [],
    };

    if (!validTransitions[order.status].includes(newStatus)) {
      showToast('error', `Cannot move order from ${order.status} to ${newStatus}`);
      setDraggedOrderId(null);
      return;
    }

    // Check if driver is assigned for certain transitions
    if (['picked-up', 'in-transit', 'delivered'].includes(newStatus) && !order.driver) {
      showToast('error', 'Please assign a driver first');
      setDraggedOrderId(null);
      return;
    }

    handleUpdateStatus(draggedOrderId, newStatus);
    setDraggedOrderId(null);
  };

  // Bulk actions
  const handleBulkCancel = () => {
    if (selectedIds.size === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Orders',
      message: `Are you sure you want to cancel ${selectedIds.size} orders? This action cannot be undone.`,
      confirmLabel: 'Cancel All',
      confirmVariant: 'danger',
      onConfirm: () => {
        setOrders((prev) =>
          prev.map((o) =>
            selectedIds.has(o.id) && ['pending', 'assigned'].includes(o.status)
              ? { ...o, status: 'cancelled' as OrderStatus }
              : o
          )
        );

        setSelectedIds(new Set());
        setConfirmDialog(null);
        showToast('success', `${selectedIds.size} orders cancelled`);
      },
    });
  };

  // Create manual order
  const handleCreateManualOrder = async (data: ManualOrderFormData) => {
    setIsCreatingOrder(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const now = new Date().toISOString();
    const orderNum = orders.length + 1;
    const validItems = data.items.filter((item) => item.name.trim() && item.quantity > 0 && item.price > 0);
    const subtotal = validItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const deliveryFee = 150;

    const newOrder: Order = {
      id: Date.now().toString(),
      orderId: `ORD-${2400 + orderNum}`,
      customer: {
        id: `c${Date.now()}`,
        name: data.customerName,
        type: data.customerType,
        phone: data.customerPhone,
        email: data.customerEmail || undefined,
      },
      pickup: {
        address: data.pickupAddress,
        city: data.pickupCity,
        contactName: data.pickupContact || undefined,
        contactPhone: data.pickupPhone || undefined,
      },
      dropoff: {
        address: data.dropoffAddress,
        city: data.dropoffCity,
        contactName: data.dropoffContact || undefined,
        contactPhone: data.dropoffPhone || undefined,
      },
      driver: null,
      status: 'pending',
      priority: data.priority,
      items: validItems.map((item, i) => ({
        id: `item-${Date.now()}-${i}`,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
      })),
      itemCount: validItems.length,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: 'INR',
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      createdAt: now,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
      estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      notes: data.notes || undefined,
      timeline: [
        {
          id: `t${Date.now()}`,
          status: 'created',
          description: 'Manual order created by admin',
          timestamp: now,
          actor: 'Admin',
        },
      ],
    };

    setOrders((prev) => [newOrder, ...prev]);
    setShowManualOrderModal(false);
    setIsCreatingOrder(false);
    showToast('success', `Order ${newOrder.orderId} created successfully`);
  };

  // Export function
  const handleExport = () => {
    const csvContent = [
      ['Order ID', 'Customer', 'Customer Type', 'Pickup', 'Dropoff', 'Driver', 'Status', 'Priority', 'Total', 'Payment', 'Created'],
      ...filteredOrders.map((o) => [
        o.orderId,
        o.customer.name,
        o.customer.type,
        o.pickup.address,
        o.dropoff.address,
        o.driver?.name || 'Unassigned',
        o.status,
        o.priority,
        o.total,
        o.paymentStatus,
        formatDateTime(o.createdAt),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Orders exported successfully');
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      paymentStatus: 'all',
      customerType: 'all',
      dateRange: 'all',
      hasDriver: 'all',
    });
    setSearchQuery('');
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.paymentStatus !== 'all' ||
    filters.customerType !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.hasDriver !== 'all';

  return (
    <div className="order-control-panel">
      {/* Statistics */}
      <div className="ocp-stats">
        <StatCard
          icon={<Package size={16} />}
          label="Total Orders"
          value={statistics.total}
          color="#3b82f6"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="Pending"
          value={statistics.pending}
          color="#d97706"
          onClick={() => setFilters((prev) => ({ ...prev, status: 'pending' }))}
        />
        <StatCard
          icon={<Truck size={16} />}
          label="In Transit"
          value={statistics.inTransit}
          color="#06b6d4"
        />
        <StatCard
          icon={<Check size={16} />}
          label="Delivered"
          value={statistics.delivered}
          color="#16a34a"
        />
        <StatCard
          icon={<Circle size={16} fill="#dc2626" color="#dc2626" />}
          label="Urgent"
          value={statistics.urgent}
          color="#dc2626"
          onClick={() => setFilters((prev) => ({ ...prev, priority: 'urgent' }))}
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="Unassigned"
          value={statistics.unassigned}
          color="#ea580c"
          onClick={() => setFilters((prev) => ({ ...prev, hasDriver: 'unassigned' }))}
        />
      </div>

      {/* Header */}
      <div className="ocp-header">
        <div className="ocp-header__left">
          <h1 className="ocp-header__title">Order Control Panel</h1>
          <p className="ocp-header__subtitle">
            Manage and track all orders in real-time
          </p>
        </div>
        <div className="ocp-header__right">
          <button className="ocp-btn ocp-btn--secondary" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
          <button className="ocp-btn ocp-btn--primary" onClick={() => setShowManualOrderModal(true)}>
            + Manual Order
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ocp-toolbar">
        <div className="ocp-toolbar__left">
          <div className="ocp-search">
            <span className="ocp-search__icon"><Search size={14} /></span>
            <input
              type="text"
              className="ocp-search__input"
              placeholder="Search orders, customers, drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="ocp-search__clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <button
            className={`ocp-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <span><SlidersHorizontal size={14} /></span>
            Filters
            {hasActiveFilters && <span className="ocp-filter-badge">!</span>}
          </button>
        </div>

        <div className="ocp-toolbar__right">
          <select
            className="ocp-select"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            className="ocp-select"
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value as any }))}
          >
            <option value="all">All Priority</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <div className="ocp-view-toggle">
            <button
              className={`ocp-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              className={`ocp-view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {viewMode === 'table' && (
            <button
              className={`ocp-selection-toggle ${selectionMode ? 'active' : ''}`}
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedIds(new Set());
              }}
            >
              <CheckSquare size={14} /> {selectionMode ? 'Exit' : 'Select'}
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="ocp-filters-panel">
          <div className="ocp-filters-row">
            <div className="ocp-filter-group">
              <label>Payment Status</label>
              <select
                className="ocp-select"
                value={filters.paymentStatus}
                onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value as any }))}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div className="ocp-filter-group">
              <label>Customer Type</label>
              <select
                className="ocp-select"
                value={filters.customerType}
                onChange={(e) => setFilters((prev) => ({ ...prev, customerType: e.target.value as any }))}
              >
                <option value="all">All</option>
                <option value="individual">Individual</option>
                <option value="ngo">NGO</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="ocp-filter-group">
              <label>Date Range</label>
              <select
                className="ocp-select"
                value={filters.dateRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value as any }))}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="ocp-filter-group">
              <label>Driver Assignment</label>
              <select
                className="ocp-select"
                value={filters.hasDriver}
                onChange={(e) => setFilters((prev) => ({ ...prev, hasDriver: e.target.value as any }))}
              >
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
            <button className="ocp-clear-filters" onClick={clearFilters}>
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="ocp-bulk-actions">
          <span className="ocp-bulk-actions__count">
            {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="ocp-bulk-actions__buttons">
            <button className="ocp-bulk-btn ocp-bulk-btn--danger" onClick={handleBulkCancel}>
              <X size={14} /> Cancel Selected
            </button>
            <button
              className="ocp-bulk-btn"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="ocp-content">
        {/* Table View */}
        {viewMode === 'table' && (
          <div className="ocp-table-wrapper">
            <table className="ocp-table">
              <thead>
                <tr>
                  {selectionMode && (
                    <th className="ocp-th-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                  )}
                  <th className="sortable" onClick={() => handleSort('orderId')}>
                    Order
                    {sortField === 'orderId' && <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                  </th>
                  <th className="sortable" onClick={() => handleSort('customer')}>
                    Customer
                    {sortField === 'customer' && <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                  </th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th className="sortable" onClick={() => handleSort('priority')}>
                    Priority
                    {sortField === 'priority' && <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    Status
                    {sortField === 'status' && <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                  </th>
                  <th className="sortable" onClick={() => handleSort('total')}>
                    Total
                    {sortField === 'total' && <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                  </th>
                  <th>ETA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={selectionMode ? 10 : 9}>
                      <div className="ocp-empty-state">
                        <span className="icon"><Package size={24} /></span>
                        <h3>No orders found</h3>
                        <p>Try adjusting your filters or search query</p>
                        {hasActiveFilters && (
                          <button className="ocp-btn ocp-btn--secondary" onClick={clearFilters}>
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      isSelected={selectedIds.has(order.id)}
                      onSelect={handleSelectOrder}
                      onView={setSelectedOrder}
                      onAssign={setAssigningOrder}
                      onUpdateStatus={handleUpdateStatus}
                      onCancel={handleCancelOrder}
                      selectionMode={selectionMode}
                    />
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="ocp-pagination">
                <div className="ocp-pagination__info">
                  <span>
                    Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, filteredOrders.length)} of{' '}
                    {filteredOrders.length} orders
                  </span>
                  <select
                    className="ocp-pagination__per-page"
                    value={pagination.itemsPerPage}
                    onChange={(e) =>
                      setPagination((prev) => ({
                        ...prev,
                        itemsPerPage: Number(e.target.value),
                        currentPage: 1,
                      }))
                    }
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} per page
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ocp-pagination__controls">
                  <button
                    className="ocp-pagination__btn"
                    onClick={() => setPagination((prev) => ({ ...prev, currentPage: 1 }))}
                    disabled={pagination.currentPage === 1}
                  >
                    ««
                  </button>
                  <button
                    className="ocp-pagination__btn"
                    onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={pagination.currentPage === 1}
                  >
                    ‹
                  </button>
                  <span className="ocp-pagination__current">
                    {pagination.currentPage} / {totalPages || 1}
                  </span>
                  <button
                    className="ocp-pagination__btn"
                    onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    disabled={pagination.currentPage === totalPages}
                  >
                    ›
                  </button>
                  <button
                    className="ocp-pagination__btn"
                    onClick={() => setPagination((prev) => ({ ...prev, currentPage: totalPages }))}
                    disabled={pagination.currentPage === totalPages}
                  >
                    »»
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="ocp-kanban">
            {(['pending', 'assigned', 'picked-up', 'in-transit', 'delivered'] as OrderStatus[]).map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                orders={ordersByStatus[status]}
                onView={setSelectedOrder}
                onAssign={setAssigningOrder}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAssign={setAssigningOrder}
          onUpdateStatus={handleUpdateStatus}
          onCancel={handleCancelOrder}
        />
      )}

      {/* Driver Assignment Modal */}
      {assigningOrder && (
        <DriverAssignmentModal
          order={assigningOrder}
          drivers={drivers}
          onClose={() => setAssigningOrder(null)}
          onAssign={handleAssignDriver}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmVariant={confirmDialog.confirmVariant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          isLoading={isLoading}
        />
      )}

      {/* Manual Order Modal */}
      {showManualOrderModal && (
        <ManualOrderModal
          onClose={() => setShowManualOrderModal(false)}
          onSubmit={handleCreateManualOrder}
          isLoading={isCreatingOrder}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default OrderControlPanel;