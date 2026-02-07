import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';
import { ArrowRight, Leaf, Users, Truck, Shield, CheckCircle, Star, Menu, X } from 'lucide-react';
import { useState } from 'react';

// Professional food-related images
const heroImage = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80';
const farmImage = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80';
const communityImage = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80';
const deliveryImage = 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&q=80';
const testimonial1 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80';
const testimonial2 = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80';
const testimonial3 = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80';

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <span className="logo-icon">🌾</span>
            <span className="logo-text">Annam</span>
          </Link>

          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link to="/marketplace" className="nav-link nav-link-highlight" onClick={() => setMobileMenuOpen(false)}>🛒 Marketplace</Link>
            <a href="#how-it-works" className="nav-link" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#impact" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Our Impact</a>
            <a href="#testimonials" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Stories</a>
          </nav>

          <div className="header-actions">
            <button className="btn-login" onClick={handleLogin}>
              Log In
            </button>
            <button className="btn-signup" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Leaf size={16} />
            <span>Reducing Food Waste Together</span>
          </div>
          <h1>
            Connect Surplus Food <br />
            <span className="gradient-text">With Those Who Need It</span>
          </h1>
          <p className="hero-description">
            Annam bridges the gap between farmers, NGOs, and volunteers to ensure 
            no food goes to waste. Join our mission to create a sustainable food ecosystem.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={handleGetStarted}>
              Join Annam Today
              <ArrowRight size={20} />
            </button>
            <a href="#how-it-works" className="btn-secondary">
              Learn More
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Meals Saved</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Active Partners</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">25+</span>
              <span className="stat-label">Cities Covered</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-wrapper">
            <img src={heroImage} alt="Fresh produce ready for distribution" className="hero-image" />
            <div className="floating-card card-1">
              <CheckCircle size={20} className="card-icon success" />
              <div>
                <span className="card-title">Pickup Completed</span>
                <span className="card-subtitle">15 kg vegetables saved</span>
              </div>
            </div>
            <div className="floating-card card-2">
              <Users size={20} className="card-icon primary" />
              <div>
                <span className="card-title">New NGO Partner</span>
                <span className="card-subtitle">Hope Foundation joined</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-header">
          <span className="section-tag">Simple Process</span>
          <h2>How Annam Works</h2>
          <p>Our streamlined process makes food redistribution effortless</p>
        </div>

        <div className="process-grid">
          <div className="process-card">
            <div className="process-number">01</div>
            <div className="process-icon">
              <Leaf size={32} />
            </div>
            <h3>Farmers List Surplus</h3>
            <p>Farmers and food businesses list their surplus produce on our platform with pickup details.</p>
          </div>

          <div className="process-connector"></div>

          <div className="process-card">
            <div className="process-number">02</div>
            <div className="process-icon">
              <Users size={32} />
            </div>
            <h3>NGOs Claim Donations</h3>
            <p>Verified NGOs browse available listings and claim what their communities need most.</p>
          </div>

          <div className="process-connector"></div>

          <div className="process-card">
            <div className="process-number">03</div>
            <div className="process-icon">
              <Truck size={32} />
            </div>
            <h3>Volunteers Deliver</h3>
            <p>Our network of volunteer drivers picks up and delivers food to distribution centers.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-tag">Why Choose Us</span>
          <h2>Built for Impact</h2>
          <p>Powerful features designed to maximize food redistribution efficiency</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <img src={farmImage} alt="Local farms" className="feature-image" />
            <div className="feature-content">
              <h3>For Farmers & Producers</h3>
              <ul className="feature-list">
                <li><CheckCircle size={18} /> Easy listing in under 2 minutes</li>
                <li><CheckCircle size={18} /> Schedule flexible pickup times</li>
                <li><CheckCircle size={18} /> Track your environmental impact</li>
                <li><CheckCircle size={18} /> Tax deduction documentation</li>
              </ul>
              <button className="btn-feature" onClick={handleGetStarted}>
                Start Donating <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="feature-card">
            <img src={communityImage} alt="Community support" className="feature-image" />
            <div className="feature-content">
              <h3>For NGOs & Charities</h3>
              <ul className="feature-list">
                <li><CheckCircle size={18} /> Real-time food availability</li>
                <li><CheckCircle size={18} /> Filter by dietary requirements</li>
                <li><CheckCircle size={18} /> Coordinate multiple pickups</li>
                <li><CheckCircle size={18} /> Distribution analytics</li>
              </ul>
              <button className="btn-feature" onClick={handleGetStarted}>
                Partner With Us <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="feature-card">
            <img src={deliveryImage} alt="Delivery volunteers" className="feature-image" />
            <div className="feature-content">
              <h3>For Volunteer Drivers</h3>
              <ul className="feature-list">
                <li><CheckCircle size={18} /> Optimized route planning</li>
                <li><CheckCircle size={18} /> Flexible scheduling</li>
                <li><CheckCircle size={18} /> Earn recognition badges</li>
                <li><CheckCircle size={18} /> Track your contributions</li>
              </ul>
              <button className="btn-feature" onClick={handleGetStarted}>
                Become a Driver <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="impact-section">
        <div className="impact-content">
          <span className="section-tag light">Our Impact</span>
          <h2>Making a Real Difference</h2>
          <p>
            Every meal saved is a step towards a more sustainable future. 
            Together, we're building a community that values food and cares for each other.
          </p>
          
          <div className="impact-metrics">
            <div className="metric">
              <span className="metric-value">150+</span>
              <span className="metric-label">Tons of Food Saved</span>
            </div>
            <div className="metric">
              <span className="metric-value">10K+</span>
              <span className="metric-label">Families Helped</span>
            </div>
            <div className="metric">
              <span className="metric-value">75%</span>
              <span className="metric-label">Reduction in Waste</span>
            </div>
          </div>
        </div>
        
        <div className="impact-visual">
          <div className="impact-card">
            <Shield size={40} />
            <h4>Verified Partners</h4>
            <p>All NGOs and organizations are thoroughly vetted for trust and accountability.</p>
          </div>
          <div className="impact-card">
            <Leaf size={40} />
            <h4>Eco-Friendly</h4>
            <p>Reducing carbon footprint by minimizing food waste in landfills.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-header">
          <span className="section-tag">Success Stories</span>
          <h2>Voices from Our Community</h2>
          <p>Real stories from the people making a difference</p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card featured">
            <div className="testimonial-rating">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="testimonial-quote">
              "Annam has transformed how we handle surplus produce. What used to go to waste 
              now reaches families in need. The platform is incredibly easy to use, and seeing 
              the impact reports motivates us to donate even more."
            </p>
            <div className="testimonial-author">
              <img src={testimonial1} alt="Rajesh Sharma" />
              <div>
                <h4>Rajesh Sharma</h4>
                <span>Organic Farmer, Punjab</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-rating">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="testimonial-quote">
              "As an NGO serving 200+ families daily, reliable food sources are crucial. 
              Annam connects us with quality donations consistently."
            </p>
            <div className="testimonial-author">
              <img src={testimonial2} alt="Priya Patel" />
              <div>
                <h4>Priya Patel</h4>
                <span>Director, Food for All NGO</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-rating">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="testimonial-quote">
              "Volunteering as a driver gives me purpose. The route optimization 
              helps me complete more deliveries, maximizing my impact."
            </p>
            <div className="testimonial-author">
              <img src={testimonial3} alt="Amit Kumar" />
              <div>
                <h4>Amit Kumar</h4>
                <span>Volunteer Driver, Delhi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Make an Impact?</h2>
          <p>
            Join thousands of farmers, NGOs, and volunteers who are already 
            making a difference. Start your journey with Annam today.
          </p>
          <div className="cta-buttons">
            <button className="btn-cta-primary" onClick={handleGetStarted}>
              Create Free Account
              <ArrowRight size={20} />
            </button>
            <Link to="/auth" className="btn-cta-secondary">
              Already have an account? Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-icon">🌾</span>
              <span className="logo-text">Annam</span>
            </div>
            <p>Connecting surplus food with those who need it most. Building a sustainable future, one meal at a time.</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Platform</h4>
              <a href="#how-it-works">How It Works</a>
              <a href="#features">Features</a>
              <a href="#impact">Our Impact</a>
              <Link to="/auth">Get Started</Link>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="#">Help Center</a>
              <a href="#">Partner Guidelines</a>
              <a href="#">Food Safety</a>
              <a href="#">Blog</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Press</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 Annam. All rights reserved.</p>
          <div className="footer-legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;