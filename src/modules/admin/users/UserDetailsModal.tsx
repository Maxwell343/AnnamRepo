import React from 'react';

interface UserDetailsModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    kycVerified: boolean;
    joinedAt: string;
    lastActive: string;
  };
  onClose: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose }) => {
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="admin-modal__header">
          <h2>User Details</h2>
          <button className="admin-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="admin-modal__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#6366f1', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700,
              }}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>{user.name}</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{user.email}</p>
            </div>
          </div>

          <table style={{ width: '100%', fontSize: 14 }}>
            <tbody>
              {[
                ['Phone', user.phone],
                ['Role', user.role],
                ['Status', user.status],
                ['KYC', user.kycVerified ? '✓ Verified' : '⏳ Pending'],
                ['Joined', new Date(user.joinedAt).toLocaleDateString()],
                ['Last Active', new Date(user.lastActive).toLocaleDateString()],
              ].map(([label, value]) => (
                <tr key={label as string}>
                  <td style={{ padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>{label}</td>
                  <td style={{ padding: '8px 0', color: '#111827', textAlign: 'right' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-modal__footer">
          <button className="admin-btn admin-btn--secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
