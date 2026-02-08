import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Checkout.css';
import type { CartItem } from '../../../types/marketplace';

// ============================================
// TYPES
// ============================================

interface DeliveryAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

interface PaymentMethod {
  type: 'upi' | 'card' | 'netbanking' | 'cod' | 'wallet';
  label: string;
  icon: string;
}

// ============================================
// MOCK DATA
// ============================================

const paymentMethods: PaymentMethod[] = [
  { type: 'upi', label: 'UPI', icon: '📱' },
  { type: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { type: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { type: 'wallet', label: 'Wallet', icon: '👛' },
  { type: 'cod', label: 'Cash on Delivery', icon: '💵' }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatPrice = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get cart items from navigation state or use mock data
  const cartItems: CartItem[] = location.state?.cartItems || [];
  
  const [step, setStep] = useState<'address' | 'payment' | 'confirmation'>('address');
  const [address, setAddress] = useState<DeliveryAddress>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    landmark: ''
  });
  const [savedAddresses] = useState<DeliveryAddress[]>([
    {
      fullName: 'John Doe',
      phone: '9876543210',
      address: '123, Main Street, Sector 15',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
      landmark: 'Near Metro Station'
    }
  ]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(0);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [upiId, setUpiId] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.listing.pricing.currentPrice * item.quantity, 0);
  const deliveryFee = subtotal > 500 ? 0 : 49;
  const platformFee = 9;
  const total = subtotal + deliveryFee + platformFee;
  const totalSavings = cartItems.reduce((sum, item) => {
    const originalPrice = item.listing.pricing.originalPrice || item.listing.pricing.currentPrice;
    return sum + (originalPrice - item.listing.pricing.currentPrice) * item.quantity;
  }, 0);
  
  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    setSelectedAddressIndex(null);
  };
  
  const selectSavedAddress = (index: number) => {
    setSelectedAddressIndex(index);
    setAddress(savedAddresses[index]);
  };
  
  const validateAddress = (): boolean => {
    const required: (keyof DeliveryAddress)[] = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
    return required.every(field => address[field]?.trim());
  };
  
  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newOrderId = 'ANNAM' + Date.now().toString().slice(-8);
    setOrderId(newOrderId);
    setOrderPlaced(true);
    setStep('confirmation');
    setIsProcessing(false);
  };
  
  // Confirmation View
  if (orderPlaced) {
    return (
      <div className="checkout-page">
        <div className="confirmation-container">
          <div className="confirmation-card">
            <div className="success-icon">✅</div>
            <h1>Order Placed Successfully!</h1>
            <p className="order-id">Order ID: <strong>{orderId}</strong></p>
            
            <div className="confirmation-details">
              <div className="detail-row">
                <span>Total Amount</span>
                <span className="amount">{formatPrice(total)}</span>
              </div>
              <div className="detail-row">
                <span>Payment Method</span>
                <span>{selectedPayment?.label}</span>
              </div>
              <div className="detail-row">
                <span>Delivery Address</span>
                <span>{address.city}, {address.state}</span>
              </div>
            </div>
            
            <div className="delivery-estimate">
              <div className="estimate-icon">🚚</div>
              <div className="estimate-info">
                <h4>Estimated Delivery</h4>
                <p>{new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}</p>
              </div>
            </div>
            
            <div className="impact-summary">
              <h4>🌍 Your Impact</h4>
              <div className="impact-stats">
                <div className="impact-stat">
                  <span className="value">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} kg</span>
                  <span className="label">Food Saved</span>
                </div>
                <div className="impact-stat">
                  <span className="value">{Math.round(cartItems.reduce((sum, item) => sum + item.quantity, 0) * 3.3)}</span>
                  <span className="label">Meals Enabled</span>
                </div>
                <div className="impact-stat">
                  <span className="value">{formatPrice(totalSavings)}</span>
                  <span className="label">You Saved</span>
                </div>
              </div>
            </div>
            
            <div className="confirmation-actions">
              <button className="track-btn" onClick={() => navigate('/tracking')}>
                📍 Track Order
              </button>
              <button className="continue-btn" onClick={() => navigate('/marketplace')}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="checkout-page">
      {/* Header */}
      <header className="checkout-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Checkout</h1>
          <div className="secure-badge">
            🔒 Secure Checkout
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`progress-step ${step === 'address' ? 'active' : step === 'payment' || step === 'confirmation' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Address</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step === 'payment' ? 'active' : step === 'confirmation' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Payment</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step === 'confirmation' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Confirm</span>
          </div>
        </div>
      </header>
      
      <main className="checkout-main">
        <div className="checkout-content">
          {/* Left Column - Forms */}
          <div className="checkout-forms">
            {/* Address Step */}
            {step === 'address' && (
              <div className="address-section">
                <h2>📍 Delivery Address</h2>
                
                {/* Saved Addresses */}
                {savedAddresses.length > 0 && (
                  <div className="saved-addresses">
                    <h3>Saved Addresses</h3>
                    {savedAddresses.map((addr, idx) => (
                      <div 
                        key={idx}
                        className={`saved-address-card ${selectedAddressIndex === idx ? 'selected' : ''}`}
                        onClick={() => selectSavedAddress(idx)}
                      >
                        <div className="radio-indicator" />
                        <div className="address-details">
                          <span className="name">{addr.fullName}</span>
                          <span className="full-address">{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</span>
                          <span className="phone">📞 {addr.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* New Address Form */}
                <div className="new-address-form">
                  <h3>Or Add New Address</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        value={address.fullName}
                        onChange={(e) => handleAddressChange('fullName', e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        value={address.phone}
                        onChange={(e) => handleAddressChange('phone', e.target.value)}
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Address *</label>
                    <textarea
                      value={address.address}
                      onChange={(e) => handleAddressChange('address', e.target.value)}
                      placeholder="House No., Building, Street, Area"
                      rows={3}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        value={address.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div className="form-group">
                      <label>State *</label>
                      <input
                        type="text"
                        value={address.state}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        placeholder="State"
                      />
                    </div>
                    <div className="form-group">
                      <label>Pincode *</label>
                      <input
                        type="text"
                        value={address.pincode}
                        onChange={(e) => handleAddressChange('pincode', e.target.value)}
                        placeholder="6-digit pincode"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Landmark (Optional)</label>
                    <input
                      type="text"
                      value={address.landmark}
                      onChange={(e) => handleAddressChange('landmark', e.target.value)}
                      placeholder="Nearby landmark"
                    />
                  </div>
                </div>
                
                <button 
                  className="continue-btn"
                  onClick={() => setStep('payment')}
                  disabled={!validateAddress()}
                >
                  Continue to Payment →
                </button>
              </div>
            )}
            
            {/* Payment Step */}
            {step === 'payment' && (
              <div className="payment-section">
                <h2>💳 Payment Method</h2>
                
                <div className="payment-methods">
                  {paymentMethods.map((method) => (
                    <div 
                      key={method.type}
                      className={`payment-method-card ${selectedPayment?.type === method.type ? 'selected' : ''}`}
                      onClick={() => setSelectedPayment(method)}
                    >
                      <div className="radio-indicator" />
                      <span className="method-icon">{method.icon}</span>
                      <span className="method-label">{method.label}</span>
                      {method.type === 'cod' && (
                        <span className="cod-fee">+₹20 fee</span>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* UPI Input */}
                {selectedPayment?.type === 'upi' && (
                  <div className="upi-input">
                    <label>Enter UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                    />
                    <div className="upi-apps">
                      <span>Or pay via:</span>
                      <button className="upi-app">GPay</button>
                      <button className="upi-app">PhonePe</button>
                      <button className="upi-app">Paytm</button>
                    </div>
                  </div>
                )}
                
                {/* Card Input */}
                {selectedPayment?.type === 'card' && (
                  <div className="card-input">
                    <div className="form-group">
                      <label>Card Number</label>
                      <input type="text" placeholder="1234 5678 9012 3456" />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry</label>
                        <input type="text" placeholder="MM/YY" />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input type="password" placeholder="***" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Name on Card</label>
                      <input type="text" placeholder="As shown on card" />
                    </div>
                  </div>
                )}
                
                <div className="payment-actions">
                  <button className="back-step-btn" onClick={() => setStep('address')}>
                    ← Back to Address
                  </button>
                  <button 
                    className="place-order-btn"
                    onClick={handlePlaceOrder}
                    disabled={!selectedPayment || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner" />
                        Processing...
                      </>
                    ) : (
                      `Pay ${formatPrice(total)}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="order-summary">
            <h2>🛒 Order Summary</h2>
            
            <div className="cart-items">
              {cartItems.map((item, idx) => (
                <div key={idx} className="summary-item">
                  <div className="item-image">
                    {item.listing.images?.[0] ? (
                      <img src={item.listing.images[0]} alt={item.listing.title} />
                    ) : (
                      <div className="placeholder-image">🥬</div>
                    )}
                  </div>
                  <div className="item-details">
                    <h4>{item.listing.title}</h4>
                    <p className="farmer-name">by {item.listing.farmer.name}</p>
                    <div className="item-meta">
                      <span className="quantity">{item.quantity} {item.listing.unit}</span>
                      <span className="price">{formatPrice(item.listing.pricing.currentPrice * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="price-row">
                <span>Delivery Fee</span>
                <span className={deliveryFee === 0 ? 'free' : ''}>
                  {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="price-row">
                <span>Platform Fee</span>
                <span>{formatPrice(platformFee)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="price-row savings">
                  <span>Total Savings</span>
                  <span>-{formatPrice(totalSavings)}</span>
                </div>
              )}
              <div className="price-row total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            
            {/* Delivery Info */}
            {step !== 'address' && (
              <div className="delivery-info">
                <h4>📍 Delivering to</h4>
                <p className="delivery-name">{address.fullName}</p>
                <p className="delivery-address">
                  {address.address}, {address.city}, {address.state} - {address.pincode}
                </p>
                <button className="change-address" onClick={() => setStep('address')}>
                  Change
                </button>
              </div>
            )}
            
            {/* Impact Preview */}
            <div className="impact-preview">
              <h4>🌍 Your Impact with this order</h4>
              <div className="impact-items">
                <div className="impact-item">
                  <span className="icon">🥬</span>
                  <span className="text">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} kg food saved from waste</span>
                </div>
                <div className="impact-item">
                  <span className="icon">👨‍🌾</span>
                  <span className="text">{new Set(cartItems.map(i => i.listing.farmerId)).size} farmer(s) supported</span>
                </div>
                <div className="impact-item">
                  <span className="icon">🌱</span>
                  <span className="text">{Math.round(cartItems.reduce((sum, item) => sum + item.quantity, 0) * 0.5)} kg CO₂ prevented</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
