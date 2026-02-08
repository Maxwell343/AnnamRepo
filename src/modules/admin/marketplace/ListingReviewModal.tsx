import React from 'react';

interface ListingReviewModalProps {
  listing: {
    id: string;
    title: string;
    farmer: string;
    type: string;
    quantity: string;
    price: string;
    status: string;
    submittedAt: string;
    icon: string;
  };
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

const ListingReviewModal: React.FC<ListingReviewModalProps> = ({ listing, onClose, onApprove, onReject }) => {
  const isPending = listing.status === 'pending' || listing.status === 'flagged';

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="admin-modal__header">
          <h2>Review Listing</h2>
          <button className="admin-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="admin-modal__body">
          <div style={{ textAlign: 'center', fontSize: 64, marginBottom: 12 }}>{listing.icon}</div>
          <h3 style={{ textAlign: 'center', fontSize: 18, marginBottom: 4 }}>{listing.title}</h3>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            by {listing.farmer} • Submitted {listing.submittedAt}
          </p>

          <table style={{ width: '100%', fontSize: 14, marginBottom: 16 }}>
            <tbody>
              {[
                ['Type', listing.type],
                ['Quantity', listing.quantity],
                ['Price', listing.price],
                ['Status', listing.status.toUpperCase()],
              ].map(([label, value]) => (
                <tr key={label as string}>
                  <td style={{ padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>{label}</td>
                  <td style={{ padding: '8px 0', color: '#111827', textAlign: 'right', fontWeight: 600 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-modal__footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="admin-btn admin-btn--secondary" onClick={onClose}>Close</button>
          {isPending && (
            <>
              <button className="admin-btn admin-btn--danger" onClick={onReject}>Reject</button>
              <button className="admin-btn admin-btn--primary" onClick={onApprove}>Approve</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingReviewModal;
