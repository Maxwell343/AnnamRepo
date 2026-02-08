import React, { useState } from 'react';
import './DisputeDetails.css';

interface TimelineEvent {
  id: string;
  type: 'action' | 'message' | 'system' | 'escalation';
  actor: string;
  content: string;
  time: string;
}

const mockTimeline: TimelineEvent[] = [
  { id: '1', type: 'system', actor: 'System', content: 'Dispute DSP-401 created for order ORD-2389', time: '2 hrs ago' },
  { id: '2', type: 'message', actor: 'Ravi Sharma', content: 'I received rotten tomatoes and wilted spinach. The quality was terrible and unfit for consumption. Attaching photos as evidence.', time: '2 hrs ago' },
  { id: '3', type: 'action', actor: 'Admin (You)', content: 'Assigned dispute to investigation queue', time: '1 hr ago' },
  { id: '4', type: 'message', actor: 'Green Valley Farm', content: 'The produce was fresh when dispatched. There may have been a delay in delivery causing spoilage.', time: '45 min ago' },
  { id: '5', type: 'escalation', actor: 'System', content: 'Auto-escalated: No resolution within SLA window (2 hours)', time: '15 min ago' },
];

const DisputeDetails: React.FC = () => {
  const [reply, setReply] = useState('');

  const handleSendReply = () => {
    if (!reply.trim()) return;
    alert(`Reply sent: ${reply}`);
    setReply('');
  };

  return (
    <div className="dispute-details">
      <button className="dispute-details__back">← Back to Dispute Center</button>

      <div className="dispute-details__header">
        <div className="dispute-details__title-group">
          <h1>DSP-401 — Received rotten vegetables</h1>
          <div className="dispute-details__meta">
            <span>Order: ORD-2389</span>
            <span>•</span>
            <span>Filed 2 hrs ago by Ravi Sharma</span>
            <span>•</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>HIGH PRIORITY</span>
          </div>
        </div>
        <div className="dispute-details__actions">
          <button className="admin-btn admin-btn--secondary">Escalate</button>
          <button className="admin-btn admin-btn--danger">Reject</button>
          <button className="admin-btn admin-btn--primary">Resolve</button>
        </div>
      </div>

      <div className="dispute-details__grid">
        <div>
          <div className="dispute-details__timeline">
            <div className="dispute-details__timeline-title">Timeline</div>
            <div className="dispute-timeline__list">
              {mockTimeline.map((event) => (
                <div className="dispute-timeline__item" key={event.id}>
                  <div className={`dispute-timeline__dot dispute-timeline__dot--${event.type}`} />
                  <div className="dispute-timeline__time">{event.time}</div>
                  <div className="dispute-timeline__content">
                    <span className="dispute-timeline__actor">{event.actor}: </span>
                    {event.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="dispute-details__reply">
              <textarea
                className="dispute-details__reply-textarea"
                placeholder="Write a response or internal note..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="dispute-details__reply-actions">
                <button className="admin-btn admin-btn--secondary">Internal Note</button>
                <button className="admin-btn admin-btn--primary" onClick={handleSendReply}>Send Reply</button>
              </div>
            </div>
          </div>
        </div>

        <div className="dispute-details__info">
          <div className="dispute-info-card">
            <div className="dispute-info-card__title">Dispute Info</div>
            {[
              ['Status', 'Investigating'],
              ['Priority', 'High'],
              ['Category', 'Quality Issue'],
              ['SLA Deadline', '30 min remaining'],
            ].map(([label, value]) => (
              <div className="dispute-info-card__row" key={label as string}>
                <span className="dispute-info-card__label">{label}</span>
                <span className="dispute-info-card__value">{value}</span>
              </div>
            ))}
          </div>

          <div className="dispute-info-card">
            <div className="dispute-info-card__title">Complainant</div>
            {[
              ['Name', 'Ravi Sharma'],
              ['Role', 'Customer'],
              ['Email', 'ravi@email.com'],
              ['Past Disputes', '0'],
            ].map(([label, value]) => (
              <div className="dispute-info-card__row" key={label as string}>
                <span className="dispute-info-card__label">{label}</span>
                <span className="dispute-info-card__value">{value}</span>
              </div>
            ))}
          </div>

          <div className="dispute-info-card">
            <div className="dispute-info-card__title">Respondent</div>
            {[
              ['Name', 'Green Valley Farm'],
              ['Role', 'Farmer'],
              ['Rating', '4.2 / 5'],
              ['Past Disputes', '1 (resolved)'],
            ].map(([label, value]) => (
              <div className="dispute-info-card__row" key={label as string}>
                <span className="dispute-info-card__label">{label}</span>
                <span className="dispute-info-card__value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisputeDetails;
