import React, { useState, useEffect } from 'react';
import ListingReviewModal from './ListingReviewModal';
import './ListingModeration.css';

type ModerationStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'flagged';

interface ModerationListing {
  id: string;
  title: string;
  farmer: string;
  type: string;
  quantity: string;
  price: string;
  status: Exclude<ModerationStatus, 'all'>;
  submittedAt: string;
  icon: string;
}

const ListingModeration: React.FC = () => {
  const [listings, setListings] = useState<ModerationListing[]>([]);
  const [activeFilter, setActiveFilter] = useState<ModerationStatus>('all');
  const [selectedListing, setSelectedListing] = useState<ModerationListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // TODO: Replace with real API
    setTimeout(() => {
      setListings([
        { id: '1', title: 'Organic Tomatoes', farmer: 'Ramesh Kumar', type: 'Vegetable', quantity: '500 kg', price: '₹35/kg', status: 'pending', submittedAt: '2026-02-08', icon: '🍅' },
        { id: '2', title: 'Basmati Rice', farmer: 'Vikram Singh', type: 'Grain', quantity: '1000 kg', price: '₹110/kg', status: 'approved', submittedAt: '2026-02-07', icon: '🌾' },
        { id: '3', title: 'Fresh Milk', farmer: 'Anita Sharma', type: 'Dairy', quantity: '200 L', price: '₹60/L', status: 'flagged', submittedAt: '2026-02-06', icon: '🥛' },
        { id: '4', title: 'Red Chillies', farmer: 'Mohammed Ismail', type: 'Spices', quantity: '150 kg', price: '₹280/kg', status: 'pending', submittedAt: '2026-02-08', icon: '🌶️' },
      ]);
      setIsLoading(false);
    }, 300);
  }, []);

  const filtered = activeFilter === 'all' ? listings : listings.filter((l) => l.status === activeFilter);

  const statusCounts = {
    pending: listings.filter((l) => l.status === 'pending').length,
    approved: listings.filter((l) => l.status === 'approved').length,
    rejected: listings.filter((l) => l.status === 'rejected').length,
  };

  const handleApprove = (id: string) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'approved' as const } : l)));
    setSelectedListing(null);
  };

  const handleReject = (id: string) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'rejected' as const } : l)));
    setSelectedListing(null);
  };

  const filters: { key: ModerationStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'approved', label: '✅ Approved' },
    { key: 'rejected', label: '❌ Rejected' },
    { key: 'flagged', label: '⚠️ Flagged' },
  ];

  if (isLoading) return <div className="listing-moderation"><p>Loading listings...</p></div>;

  return (
    <div className="listing-moderation">
      <div className="listing-moderation__header">
        <h1 className="listing-moderation__title">Listing Moderation</h1>
        <div className="listing-moderation__stats">
          <span className="listing-moderation__stat pending">⏳ {statusCounts.pending} Pending</span>
          <span className="listing-moderation__stat approved">✅ {statusCounts.approved} Approved</span>
          <span className="listing-moderation__stat rejected">❌ {statusCounts.rejected} Rejected</span>
        </div>
      </div>

      <div className="listing-moderation__filters">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`listing-moderation__filter-chip ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="listing-moderation__grid">
        {filtered.map((listing) => (
          <div key={listing.id} className="listing-mod-card">
            <div className="listing-mod-card__image">
              {listing.icon}
              <span className={`listing-mod-card__status ${listing.status}`}>{listing.status}</span>
            </div>
            <div className="listing-mod-card__body">
              <div className="listing-mod-card__title">{listing.title}</div>
              <div className="listing-mod-card__meta">by {listing.farmer} • {listing.submittedAt}</div>
              <div className="listing-mod-card__details">
                <span>📦 {listing.quantity}</span>
                <span>💰 {listing.price}</span>
                <span>🏷️ {listing.type}</span>
              </div>
              <div className="listing-mod-card__actions">
                {listing.status === 'pending' || listing.status === 'flagged' ? (
                  <>
                    <button className="listing-mod-card__btn-approve" onClick={() => handleApprove(listing.id)}>✓ Approve</button>
                    <button className="listing-mod-card__btn-reject" onClick={() => handleReject(listing.id)}>✕ Reject</button>
                  </>
                ) : null}
                <button className="listing-mod-card__btn-review" onClick={() => setSelectedListing(listing)}>Review</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedListing && (
        <ListingReviewModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onApprove={() => handleApprove(selectedListing.id)}
          onReject={() => handleReject(selectedListing.id)}
        />
      )}
    </div>
  );
};

export default ListingModeration;
