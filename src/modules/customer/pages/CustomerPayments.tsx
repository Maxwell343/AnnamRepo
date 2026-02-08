import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerPayments.css';

// ============================================
// TYPES
// ============================================

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  name: string;
  details: string;
  icon: string;
  isDefault: boolean;
  isVerified: boolean;
  lastUsed?: string;
  expiryDate?: string;
  cardBrand?: 'visa' | 'mastercard' | 'rupay' | 'amex';
  bankName?: string;
  walletProvider?: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'cashback' | 'wallet_credit' | 'wallet_debit';
  amount: number;
  status: 'success' | 'pending' | 'failed' | 'processing';
  description: string;
  orderId?: string;
  paymentMethod: string;
  date: string;
  refundReason?: string;
}

interface WalletData {
  balance: number;
  currency: string;
  lastUpdated: string;
  pendingCashback: number;
  lifetimeCashback: number;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  code?: string;
  discount: string;
  validTill: string;
  minOrder?: number;
  maxDiscount?: number;
  paymentMethods: string[];
  isActive: boolean;
}

interface User {
  id: number;
  name: string;
  role: 'customer';
  email?: string;
  phone?: string;
}

// ============================================
// CONSTANTS
// ============================================

const CARD_BRANDS = {
  visa: { name: 'Visa', color: '#1A1F71', icon: '💳' },
  mastercard: { name: 'Mastercard', color: '#EB001B', icon: '💳' },
  rupay: { name: 'RuPay', color: '#097969', icon: '💳' },
  amex: { name: 'American Express', color: '#006FCF', icon: '💳' }
};

const WALLET_PROVIDERS = {
  paytm: { name: 'Paytm', color: '#00BAF2', icon: '📱' },
  phonepe: { name: 'PhonePe', color: '#5F259F', icon: '📱' },
  googlepay: { name: 'Google Pay', color: '#4285F4', icon: '📱' },
  amazonpay: { name: 'Amazon Pay', color: '#FF9900', icon: '📱' }
};

const BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'IndusInd Bank'
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateId = (): string => {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const maskCardNumber = (last4: string): string => {
  return `•••• •••• •••• ${last4}`;
};

const maskUPI = (upiId: string): string => {
  const parts = upiId.split('@');
  if (parts.length !== 2) return upiId;
  const masked = parts[0].slice(0, 2) + '••••' + parts[0].slice(-2);
  return `${masked}@${parts[1]}`;
};

const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

// Toast notification
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  
  const toast = document.createElement('div');
  toast.className = `payment-toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;
  
  const container = document.getElementById('toast-container') || (() => {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
  })();
  
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// ============================================
// CUSTOM HOOKS
// ============================================

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
};

// ============================================
// MOCK DATA
// ============================================

const generateMockPaymentMethods = (): PaymentMethod[] => [
  {
    id: 'pm_1',
    type: 'card',
    name: 'HDFC Bank Debit Card',
    details: '4532',
    icon: '💳',
    isDefault: true,
    isVerified: true,
    lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: '12/26',
    cardBrand: 'visa',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pm_2',
    type: 'upi',
    name: 'UPI',
    details: 'user@okaxis',
    icon: '📱',
    isDefault: false,
    isVerified: true,
    lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pm_3',
    type: 'card',
    name: 'ICICI Bank Credit Card',
    details: '8901',
    icon: '💳',
    isDefault: false,
    isVerified: true,
    expiryDate: '08/25',
    cardBrand: 'mastercard',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pm_4',
    type: 'wallet',
    name: 'Paytm Wallet',
    details: 'Linked',
    icon: '📱',
    isDefault: false,
    isVerified: true,
    walletProvider: 'paytm',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const generateMockTransactions = (): Transaction[] => [
  {
    id: 'txn_1',
    type: 'payment',
    amount: 1250,
    status: 'success',
    description: 'Order #ORD-2024-1234',
    orderId: 'ORD-2024-1234',
    paymentMethod: 'HDFC Bank •••• 4532',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'txn_2',
    type: 'cashback',
    amount: 50,
    status: 'success',
    description: 'Cashback on Order #ORD-2024-1234',
    paymentMethod: 'Annam Wallet',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'txn_3',
    type: 'refund',
    amount: 350,
    status: 'processing',
    description: 'Refund for Order #ORD-2024-1200',
    orderId: 'ORD-2024-1200',
    paymentMethod: 'HDFC Bank •••• 4532',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    refundReason: 'Product quality issue'
  },
  {
    id: 'txn_4',
    type: 'payment',
    amount: 890,
    status: 'success',
    description: 'Order #ORD-2024-1198',
    orderId: 'ORD-2024-1198',
    paymentMethod: 'UPI - user@okaxis',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'txn_5',
    type: 'wallet_credit',
    amount: 500,
    status: 'success',
    description: 'Added money to wallet',
    paymentMethod: 'ICICI Bank •••• 8901',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'txn_6',
    type: 'payment',
    amount: 2100,
    status: 'failed',
    description: 'Order #ORD-2024-1150 (Failed)',
    orderId: 'ORD-2024-1150',
    paymentMethod: 'HDFC Bank •••• 4532',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'txn_7',
    type: 'refund',
    amount: 750,
    status: 'success',
    description: 'Refund for Order #ORD-2024-1100',
    orderId: 'ORD-2024-1100',
    paymentMethod: 'HDFC Bank •••• 4532',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const generateMockOffers = (): Offer[] => [
  {
    id: 'offer_1',
    title: '10% Cashback on UPI',
    description: 'Get 10% cashback up to ₹100 on UPI payments',
    discount: '10% up to ₹100',
    validTill: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    minOrder: 500,
    maxDiscount: 100,
    paymentMethods: ['upi'],
    isActive: true
  },
  {
    id: 'offer_2',
    title: 'HDFC Card Offer',
    description: '15% instant discount on HDFC Bank cards',
    code: 'HDFC15',
    discount: '15% off',
    validTill: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    minOrder: 1000,
    maxDiscount: 300,
    paymentMethods: ['card'],
    isActive: true
  },
  {
    id: 'offer_3',
    title: 'First Wallet Payment',
    description: 'Flat ₹50 off on first Annam Wallet payment',
    code: 'WALLET50',
    discount: '₹50 off',
    validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethods: ['wallet'],
    isActive: true
  },
  {
    id: 'offer_4',
    title: 'Weekend Special',
    description: 'Extra 5% cashback on all payments this weekend',
    discount: '5% cashback',
    validTill: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethods: ['card', 'upi', 'wallet', 'netbanking'],
    isActive: true
  }
];

// ============================================
// COMPONENTS
// ============================================

// Magnetic Button
const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, className = '', onClick, disabled, type = 'button' }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPosition({ x: x * 0.15, y: y * 0.15 });
  };

  const handleMouseLeave = () => setPosition({ x: 0, y: 0 });

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`magnetic-btn ${className}`}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {children}
    </button>
  );
};

// Wallet Card Component
const WalletCard: React.FC<{
  wallet: WalletData;
  onAddMoney: () => void;
  onViewHistory: () => void;
}> = ({ wallet, onAddMoney, onViewHistory }) => {
  return (
    <div className="wallet-card">
      <div className="wallet-bg">
        <div className="wallet-pattern" />
      </div>
      
      <div className="wallet-content">
        <div className="wallet-header">
          <div className="wallet-logo">
            <span className="logo-icon">🌾</span>
            <span className="logo-text">Annam Wallet</span>
          </div>
          <span className="wallet-badge">💎 Premium</span>
        </div>
        
        <div className="wallet-balance">
          <span className="balance-label">Available Balance</span>
          <span className="balance-amount">{formatCurrency(wallet.balance)}</span>
        </div>
        
        <div className="wallet-stats">
          <div className="wallet-stat">
            <span className="stat-icon">🎁</span>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(wallet.pendingCashback)}</span>
              <span className="stat-label">Pending Cashback</span>
            </div>
          </div>
          <div className="wallet-stat">
            <span className="stat-icon">💰</span>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(wallet.lifetimeCashback)}</span>
              <span className="stat-label">Lifetime Earnings</span>
            </div>
          </div>
        </div>
        
        <div className="wallet-actions">
          <MagneticButton className="btn-add-money" onClick={onAddMoney}>
            <span className="btn-icon">+</span>
            <span>Add Money</span>
          </MagneticButton>
          <button className="btn-history" onClick={onViewHistory}>
            <span className="btn-icon">📜</span>
            <span>History</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment Method Card Component
const PaymentMethodCard: React.FC<{
  method: PaymentMethod;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  index: number;
}> = ({ method, onEdit, onDelete, onSetDefault, index }) => {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getMethodIcon = () => {
    if (method.type === 'card' && method.cardBrand) {
      return CARD_BRANDS[method.cardBrand]?.icon || '💳';
    }
    if (method.type === 'upi') return '📲';
    if (method.type === 'netbanking') return '🏦';
    if (method.type === 'wallet') return '📱';
    return '💳';
  };

  const getMethodColor = () => {
    if (method.type === 'card' && method.cardBrand) {
      return CARD_BRANDS[method.cardBrand]?.color || '#333';
    }
    if (method.type === 'upi') return '#4CAF50';
    if (method.type === 'netbanking') return '#2196F3';
    if (method.type === 'wallet' && method.walletProvider) {
      return WALLET_PROVIDERS[method.walletProvider as keyof typeof WALLET_PROVIDERS]?.color || '#FF9800';
    }
    return '#333';
  };

  const getDisplayDetails = () => {
    if (method.type === 'card') {
      return maskCardNumber(method.details);
    }
    if (method.type === 'upi') {
      return method.details;
    }
    return method.details;
  };

  return (
    <div 
      className={`payment-method-card ${method.isDefault ? 'default' : ''}`}
      style={{ animationDelay: `${index * 50}ms`, '--method-color': getMethodColor() } as React.CSSProperties}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {method.isDefault && (
        <div className="default-ribbon">
          <span>⭐ Default</span>
        </div>
      )}
      
      <div className="method-icon-wrapper" style={{ backgroundColor: `${getMethodColor()}15` }}>
        <span className="method-icon" style={{ color: getMethodColor() }}>
          {getMethodIcon()}
        </span>
      </div>
      
      <div className="method-info">
        <div className="method-name">
          {method.name}
          {method.isVerified && <span className="verified-icon" title="Verified">✓</span>}
        </div>
        <div className="method-details">{getDisplayDetails()}</div>
        {method.expiryDate && (
          <div className="method-expiry">Expires {method.expiryDate}</div>
        )}
        {method.lastUsed && (
          <div className="method-last-used">Last used {getRelativeTime(method.lastUsed)}</div>
        )}
      </div>
      
      <div className={`method-actions ${showActions ? 'visible' : ''}`}>
        {!method.isDefault && (
          <button 
            className="action-btn set-default"
            onClick={() => onSetDefault(method.id)}
            title="Set as default"
          >
            ⭐
          </button>
        )}
        <button 
          className="action-btn edit"
          onClick={() => onEdit(method)}
          title="Edit"
        >
          ✏️
        </button>
        <button 
          className="action-btn delete"
          onClick={() => setShowDeleteConfirm(true)}
          title="Remove"
        >
          🗑️
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="delete-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <h4>Remove Payment Method?</h4>
            <p>This payment method will be removed from your account.</p>
            <div className="delete-actions">
              <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="confirm-delete" onClick={() => {
                onDelete(method.id);
                setShowDeleteConfirm(false);
              }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Transaction Item Component
const TransactionItem: React.FC<{
  transaction: Transaction;
  onClick: (transaction: Transaction) => void;
  index: number;
}> = ({ transaction, onClick, index }) => {
  const getTypeIcon = () => {
    switch (transaction.type) {
      case 'payment': return '🛒';
      case 'refund': return '↩️';
      case 'cashback': return '🎁';
      case 'wallet_credit': return '➕';
      case 'wallet_debit': return '➖';
      default: return '💰';
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'success': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAmountPrefix = () => {
    if (transaction.type === 'refund' || transaction.type === 'cashback' || transaction.type === 'wallet_credit') {
      return '+';
    }
    if (transaction.type === 'payment' || transaction.type === 'wallet_debit') {
      return '-';
    }
    return '';
  };

  const getAmountClass = () => {
    if (transaction.type === 'refund' || transaction.type === 'cashback' || transaction.type === 'wallet_credit') {
      return 'credit';
    }
    return 'debit';
  };

  return (
    <div 
      className={`transaction-item ${transaction.status}`}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => onClick(transaction)}
    >
      <div className="txn-icon-wrapper">
        <span className="txn-icon">{getTypeIcon()}</span>
      </div>
      
      <div className="txn-info">
        <div className="txn-description">{transaction.description}</div>
        <div className="txn-meta">
          <span className="txn-method">{transaction.paymentMethod}</span>
          <span className="txn-separator">•</span>
          <span className="txn-time">{getRelativeTime(transaction.date)}</span>
        </div>
      </div>
      
      <div className="txn-amount-section">
        <span className={`txn-amount ${getAmountClass()}`}>
          {getAmountPrefix()}{formatCurrency(transaction.amount)}
        </span>
        <span 
          className="txn-status"
          style={{ color: getStatusColor(), backgroundColor: `${getStatusColor()}15` }}
        >
          {transaction.status === 'success' ? '✓' : 
           transaction.status === 'processing' ? '⏳' :
           transaction.status === 'pending' ? '⏰' : '✕'}
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </span>
      </div>
      
      <span className="txn-arrow">›</span>
    </div>
  );
};

// Offer Card Component
const OfferCard: React.FC<{
  offer: Offer;
  onApply: (offer: Offer) => void;
  index: number;
}> = ({ offer, onApply, index }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (offer.code) {
      navigator.clipboard.writeText(offer.code);
      setCopied(true);
      showToast('Code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const valid = new Date(offer.validTill);
    const days = Math.ceil((valid.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day left';
    if (days <= 7) return `${days} days left`;
    return `Valid till ${formatDate(offer.validTill)}`;
  };

  const getPaymentIcons = () => {
    const icons: { [key: string]: string } = {
      card: '💳',
      upi: '📲',
      wallet: '📱',
      netbanking: '🏦'
    };
    return offer.paymentMethods.map(m => icons[m] || '💰').join(' ');
  };

  return (
    <div 
      className="offer-card"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="offer-badge">
        <span className="offer-discount">{offer.discount}</span>
      </div>
      
      <div className="offer-content">
        <h4 className="offer-title">{offer.title}</h4>
        <p className="offer-description">{offer.description}</p>
        
        <div className="offer-meta">
          <span className="offer-methods">{getPaymentIcons()}</span>
          <span className="offer-validity">⏰ {getDaysRemaining()}</span>
        </div>
        
        {offer.minOrder && (
          <div className="offer-condition">
            Min. order: {formatCurrency(offer.minOrder)}
          </div>
        )}
      </div>
      
      <div className="offer-actions">
        {offer.code ? (
          <button 
            className={`btn-copy-code ${copied ? 'copied' : ''}`}
            onClick={copyCode}
          >
            <span className="code-text">{offer.code}</span>
            <span className="copy-icon">{copied ? '✓' : '📋'}</span>
          </button>
        ) : (
          <MagneticButton 
            className="btn-apply-offer"
            onClick={() => onApply(offer)}
          >
            Apply Now
          </MagneticButton>
        )}
      </div>
    </div>
  );
};

// Add Payment Method Modal
const AddPaymentMethodModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (method: Omit<PaymentMethod, 'id' | 'createdAt'>) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [step, setStep] = useState<'select' | 'card' | 'upi' | 'netbanking'>('select');
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardName: '',
    upiId: '',
    bankName: '',
    setAsDefault: false
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setFormData({
        cardNumber: '',
        cardExpiry: '',
        cardCvv: '',
        cardName: '',
        upiId: '',
        bankName: '',
        setAsDefault: false
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue = value;

    // Format card number
    if (name === 'cardNumber') {
      newValue = value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
    }
    
    // Format expiry
    if (name === 'cardExpiry') {
      newValue = value.replace(/\D/g, '').slice(0, 4);
      if (newValue.length >= 2) {
        newValue = newValue.slice(0, 2) + '/' + newValue.slice(2);
      }
    }

    // Format CVV
    if (name === 'cardCvv') {
      newValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : newValue
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateCard = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (formData.cardNumber.replace(/\s/g, '').length < 16) {
      newErrors.cardNumber = 'Enter valid 16-digit card number';
    }
    if (!formData.cardExpiry || formData.cardExpiry.length < 5) {
      newErrors.cardExpiry = 'Enter valid expiry date';
    }
    if (!formData.cardCvv || formData.cardCvv.length < 3) {
      newErrors.cardCvv = 'Enter valid CVV';
    }
    if (!formData.cardName.trim()) {
      newErrors.cardName = 'Enter cardholder name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUPI = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.upiId || !formData.upiId.includes('@')) {
      newErrors.upiId = 'Enter valid UPI ID';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (step === 'card' && !validateCard()) return;
    if (step === 'upi' && !validateUPI()) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newMethod: Omit<PaymentMethod, 'id' | 'createdAt'> = {
      type: step as any,
      name: step === 'card' 
        ? `${formData.cardName}'s Card`
        : step === 'upi'
        ? 'UPI'
        : formData.bankName,
      details: step === 'card'
        ? formData.cardNumber.slice(-4)
        : step === 'upi'
        ? formData.upiId
        : 'Net Banking',
      icon: step === 'card' ? '💳' : step === 'upi' ? '📲' : '🏦',
      isDefault: formData.setAsDefault,
      isVerified: true,
      cardBrand: step === 'card' ? 'visa' : undefined,
      bankName: step === 'netbanking' ? formData.bankName : undefined
    };

    onAdd(newMethod);
    setIsSubmitting(false);
    onClose();
    showToast('Payment method added successfully!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-method-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button 
            className="back-btn"
            onClick={() => step === 'select' ? onClose() : setStep('select')}
          >
            {step === 'select' ? '✕' : '←'}
          </button>
          <h2>
            {step === 'select' ? 'Add Payment Method' :
             step === 'card' ? 'Add Card' :
             step === 'upi' ? 'Add UPI' : 'Add Net Banking'}
          </h2>
        </div>

        <div className="modal-content">
          {step === 'select' && (
            <div className="method-options">
              <button className="method-option" onClick={() => setStep('card')}>
                <span className="option-icon">💳</span>
                <div className="option-info">
                  <span className="option-title">Credit / Debit Card</span>
                  <span className="option-desc">Visa, Mastercard, RuPay</span>
                </div>
                <span className="option-arrow">›</span>
              </button>
              
              <button className="method-option" onClick={() => setStep('upi')}>
                <span className="option-icon">📲</span>
                <div className="option-info">
                  <span className="option-title">UPI</span>
                  <span className="option-desc">GPay, PhonePe, Paytm & more</span>
                </div>
                <span className="option-arrow">›</span>
              </button>
              
              <button className="method-option" onClick={() => setStep('netbanking')}>
                <span className="option-icon">🏦</span>
                <div className="option-info">
                  <span className="option-title">Net Banking</span>
                  <span className="option-desc">All major banks supported</span>
                </div>
                <span className="option-arrow">›</span>
              </button>
            </div>
          )}

          {step === 'card' && (
            <div className="card-form">
              <div className="card-preview">
                <div className="preview-card">
                  <div className="card-chip" />
                  <div className="card-number">
                    {formData.cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="card-bottom">
                    <div className="card-holder">
                      <span className="label">Card Holder</span>
                      <span className="value">{formData.cardName || 'YOUR NAME'}</span>
                    </div>
                    <div className="card-expiry-preview">
                      <span className="label">Expires</span>
                      <span className="value">{formData.cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`form-group ${errors.cardNumber ? 'error' : ''}`}>
                <label>Card Number</label>
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                />
                {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
              </div>

              <div className="form-row">
                <div className={`form-group ${errors.cardExpiry ? 'error' : ''}`}>
                  <label>Expiry Date</label>
                  <input
                    type="text"
                    name="cardExpiry"
                    placeholder="MM/YY"
                    value={formData.cardExpiry}
                    onChange={handleInputChange}
                  />
                  {errors.cardExpiry && <span className="error-text">{errors.cardExpiry}</span>}
                </div>
                <div className={`form-group ${errors.cardCvv ? 'error' : ''}`}>
                  <label>CVV</label>
                  <input
                    type="password"
                    name="cardCvv"
                    placeholder="•••"
                    value={formData.cardCvv}
                    onChange={handleInputChange}
                  />
                  {errors.cardCvv && <span className="error-text">{errors.cardCvv}</span>}
                </div>
              </div>

              <div className={`form-group ${errors.cardName ? 'error' : ''}`}>
                <label>Cardholder Name</label>
                <input
                  type="text"
                  name="cardName"
                  placeholder="Name on card"
                  value={formData.cardName}
                  onChange={handleInputChange}
                />
                {errors.cardName && <span className="error-text">{errors.cardName}</span>}
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="setAsDefault"
                  checked={formData.setAsDefault}
                  onChange={handleInputChange}
                />
                <span className="checkbox-custom" />
                <span>Set as default payment method</span>
              </label>
            </div>
          )}

          {step === 'upi' && (
            <div className="upi-form">
              <div className="upi-apps">
                <span className="upi-app">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/512px-Google_Pay_Logo.svg.png" alt="GPay" />
                </span>
                <span className="upi-app">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/512px-PhonePe_Logo.svg.png" alt="PhonePe" />
                </span>
                <span className="upi-app">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/512px-Paytm_Logo_%28standalone%29.svg.png" alt="Paytm" />
                </span>
              </div>

              <div className={`form-group ${errors.upiId ? 'error' : ''}`}>
                <label>UPI ID</label>
                <input
                  type="text"
                  name="upiId"
                  placeholder="yourname@upi"
                  value={formData.upiId}
                  onChange={handleInputChange}
                />
                {errors.upiId && <span className="error-text">{errors.upiId}</span>}
                <span className="form-hint">Enter your UPI ID linked to any UPI app</span>
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="setAsDefault"
                  checked={formData.setAsDefault}
                  onChange={handleInputChange}
                />
                <span className="checkbox-custom" />
                <span>Set as default payment method</span>
              </label>
            </div>
          )}

          {step === 'netbanking' && (
            <div className="netbanking-form">
              <div className="popular-banks">
                <h4>Popular Banks</h4>
                <div className="bank-grid">
                  {BANKS.slice(0, 6).map(bank => (
                    <button
                      key={bank}
                      className={`bank-option ${formData.bankName === bank ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, bankName: bank }))}
                    >
                      <span className="bank-icon">🏦</span>
                      <span className="bank-name">{bank}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Or Select Bank</label>
                <select
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                >
                  <option value="">Select your bank</option>
                  {BANKS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="setAsDefault"
                  checked={formData.setAsDefault}
                  onChange={handleInputChange}
                />
                <span className="checkbox-custom" />
                <span>Set as default payment method</span>
              </label>
            </div>
          )}
        </div>

        {step !== 'select' && (
          <div className="modal-footer">
            <MagneticButton
              className={`btn-submit ${isSubmitting ? 'submitting' : ''}`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">✓</span>
                  <span>Add Payment Method</span>
                </>
              )}
            </MagneticButton>
            
            <div className="security-note">
              <span className="security-icon">🔒</span>
              <span>Your payment information is encrypted and secure</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add Money Modal
const AddMoneyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (amount: number) => void;
  paymentMethods: PaymentMethod[];
}> = ({ isOpen, onClose, onAdd, paymentMethods }) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const quickAmounts = [100, 250, 500, 1000, 2000, 5000];

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSelectedMethod(paymentMethods.find(m => m.isDefault)?.id || paymentMethods[0]?.id || '');
    }
  }, [isOpen, paymentMethods]);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      showToast('Minimum amount is ₹10', 'error');
      return;
    }
    if (!selectedMethod) {
      showToast('Please select a payment method', 'error');
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onAdd(numAmount);
    setIsProcessing(false);
    onClose();
    showToast(`₹${numAmount} added to wallet successfully!`, 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-money-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Money to Wallet</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="amount-input-section">
            <label>Enter Amount</label>
            <div className="amount-input">
              <span className="currency">₹</span>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="10"
                max="100000"
              />
            </div>
            <span className="amount-hint">Min ₹10 • Max ₹1,00,000</span>
          </div>

          <div className="quick-amounts">
            {quickAmounts.map(amt => (
              <button
                key={amt}
                className={`quick-amount ${amount === String(amt) ? 'selected' : ''}`}
                onClick={() => setAmount(String(amt))}
              >
                +₹{amt}
              </button>
            ))}
          </div>

          <div className="payment-methods-section">
            <label>Pay Using</label>
            <div className="methods-list">
              {paymentMethods.filter(m => m.type !== 'wallet').map(method => (
                <button
                  key={method.id}
                  className={`method-option ${selectedMethod === method.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <span className="method-icon">{method.icon}</span>
                  <div className="method-info">
                    <span className="method-name">{method.name}</span>
                    <span className="method-details">
                      {method.type === 'card' ? `•••• ${method.details}` : method.details}
                    </span>
                  </div>
                  {selectedMethod === method.id && (
                    <span className="selected-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <MagneticButton
            className={`btn-add-money ${isProcessing ? 'processing' : ''}`}
            onClick={handleSubmit}
            disabled={isProcessing || !amount || parseFloat(amount) < 10}
          >
            {isProcessing ? (
              <>
                <span className="spinner" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Add {amount ? formatCurrency(parseFloat(amount)) : 'Money'}</span>
              </>
            )}
          </MagneticButton>
        </div>
      </div>
    </div>
  );
};

// Transaction Detail Modal
const TransactionDetailModal: React.FC<{
  transaction: Transaction | null;
  onClose: () => void;
}> = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const getStatusDetails = () => {
    switch (transaction.status) {
      case 'success':
        return { icon: '✓', color: '#22c55e', text: 'Successful' };
      case 'pending':
        return { icon: '⏰', color: '#f59e0b', text: 'Pending' };
      case 'processing':
        return { icon: '⏳', color: '#3b82f6', text: 'Processing' };
      case 'failed':
        return { icon: '✕', color: '#ef4444', text: 'Failed' };
      default:
        return { icon: '?', color: '#6b7280', text: 'Unknown' };
    }
  };

  const status = getStatusDetails();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="transaction-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Transaction Details</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="txn-status-banner" style={{ backgroundColor: `${status.color}10` }}>
            <span className="status-icon" style={{ backgroundColor: status.color }}>
              {status.icon}
            </span>
            <div className="status-info">
              <span className="status-text" style={{ color: status.color }}>{status.text}</span>
              <span className="status-time">{formatDateTime(transaction.date)}</span>
            </div>
          </div>

          <div className="txn-amount-display">
            <span className="amount-label">
              {transaction.type === 'refund' || transaction.type === 'cashback' ? 'Amount Credited' : 'Amount Paid'}
            </span>
            <span className={`amount-value ${transaction.type === 'refund' || transaction.type === 'cashback' ? 'credit' : ''}`}>
              {transaction.type === 'refund' || transaction.type === 'cashback' ? '+' : ''}
              {formatCurrency(transaction.amount)}
            </span>
          </div>

          <div className="txn-details-grid">
            <div className="detail-row">
              <span className="detail-label">Transaction ID</span>
              <span className="detail-value">{transaction.id}</span>
            </div>
            {transaction.orderId && (
              <div className="detail-row">
                <span className="detail-label">Order ID</span>
                <span className="detail-value order-link">{transaction.orderId}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Payment Method</span>
              <span className="detail-value">{transaction.paymentMethod}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Transaction Type</span>
              <span className="detail-value">{transaction.type.replace('_', ' ').toUpperCase()}</span>
            </div>
            {transaction.refundReason && (
              <div className="detail-row">
                <span className="detail-label">Refund Reason</span>
                <span className="detail-value">{transaction.refundReason}</span>
              </div>
            )}
          </div>

          {transaction.status === 'processing' && transaction.type === 'refund' && (
            <div className="refund-timeline">
              <h4>Refund Timeline</h4>
              <div className="timeline-steps">
                <div className="timeline-step completed">
                  <span className="step-icon">✓</span>
                  <span className="step-text">Refund Initiated</span>
                </div>
                <div className="timeline-step active">
                  <span className="step-icon">⏳</span>
                  <span className="step-text">Processing by Bank</span>
                </div>
                <div className="timeline-step">
                  <span className="step-icon">○</span>
                  <span className="step-text">Credited to Account</span>
                </div>
              </div>
              <p className="timeline-note">Expected by {formatDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString())}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-download">
            <span>📄</span>
            Download Receipt
          </button>
          <button className="btn-help">
            <span>❓</span>
            Need Help?
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const CustomerPayments: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'methods' | 'transactions' | 'offers' | 'wallet'>('wallet');
  const [paymentMethods, setPaymentMethods] = useLocalStorage<PaymentMethod[]>('customer-payment-methods', generateMockPaymentMethods());
  const [transactions] = useState<Transaction[]>(generateMockTransactions());
  const [offers] = useState<Offer[]>(generateMockOffers());
  const [wallet, setWallet] = useLocalStorage<WalletData>('customer-wallet', {
    balance: 1250,
    currency: 'INR',
    lastUpdated: new Date().toISOString(),
    pendingCashback: 75,
    lifetimeCashback: 2340
  });
  
  // Modals
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'payments' | 'refunds' | 'cashback'>('all');
  
  const [isLoading, setIsLoading] = useState(true);

  // Load user
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.role === 'customer') {
          setUser(parsedUser);
        } else {
          navigate('/auth');
          return;
        }
      } catch (e) {
        navigate('/auth');
        return;
      }
    } else {
      navigate('/auth');
      return;
    }
    
    setTimeout(() => setIsLoading(false), 500);
  }, [navigate]);

  // Handlers
  const handleAddPaymentMethod = (method: Omit<PaymentMethod, 'id' | 'createdAt'>) => {
    const newMethod: PaymentMethod = {
      ...method,
      id: generateId(),
      createdAt: new Date().toISOString()
    };

    setPaymentMethods(prev => {
      if (method.isDefault) {
        return [...prev.map(m => ({ ...m, isDefault: false })), newMethod];
      }
      return [...prev, newMethod];
    });
  };

  const handleDeleteMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(m => m.id !== id));
    showToast('Payment method removed', 'success');
  };

  const handleSetDefaultMethod = (id: string) => {
    setPaymentMethods(prev => prev.map(m => ({
      ...m,
      isDefault: m.id === id
    })));
    showToast('Default payment method updated', 'success');
  };

  const handleAddMoney = (amount: number) => {
    setWallet(prev => ({
      ...prev,
      balance: prev.balance + amount,
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleApplyOffer = (offer: Offer) => {
    showToast(`Offer "${offer.title}" will be applied at checkout`, 'success');
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(txn => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'payments') return txn.type === 'payment';
    if (transactionFilter === 'refunds') return txn.type === 'refund';
    if (transactionFilter === 'cashback') return txn.type === 'cashback' || txn.type === 'wallet_credit';
    return true;
  });

  if (!user) {
    return (
      <div className="payments-loading">
        <div className="loader">
          <span className="loader-icon">💳</span>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-payments">
      {/* Background */}
      <div className="payments-bg">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
      </div>

      {/* Header */}
      <header className="payments-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate('/customer-home')}>
            <span>←</span>
            <span className="back-text">Back</span>
          </button>
          
          <div className="header-title">
            <h1>
              <span className="title-icon">💳</span>
              Payments
            </h1>
            <p>Manage your payment methods & wallet</p>
          </div>

          <div className="header-actions">
            <button className="security-btn" title="Security Settings">
              🔒
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="payments-tabs">
        <div className="tabs-container">
          {[
            { id: 'wallet', label: 'Wallet', icon: '👛', badge: formatCurrency(wallet.balance) },
            { id: 'methods', label: 'Payment Methods', icon: '💳', badge: String(paymentMethods.length) },
            { id: 'transactions', label: 'Transactions', icon: '📜' },
            { id: 'offers', label: 'Offers', icon: '🎁', badge: String(offers.length) }
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="payments-main">
        {isLoading ? (
          <div className="loading-content">
            <div className="skeleton-wallet" />
            <div className="skeleton-cards">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div className="wallet-tab">
                <WalletCard
                  wallet={wallet}
                  onAddMoney={() => setIsAddMoneyOpen(true)}
                  onViewHistory={() => setActiveTab('transactions')}
                />

                <div className="wallet-features">
                  <h3>Wallet Features</h3>
                  <div className="features-grid">
                    <div className="feature-card">
                      <span className="feature-icon">⚡</span>
                      <div className="feature-info">
                        <h4>Instant Checkout</h4>
                        <p>Pay with one tap using wallet balance</p>
                      </div>
                    </div>
                    <div className="feature-card">
                      <span className="feature-icon">🎁</span>
                      <div className="feature-info">
                        <h4>Cashback Rewards</h4>
                        <p>Earn cashback on every wallet payment</p>
                      </div>
                    </div>
                    <div className="feature-card">
                      <span className="feature-icon">↩️</span>
                      <div className="feature-info">
                        <h4>Instant Refunds</h4>
                        <p>Get refunds directly to your wallet</p>
                      </div>
                    </div>
                    <div className="feature-card">
                      <span className="feature-icon">🔒</span>
                      <div className="feature-info">
                        <h4>Secure & Protected</h4>
                        <p>Bank-grade security for your money</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="recent-wallet-activity">
                  <div className="section-header">
                    <h3>Recent Activity</h3>
                    <button onClick={() => setActiveTab('transactions')}>View All →</button>
                  </div>
                  <div className="activity-list">
                    {transactions.slice(0, 3).map((txn, idx) => (
                      <TransactionItem
                        key={txn.id}
                        transaction={txn}
                        onClick={setSelectedTransaction}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'methods' && (
              <div className="methods-tab">
                <div className="section-header">
                  <h3>Saved Payment Methods</h3>
                  <MagneticButton
                    className="btn-add-method"
                    onClick={() => setIsAddMethodOpen(true)}
                  >
                    <span>+</span>
                    <span>Add New</span>
                  </MagneticButton>
                </div>

                {paymentMethods.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💳</div>
                    <h3>No payment methods saved</h3>
                    <p>Add a payment method for faster checkout</p>
                    <MagneticButton
                      className="btn-add-first"
                      onClick={() => setIsAddMethodOpen(true)}
                    >
                      Add Payment Method
                    </MagneticButton>
                  </div>
                ) : (
                  <div className="methods-grid">
                    {paymentMethods.map((method, idx) => (
                      <PaymentMethodCard
                        key={method.id}
                        method={method}
                        onEdit={() => {}}
                        onDelete={handleDeleteMethod}
                        onSetDefault={handleSetDefaultMethod}
                        index={idx}
                      />
                    ))}
                    
                    <button
                      className="add-method-card"
                      onClick={() => setIsAddMethodOpen(true)}
                    >
                      <div className="add-icon">+</div>
                      <span>Add Payment Method</span>
                    </button>
                  </div>
                )}

                <div className="payment-security">
                  <div className="security-header">
                    <span className="security-icon">🔒</span>
                    <h4>Your payments are secure</h4>
                  </div>
                  <div className="security-features">
                    <div className="security-feature">
                      <span>✓</span>
                      <span>256-bit encryption</span>
                    </div>
                    <div className="security-feature">
                      <span>✓</span>
                      <span>PCI DSS compliant</span>
                    </div>
                    <div className="security-feature">
                      <span>✓</span>
                      <span>3D Secure authentication</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="transactions-tab">
                <div className="section-header">
                  <h3>Transaction History</h3>
                  <div className="txn-filters">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'payments', label: 'Payments' },
                      { id: 'refunds', label: 'Refunds' },
                      { id: 'cashback', label: 'Cashback' }
                    ].map(filter => (
                      <button
                        key={filter.id}
                        className={`filter-btn ${transactionFilter === filter.id ? 'active' : ''}`}
                        onClick={() => setTransactionFilter(filter.id as any)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📜</div>
                    <h3>No transactions found</h3>
                    <p>Your transaction history will appear here</p>
                  </div>
                ) : (
                  <div className="transactions-list">
                    {filteredTransactions.map((txn, idx) => (
                      <TransactionItem
                        key={txn.id}
                        transaction={txn}
                        onClick={setSelectedTransaction}
                        index={idx}
                      />
                    ))}
                  </div>
                )}

                <div className="download-statement">
                  <button className="btn-download-statement">
                    <span>📄</span>
                    <span>Download Statement</span>
                  </button>
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="offers-tab">
                <div className="section-header">
                  <h3>Available Offers</h3>
                  <span className="offers-count">{offers.length} offers available</span>
                </div>

                <div className="offers-grid">
                  {offers.map((offer, idx) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onApply={handleApplyOffer}
                      index={idx}
                    />
                  ))}
                </div>

                <div className="offers-note">
                  <span className="note-icon">💡</span>
                  <p>Offers are automatically applied at checkout when eligible</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <AddPaymentMethodModal
        isOpen={isAddMethodOpen}
        onClose={() => setIsAddMethodOpen(false)}
        onAdd={handleAddPaymentMethod}
      />

      <AddMoneyModal
        isOpen={isAddMoneyOpen}
        onClose={() => setIsAddMoneyOpen(false)}
        onAdd={handleAddMoney}
        paymentMethods={paymentMethods}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      {/* Toast Container */}
      <div id="toast-container" />
    </div>
  );
};

export default CustomerPayments;