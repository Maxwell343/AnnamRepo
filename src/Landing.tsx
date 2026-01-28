import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

interface Listing {
  id: number;
  title: string;
  quantity: string;
  type: string;
  expiry: string;
  description?: string;
  image?: string;
  created_at: string;
  farmer_id: number;
  latitude?: number;
  longitude?: number;
  location?: string;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<'donor' | 'recipient'>('donor');
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/listings');
        const data = await response.json();
        
        // Show all listings (both with and without coordinates)
        const allListings = (data.listings || []);
        setRecentListings(allListings);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setRecentListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const requestLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        setLocationError('Unable to retrieve your location. Please enable location access.');
        console.error('Geolocation error:', error);
      }
    );
  };

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    
    script.onload = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = (window as any).L;
      
      const map = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div class="user-location-pin"></div>',
        iconSize: [20, 20]
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>You are here</b>');

      // Food listing markers
      recentListings.forEach(listing => {
        // Only add marker if listing has valid coordinates
        if (listing.latitude !== null && listing.latitude !== undefined && 
            listing.longitude !== null && listing.longitude !== undefined) {
          const emoji = listing.type === 'Vegetable' ? '🥬' : 
                       listing.type === 'Fruit' ? '🍎' : 
                       listing.type === 'Grain' ? '🌾' : '🍽️';
          
          const foodIcon = L.divIcon({
            className: 'food-marker',
            html: `<div class="food-marker-pin">${emoji}</div>`,
            iconSize: [40, 40]
          });

          const marker = L.marker([listing.latitude, listing.longitude], { icon: foodIcon })
            .addTo(map);

          marker.on('click', () => {
            setSelectedListing(listing);
          });

          marker.bindPopup(`
            <div class="map-popup">
              <h3>${emoji} ${listing.title}</h3>
              <p>Qty: ${listing.quantity}</p>
              <p>📍 ${listing.location || 'Location not specified'}</p>
              <span class="popup-badge">FREE</span>
            </div>
          `);
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userLocation, recentListings]);

  const howItWorksSteps = [
    { icon: '📱', title: 'Sign Up Free', description: 'Create your account in under 2 minutes. Choose donor or recipient role.' },
    { icon: '📍', title: 'Share Location', description: 'Enable location to find food donations near you or list your surplus.' },
    { icon: '🤝', title: 'Connect Instantly', description: 'Get matched with donors or recipients in real-time through our smart algorithm.' },
    { icon: '✅', title: 'Complete Exchange', description: 'Coordinate pickup, confirm delivery, and help reduce food waste together.' },
  ];

  const features = [
    { icon: '⚡', title: 'Real-Time Matching', description: 'AI-powered matching connects food with people who need it within minutes.' },
    { icon: '🔒', title: 'Safe & Verified', description: 'All users are verified. Food safety guidelines ensure quality donations.' },
    { icon: '🌍', title: 'Track Your Impact', description: 'See exactly how many meals you\'ve shared and CO₂ you\'ve saved.' },
    { icon: '🆓', title: '100% Free', description: 'No hidden fees. No charges. Just pure community-driven food sharing.' },
  ];

  const testimonials = [
    { name: 'Priya Sharma', role: 'Restaurant Owner', text: 'We donate 50+ meals weekly. Annam made it so easy to connect with local shelters.', rating: 5 },
    { name: 'Rajesh Kumar', role: 'Community Volunteer', text: 'As a volunteer, I\'ve helped distribute over 1000 meals. This platform is a game-changer.', rating: 5 },
    { name: 'Anita Desai', role: 'NGO Director', text: 'Annam helps us reach more people in need. The impact has been incredible for our community.', rating: 5 },
  ];

  const getTimeString = (created_at: string) => {
    const listingDate = new Date(created_at);
    const now = new Date();
    const diffMs = now.getTime() - listingDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins >= 60) return `${Math.floor(diffMins / 60)} hrs ago`;
    if (diffMins > 0) return `${diffMins} mins ago`;
    return 'Just now';
  };

  return (
    <div className="landing-page">
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="logo">
          <span className="logo-icon">🌾</span> 
          <span className="logo-text">Annam</span>
        </div>
        
        <div className="nav-links">
          <a href="#map">Live Map</a>
          <a href="#how-it-works">How it Works</a>
          <a href="#features">Features</a>
          <a href="#impact">Impact</a>
          <a href="#testimonials">Stories</a>
        </div>
        
        <button className="btn-signin" onClick={() => navigate('/auth')}>
          Sign In / Join
        </button>
      </nav>

      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-content">
          <div className="hero-badge">🇮🇳 Serving Communities Across India</div>
          <h1 className="hero-title">
            Share More. Waste Less.<br />
            <span className="gradient-text">Zero Hunger.</span>
          </h1>
          <p className="hero-subtitle">
            Join India's largest community of food sharers. Connecting surplus to need in real-time.
            Every meal shared is a step towards ending hunger.
          </p>
          
          <div className="cta-group">
            <button className="btn-hero btn-donate" onClick={() => navigate('/auth')}>
              <span>🎁</span> I want to Donate
            </button>
            <button className="btn-hero btn-get-food" onClick={() => navigate('/auth')}>
              <span>🤲</span> I need Food
            </button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">2.5M+</span>
              <span className="stat-label">Meals Shared</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">12K+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">150+</span>
              <span className="stat-label">Cities</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Map Section */}
      <section className="map-section" id="map">
        <div className="container">
          <h2 className="section-title-center">🗺️ Find Food Near You</h2>
          <p className="section-subtitle-center">
            See real-time food listings in your area. Enable location to get started.
          </p>
          
          <div className="map-container">
            <div className="map-wrapper">
              {!userLocation ? (
                <div className="location-prompt">
                  <div className="location-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <h3>Enable Location Access</h3>
                  <p>Allow location access to see available food donations near you and connect with your community.</p>
                  <button className="btn-location" onClick={requestLocation}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                    </svg>
                    Enable Location
                  </button>
                  {locationError && <p className="error-text">{locationError}</p>}
                </div>
              ) : (
                <div ref={mapRef} className="map-display" />
              )}
            </div>
          </div>

          {userLocation && (
            <div className="map-legend">
              <div className="legend-item">
                <div className="legend-icon user-pin"></div>
                <span>Your Location</span>
              </div>
              <div className="legend-item">
                <div className="legend-icon food-pin">🍽️</div>
                <span>Available Food</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="listing-overlay" onClick={() => setSelectedListing(null)}>
          <div className="listing-detail" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedListing(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="listing-emoji">
              {selectedListing.type === 'Vegetable' ? '🥬' : 
               selectedListing.type === 'Fruit' ? '🍎' : 
               selectedListing.type === 'Grain' ? '🌾' : '🍽️'}
            </div>
            
            <h3>{selectedListing.title}</h3>
            <div className="listing-info">
              <div className="info-row">
                <span className="info-label">Quantity:</span>
                <span className="info-value">{selectedListing.quantity}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Type:</span>
                <span className="info-value">{selectedListing.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location:</span>
                <span className="info-value">📍 {selectedListing.location || 'Not specified'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Posted:</span>
                <span className="info-value">🕐 {getTimeString(selectedListing.created_at)}</span>
              </div>
            </div>
            
            {selectedListing.description && (
              <div className="listing-description">
                <h4>Description</h4>
                <p>{selectedListing.description}</p>
              </div>
            )}
            
            <button className="btn-claim" onClick={() => navigate('/auth')}>
              Claim This Food
            </button>
          </div>
        </div>
      )}

      <section className="impact-strip" id="impact">
        <div className="container">
          <h2 className="section-title-center">Our Growing Impact</h2>
          <div className="impact-grid">
            <div className="stat-item">
              <div className="stat-icon">🍽️</div>
              <h2>2.5M+</h2>
              <p>Meals Served</p>
              <span className="stat-growth">↑ 23% this month</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon">♻️</div>
              <h2>150K kg</h2>
              <p>Food Saved</p>
              <span className="stat-growth">↑ 18% this month</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon">🌱</div>
              <h2>300K kg</h2>
              <p>CO₂ Reduced</p>
              <span className="stat-growth">Environmental impact</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon">🙋</div>
              <h2>12K+</h2>
              <p>Active Volunteers</p>
              <span className="stat-growth">Growing daily</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feed-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">🥬 Fresh Listings Near You</h2>
              <p className="section-subtitle">Real food being shared in your community right now</p>
            </div>
            <button className="btn-view-all" onClick={() => navigate('/auth')}>
              View all <span>→</span>
            </button>
          </div>
          
          <div className="listings-grid">
            {loading ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                <p>Loading listings...</p>
              </div>
            ) : recentListings.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                <p>No food listings available yet. Be the first to share!</p>
              </div>
            ) : (
              recentListings.slice(0, 6).map(item => {
                const emoji = item.type === 'Vegetable' ? '🥬' : item.type === 'Fruit' ? '🍎' : item.type === 'Grain' ? '🌾' : '🍽️';

                return (
                  <div key={item.id} className="feed-card" onClick={() => setSelectedListing(item)}>
                    <div className="card-img-placeholder">
                      <span className="card-emoji">{emoji}</span>
                    </div>
                    <div className="card-content">
                      <div className="card-title">{item.title}</div>
                      <div className="card-donor">Qty: {item.quantity}</div>
                      {item.location && (
                        <div className="card-location">📍 {item.location}</div>
                      )}
                      <div className="card-meta">
                        <span>🕐 {getTimeString(item.created_at)}</span>
                        <span className="free-badge">FREE</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="how-it-works-section" id="how-it-works">
        <div className="container">
          <h2 className="section-title-center">How Annam Works</h2>
          <p className="section-subtitle-center">Four simple steps to start making a difference</p>
          
          <div className="tab-selector">
            <button 
              className={`tab-btn ${activeTab === 'donor' ? 'active' : ''}`}
              onClick={() => setActiveTab('donor')}
            >
              I want to Donate
            </button>
            <button 
              className={`tab-btn ${activeTab === 'recipient' ? 'active' : ''}`}
              onClick={() => setActiveTab('recipient')}
            >
              I need Food
            </button>
          </div>

          <div className="steps-grid">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="step-card">
                <div className="step-number">{index + 1}</div>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>

          <div className="cta-center">
            <button className="btn-primary-large" onClick={() => navigate('/auth')}>
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="container">
          <h2 className="section-title-center">Why Choose Annam?</h2>
          <p className="section-subtitle-center">Built for communities, powered by compassion</p>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials-section" id="testimonials">
        <div className="container">
          <h2 className="section-title-center">Real Stories, Real Impact</h2>
          <p className="section-subtitle-center">Hear from our community members</p>
          
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <div className="testimonial-rating">
                  {'⭐'.repeat(testimonial.rating)}
                </div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.name.charAt(0)}</div>
                  <div>
                    <div className="author-name">{testimonial.name}</div>
                    <div className="author-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Make a Difference?</h2>
            <p>Join thousands of Indians fighting food waste and hunger together.</p>
            <div className="cta-buttons">
              <button className="btn-cta-primary" onClick={() => navigate('/auth')}>
                Start Sharing Food
              </button>
              <button className="btn-cta-secondary" onClick={() => navigate('/auth')}>
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-logo">
                <span>🌾</span> Annam
              </div>
              <p>Building a hunger-free world, one meal at a time.</p>
              <div className="social-links">
                <a href="#">📘</a>
                <a href="#">🐦</a>
                <a href="#">📷</a>
                <a href="#">💼</a>
              </div>
            </div>
            
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="#how-it-works">How it Works</a>
              <a href="#features">Features</a>
              <a href="#impact">Impact</a>
              <a href="#">Safety Guidelines</a>
            </div>
            
            <div className="footer-col">
              <h4>Community</h4>
              <a href="#">Volunteer</a>
              <a href="#">Partner with Us</a>
              <a href="#">Success Stories</a>
              <a href="#">Blog</a>
            </div>
            
            <div className="footer-col">
              <h4>Support</h4>
              <a href="#">Help Center</a>
              <a href="#">Contact Us</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 Annam Foundation. All rights reserved.</p>
            <p>Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;