import React, { useState } from 'react';
import './Transactions.css';

interface Transaction {
  id: string;
  txnId: string;
  date: string;
  type: 'order' | 'payout' | 'refund' | 'commission';
  description: string;
  party: string;
  amount: string;
  direction: 'credit' | 'debit';
  method: string;
  status: 'success' | 'pending' | 'failed';
}

const mockTransactions: Transaction[] = [
  { id: '1', txnId: 'TXN-90281', date: '2024-01-15 14:32', type: 'order', description: 'Order ORD-2401', party: 'Hope NGO', amount: '₹2,450', direction: 'credit', method: 'UPI', status: 'success' },
  { id: '2', txnId: 'TXN-90282', date: '2024-01-15 14:45', type: 'commission', description: 'Commission on ORD-2401', party: 'Platform', amount: '₹245', direction: 'credit', method: 'Internal', status: 'success' },
  { id: '3', txnId: 'TXN-90283', date: '2024-01-15 15:00', type: 'payout', description: 'Driver payout - Rakesh P.', party: 'DRV-101', amount: '₹680', direction: 'debit', method: 'Bank Transfer', status: 'pending' },
  { id: '4', txnId: 'TXN-90284', date: '2024-01-15 15:12', type: 'order', description: 'Order ORD-2402', party: 'City Food Bank', amount: '₹4,200', direction: 'credit', method: 'Card', status: 'success' },
  { id: '5', txnId: 'TXN-90285', date: '2024-01-15 15:30', type: 'refund', description: 'Refund for ORD-2389', party: 'Ravi Sharma', amount: '₹350', direction: 'debit', method: 'UPI', status: 'success' },
  { id: '6', txnId: 'TXN-90286', date: '2024-01-15 16:00', type: 'payout', description: 'Driver payout - Priya K.', party: 'DRV-103', amount: '₹920', direction: 'debit', method: 'Bank Transfer', status: 'failed' },
  { id: '7', txnId: 'TXN-90287', date: '2024-01-15 16:15', type: 'order', description: 'Order ORD-2405', party: 'Ravi Sharma', amount: '₹350', direction: 'credit', method: 'UPI', status: 'success' },
];

type TypeFilter = 'all' | Transaction['type'];

const Transactions: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Transaction['status']>('all');

  const filtered = mockTransactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.txnId.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.party.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="transactions">
      <div className="transactions__header">
        <h1>Transactions</h1>
        <button className="admin-btn admin-btn--secondary">Export CSV</button>
      </div>

      <div className="transactions__filters">
        <input
          className="transactions__search"
          placeholder="Search by TXN ID, description or party..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="transactions__select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
        >
          <option value="all">All Types</option>
          <option value="order">Order</option>
          <option value="payout">Payout</option>
          <option value="refund">Refund</option>
          <option value="commission">Commission</option>
        </select>
        <select
          className="transactions__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | Transaction['status'])}
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="transactions__table-wrap">
        <table className="transactions__table">
          <thead>
            <tr>
              <th>TXN ID</th>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Party</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td><span className="transactions__txn-id">{t.txnId}</span></td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{t.date}</td>
                <td>
                  <span className={`transactions__type transactions__type--${t.type}`}>
                    {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  </span>
                </td>
                <td>{t.description}</td>
                <td>{t.party}</td>
                <td style={{ fontSize: 12 }}>{t.method}</td>
                <td>
                  <span className={`transactions__amount transactions__amount--${t.direction}`}>
                    {t.direction === 'credit' ? '+' : '-'}{t.amount}
                  </span>
                </td>
                <td>
                  <span className="transactions__status">
                    <span className={`transactions__status-dot transactions__status-dot--${t.status}`} />
                    {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="transactions__pagination">
          <span>Showing {filtered.length} of {mockTransactions.length} transactions</span>
          <div className="transactions__page-buttons">
            <button className="transactions__page-btn">‹</button>
            <button className="transactions__page-btn transactions__page-btn--active">1</button>
            <button className="transactions__page-btn">›</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
