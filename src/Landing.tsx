import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const foodCategories = [
    {
      id: 1,
      title: 'Fresh Produce',
      subtitle: 'Vegetables & Fruits',
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600',
      tag: 'Perishable',
      tagColor: '#4CAF50'
    },
    {
      id: 2,
      title: 'Grains & Cereals',
      subtitle: 'Rice, Wheat & More',
      image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600',
      tag: 'Staples',
      tagColor: '#FF9800'
    },
    {
      id: 3,
      title: 'Dairy Products',
      subtitle: 'Milk, Cheese & Yogurt',
      image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600',
      tag: 'Fresh',
      tagColor: '#2196F3'
    },
    {
      id: 4,
      title: 'Packaged Foods',
      subtitle: 'Canned & Preserved',
      image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=600',
      tag: 'Long-life',
      tagColor: '#9C27B0'
    }
  ];

  const quickTools = [
    {
      icon: '🌾',
      title: 'Donate Food',
      description: 'List surplus food for donation',
      color: '#4CAF50',
      bgColor: '#E8F5E9'
    },
    {
      icon: '🏢',
      title: 'Claim Donations',
      description: 'NGOs can claim available food',
      color: '#2196F3',
      bgColor: '#E3F2FD'
    },
    {
      icon: '🚚',
      title: 'Deliver Food',
      description: 'Drivers can pick up and deliver',
      color: '#FF9800',
      bgColor: '#FFF3E0'
    },
    {
      icon: '📊',
      title: 'Track Impact',
      description: 'See your donation statistics',
      color: '#9C27B0',
      bgColor: '#F3E5F5'
    },
    {
      icon: '🤝',
      title: 'Join Network',
      description: 'Connect with food warriors',
      color: '#F44336',
      bgColor: '#FFEBEE'
    }
  ];

  const impactStats = [
    { value: '50,000+', label: 'Meals Donated' },
    { value: '200+', label: 'Active Donors' },
    { value: '100+', label: 'NGO Partners' },
    { value: '50+', label: 'Delivery Partners' }
  ];

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <span className="logo-icon">🍃</span>
            <span className="logo-text">ANNAM</span>
          </div>
          
          <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
            <a href="#home">Home</a>
            <a href="#categories">Donate</a>
            <a href="#tools">How It Works</a>
            <a href="#impact">Impact</a>
            <a href="#about">About</a>
          </div>

          <div className="nav-actions">
            <button className="nav-btn-login" onClick={() => navigate('/auth')}>
              Login
            </button>
            <button className="nav-btn-signup" onClick={() => navigate('/auth')}>
              Sign Up
            </button>
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" id="home">
        <div className="hero-background">
          <img 
            src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1920" 
            alt="Food donation background"
          />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-card">
            <div className="hero-icon">
              <span>🍃</span>
            </div>
            <h1 className="hero-title">
              Connecting Surplus Food with{' '}
              <span className="highlight">Those in Need</span>
            </h1>
            <p className="hero-subtitle">
              Join India's growing food donation network. Reduce waste, feed communities, 
              and make a lasting impact with every donation.
            </p>
            <div className="hero-buttons">
              <button 
                className="btn-primary"
                onClick={() => navigate('/auth')}
              >
                Get Started
              </button>
              <button 
                className="btn-secondary"
                onClick={() => document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Features
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Food Categories Section */}
      <section className="categories-section" id="categories">
        <div className="section-header">
          <h2 className="section-title">Explore Food Donations</h2>
          <p className="section-subtitle">
            Discover various categories of food that can be donated to help those in need
          </p>
        </div>
        
        <div className="categories-grid">
          {foodCategories.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-image">
                <img src={category.image} alt={category.title} />
                <span 
                  className="category-tag"
                  style={{ backgroundColor: category.tagColor }}
                >
                  {category.tag}
                </span>
              </div>
              <div className="category-info">
                <h3>{category.title}</h3>
                <p>{category.subtitle}</p>
                <button className="category-arrow" onClick={() => navigate('/auth')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Access Tools */}
      <section className="tools-section" id="tools">
        <div className="section-header">
          <h2 className="section-title">Quick Access Tools</h2>
          <p className="section-subtitle">
            Everything you need to donate, claim, and track food donations
          </p>
        </div>
        
        <div className="tools-grid">
          {quickTools.map((tool, index) => (
            <div key={index} className="tool-card">
              <div 
                className="tool-icon"
                style={{ backgroundColor: tool.bgColor, color: tool.color }}
              >
                <span>{tool.icon}</span>
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Stats */}
      <section className="impact-section" id="impact">
        <div className="impact-background">
          <img 
            src="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1920" 
            alt="Community impact"
          />
          <div className="impact-overlay"></div>
        </div>
        
        <div className="impact-content">
          <div className="section-header light">
            <h2 className="section-title">Our Impact</h2>
            <p className="section-subtitle">
              Together we're making a difference in fighting hunger across communities
            </p>
          </div>
          
          <div className="stats-grid">
            {impactStats.map((stat, index) => (
              <div key={index} className="stat-card">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section" id="about">
        <div className="section-header">
          <h2 className="section-title">How ANNAM Works</h2>
          <p className="section-subtitle">
            Simple steps to start your food donation journey
          </p>
        </div>
        
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">📝</div>
            <h3>Register</h3>
            <p>Sign up as a donor, NGO, or delivery partner</p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">📦</div>
            <h3>List or Claim</h3>
            <p>Donors list food, NGOs claim donations</p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🚚</div>
            <h3>Deliver</h3>
            <p>Drivers pick up and deliver to NGOs</p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-icon">🎉</div>
            <h3>Impact</h3>
            <p>Track your contribution and celebrate</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Make a Difference?</h2>
          <p>Join thousands of donors, NGOs, and volunteers fighting food waste</p>
          <div className="cta-buttons">
            <button className="btn-primary large" onClick={() => navigate('/auth')}>
              Start Donating Today
            </button>
            <button className="btn-outline large" onClick={() => navigate('/auth')}>
              Join as NGO
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="logo-icon">🍃</span>
                <span className="logo-text">ANNAM</span>
              </div>
              <p className="footer-desc">
                India's leading food donation platform connecting surplus food with 
                communities in need. Together, we're fighting hunger one meal at a time.
              </p>
              <div className="social-links">
                <a href="#" aria-label="Facebook">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" aria-label="Twitter">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div className="footer-links">
              <div className="footer-column">
                <h4>Platform</h4>
                <a href="#categories">Donate Food</a>
                <a href="#categories">Claim Donations</a>
                <a href="#tools">Become a Driver</a>
                <a href="#impact">Track Impact</a>
              </div>
              
              <div className="footer-column">
                <h4>Support</h4>
                <a href="#">Help Center</a>
                <a href="#">FAQs</a>
                <a href="#">Contact Us</a>
                <a href="#">Report Issue</a>
              </div>
              
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Cookie Policy</a>
                <a href="#">Guidelines</a>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 ANNAM. All rights reserved. Made with ❤️ for India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
