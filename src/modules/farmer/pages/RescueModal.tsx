import React, { useState, useEffect } from 'react';

import { API_ENDPOINTS } from '../../../config/api';
import { AlertTriangle, Clock, Gift, Tag, X } from 'lucide-react';
import './RescueModal.css';

interface RescueModalProps {
  listing: any;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: (updatedListing: any) => void;
}

const RescueModal: React.FC<RescueModalProps> = ({ listing, isOpen, onClose, onActionComplete }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'donate' | 'sell_discounted' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRescue = listing.rescueInfo?.urgencyStatus === 'rescue';
  const hoursRemaining = listing.rescueInfo?.hoursRemaining || 0;
  const hRemaining = listing.hours_remaining ?? listing.rescueInfo?.hoursRemaining ?? 0;
  const donateAvailableInHours = listing.donate_available_in_hours ?? Math.max(0, hRemaining - 24);
  const isAvailable = listing.status === 'available' || listing.status === 'active';
  const hasDonationMode = listing.donation_mode || listing.rescueInfo?.donationMode;
  const donateAvailable = isAvailable && !hasDonationMode && (Boolean(listing.donate_available) || donateAvailableInHours <= 0);

  useEffect(() => {
    if (!listing.expires_at && !listing.expiryDate) return;

    const calculateTimeLeft = () => {
      const expiryTime = new Date(listing.expires_at || listing.expiryDate || listing.expiry_date || listing.expiry || new Date()).getTime();
      const now = new Date().getTime();
      const difference = expiryTime - now;

      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60))),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [listing]);

  if (!isOpen) return null;

  const handleAction = async (action: 'donate' | 'sell_discounted') => {
    setIsSubmitting(true);
    setSubmittingAction(action);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.rescue.action(listing.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ action, farmer_id: listing.farmerId || listing.farmer_id || localStorage.getItem('userId') }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to complete action';
        try {
          const errData = await response.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      onActionComplete(data.listing);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  return (
    <div className="rm-modal-overlay">
      <div className={`rm-modal-content ${isRescue ? 'rescue' : 'urgent'}`}>
        <button onClick={onClose} className="rm-close-btn">
          <X size={24} />
        </button>

        <div className="rm-header">
          <div className="rm-pulse-icon">
            <AlertTriangle size={32} />
          </div>
          <h2>Action Required</h2>
          <p>This listing needs immediate attention to prevent spoilage</p>
        </div>

        <div className="rm-countdown">
          <Clock size={20} />
          <div className="rm-time">
            {timeLeft ? (
              <span className="rm-timer-text">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            ) : (
              'Calculating...'
            )}
          </div>
          <span className="rm-time-label">Remaining until expiry</span>
        </div>

        <div className="rm-listing-preview">
          <h3 className="rm-title">{listing.title}</h3>
          <div className="rm-details">
            <span>{listing.quantity} {listing.unit}</span>
            <span className="rm-dot">•</span>
            <span>Est. Value: ₹{listing.pricing?.originalPrice || listing.price}</span>
          </div>
        </div>

        {error && <div className="rm-error">{error}</div>}

        <div className="rm-actions">
          <button 
            className="rm-action-card donate"
            onClick={() => handleAction('donate')}
            disabled={isSubmitting || !donateAvailable}
            title={donateAvailable ? 'Donate to NGO' : `Available in ${Math.ceil(donateAvailableInHours)}h`}
          >
            <div className="rm-card-icon"><Gift size={24} /></div>
            <div className="rm-card-text">
              <h4>{submittingAction === 'donate' ? 'Searching for optimal NGO...' : 'Donate to NGO'}</h4>
              <p>
                {submittingAction === 'donate' ? 'Finding the nearest eligible organization to route your donation.' :
                 donateAvailable
                  ? 'Zero food waste. Earn impact points and tax benefits.'
                  : `Available in ${Math.ceil(donateAvailableInHours)}h after listing.`}
              </p>
            </div>
          </button>

          <button 
            className="rm-action-card discount"
            onClick={() => handleAction('sell_discounted')}
            disabled={isSubmitting}
          >
            <div className="rm-card-icon"><Tag size={24} /></div>
            <div className="rm-card-text">
              <h4>Sell at 50% Off</h4>
              <p>Discounted to ₹{listing.rescueInfo?.discountedPrice || Math.round((listing.price || 0) / 2)} to move fast.</p>
            </div>
          </button>
        </div>

        <div className="rm-footer">
          <p>
            ⚠️ If no action is taken, this listing will automatically convert to <strong>donation mode</strong> in {Math.max(0, Math.floor(hoursRemaining - 6))} hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RescueModal;
