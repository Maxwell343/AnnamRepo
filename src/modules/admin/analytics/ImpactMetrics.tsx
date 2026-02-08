import React from 'react';
import './ImpactMetrics.css';

const ImpactMetrics: React.FC = () => {
  return (
    <div className="impact-metrics">
      <div className="impact-metrics__header">
        <h1>Impact Metrics</h1>
        <button className="admin-btn admin-btn--secondary">Download Report</button>
      </div>

      <div className="impact-metrics__hero">
        <div className="impact-hero-card">
          <div className="impact-hero-card__icon">🥗</div>
          <div className="impact-hero-card__value">45,200 kg</div>
          <div className="impact-hero-card__label">Food Rescued</div>
          <div className="impact-hero-card__sub">Equivalent to 90,400 meals</div>
        </div>
        <div className="impact-hero-card">
          <div className="impact-hero-card__icon">👨‍👩‍👧‍👦</div>
          <div className="impact-hero-card__value">12,800</div>
          <div className="impact-hero-card__label">People Fed</div>
          <div className="impact-hero-card__sub">Across 45 communities</div>
        </div>
        <div className="impact-hero-card">
          <div className="impact-hero-card__icon">🌍</div>
          <div className="impact-hero-card__value">28.4T</div>
          <div className="impact-hero-card__label">CO₂ Prevented</div>
          <div className="impact-hero-card__sub">Equivalent to 62 trees planted</div>
        </div>
        <div className="impact-hero-card">
          <div className="impact-hero-card__icon">🤝</div>
          <div className="impact-hero-card__value">38</div>
          <div className="impact-hero-card__label">NGO Partners</div>
          <div className="impact-hero-card__sub">Active in 12 cities</div>
        </div>
      </div>

      <div className="impact-metrics__charts">
        <div className="impact-chart">
          <div className="impact-chart__title">Food Rescued Over Time</div>
          <div className="impact-chart__area">📈 Area chart — monthly food rescued (kg)</div>
        </div>
        <div className="impact-chart">
          <div className="impact-chart__title">Meals Served Distribution</div>
          <div className="impact-chart__area">🍩 Pie chart — by NGO partner</div>
        </div>
      </div>

      <div className="impact-metrics__milestones">
        <div className="impact-metrics__milestones-title">Impact Milestones</div>
        {[
          { icon: '🏆', name: '50,000 kg Food Rescued', desc: 'Target: 50,000 kg', pct: 90, status: 'in-progress' as const },
          { icon: '🎯', name: '10,000 People Fed', desc: 'Reached on Dec 15, 2024', pct: 100, status: 'achieved' as const },
          { icon: '🌱', name: '25 Tons CO₂ Prevented', desc: 'Current: 28.4T — exceeded target!', pct: 100, status: 'achieved' as const },
          { icon: '🤝', name: '50 NGO Partners', desc: 'Target: 50 active NGOs', pct: 76, status: 'in-progress' as const },
          { icon: '🚛', name: '1,000 Deliveries in a Month', desc: 'Best month: 892 deliveries', pct: 89, status: 'in-progress' as const },
        ].map((m) => (
          <div className="impact-milestone" key={m.name}>
            <div className={`impact-milestone__icon impact-milestone__icon--${m.status === 'achieved' ? 'achieved' : 'progress'}`}>
              {m.icon}
            </div>
            <div className="impact-milestone__info">
              <div className="impact-milestone__name">{m.name}</div>
              <div className="impact-milestone__desc">{m.desc}</div>
              <div className="impact-milestone__progress-bar">
                <div className="impact-milestone__progress-fill" style={{ width: `${m.pct}%` }} />
              </div>
            </div>
            <span className={`impact-milestone__badge impact-milestone__badge--${m.status}`}>
              {m.status === 'achieved' ? '✅ Achieved' : `${m.pct}%`}
            </span>
          </div>
        ))}
      </div>

      <div className="impact-metrics__leaderboard">
        <div className="impact-metrics__leaderboard-title">NGO Impact Leaderboard</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>NGO</th>
              <th>Food Received</th>
              <th>Meals Served</th>
              <th>Communities</th>
              <th>Impact Score</th>
            </tr>
          </thead>
          <tbody>
            {[
              { rank: 1, name: 'Hope NGO', food: '8,200 kg', meals: '16,400', communities: 8, score: 98 },
              { rank: 2, name: 'Annapurna Shelter', food: '6,800 kg', meals: '13,600', communities: 6, score: 94 },
              { rank: 3, name: 'City Food Bank', food: '5,400 kg', meals: '10,800', communities: 5, score: 89 },
              { rank: 4, name: 'Helping Hands', food: '4,200 kg', meals: '8,400', communities: 4, score: 82 },
              { rank: 5, name: 'Community Kitchen', food: '3,100 kg', meals: '6,200', communities: 3, score: 76 },
            ].map((ngo) => (
              <tr key={ngo.rank}>
                <td style={{ fontWeight: 700 }}>{ngo.rank}</td>
                <td style={{ fontWeight: 500 }}>{ngo.name}</td>
                <td>{ngo.food}</td>
                <td>{ngo.meals}</td>
                <td>{ngo.communities}</td>
                <td>
                  <span style={{
                    fontWeight: 700,
                    color: ngo.score >= 90 ? '#16a34a' : ngo.score >= 80 ? '#f59e0b' : '#6b7280'
                  }}>
                    {ngo.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImpactMetrics;
