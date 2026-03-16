import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';
import { 
  ArrowRight, Leaf, Users, Truck, Shield, CheckCircle, Star, 
  Menu, X, Play, Sparkles, TrendingUp, Heart, Globe, Zap,
  ArrowUpRight
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Images
const heroImage = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80';
const farmImage = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80';
const communityImage = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80';
const deliveryImage = '/delivery.png';
const testimonial1 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80';
const testimonial2 = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80';
const testimonial3 = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80';

// Custom Hooks
const useInView = (options = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  return [ref, isInView] as const;
};

const useCounter = (end: number, duration: number = 2000, isInView: boolean) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView]);
  
  return count;
};

// Components
const MagneticButton = ({ children, className, onClick }: any) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPosition({ x: x * 0.3, y: y * 0.3 });
  };
  
  const handleMouseLeave = () => setPosition({ x: 0, y: 0 });
  
  return (
    <button
      ref={buttonRef}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {children}
    </button>
  );
};

const TiltCard = ({ children, className }: any) => {
  return (
    <div
      className={`tilt-card ${className}`}
    >
      {children}
    </div>
  );
};

const TextReveal = ({ children, delay = 0 }: any) => {
  const [ref, isInView] = useInView();
  
  return (
    <div ref={ref} className="text-reveal-container">
      <span 
        className={`text-reveal ${isInView ? 'revealed' : ''}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {children}
      </span>
    </div>
  );
};

const ParallaxSection = ({ children, speed = 0.5 }: any) => {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.innerHeight - rect.top;
      setOffset(scrolled * speed * 0.1);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);
  
  return (
    <div ref={ref} style={{ transform: `translateY(${offset}px)` }}>
      {children}
    </div>
  );
};

const AnimatedGradientText = ({ children }: any) => (
  <span className="animated-gradient-text">{children}</span>
);

const FloatingElement = ({ children, delay = 0, amplitude = 20 }: any) => (
  <div 
    className="floating-element" 
    style={{ 
      animationDelay: `${delay}s`,
      '--amplitude': `${amplitude}px`
    } as React.CSSProperties}
  >
    {children}
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  
  // Refs for sections
  const [statsRef, statsInView] = useInView();
  const [impactRef, impactInView] = useInView();
  
  // Animated counters
  const mealsCount = useCounter(50000, 2000, statsInView);
  const partnersCount = useCounter(500, 2000, statsInView);
  const citiesCount = useCounter(25, 2000, statsInView);
  const tonsCount = useCounter(150, 2000, impactInView);
  const familiesCount = useCounter(10000, 2000, impactInView);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      // Detect active section
      const sections = ['how-it-works', 'features', 'impact', 'testimonials'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    window.dispatchEvent(new CustomEvent('annam-intro-transition', { detail: '/auth' }));
  };
  const handleLogin = () => navigate('/auth');
  
  const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
        <div className="grid-overlay" />
      </div>

      {/* Header */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          <Link to="/" className="logo">
            <div className="logo-icon-wrapper">
              <span className="logo-icon">🌾</span>
              <div className="logo-glow" />
            </div>
            <span className="logo-text">Annam</span>
          </Link>

          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link 
              to="/marketplace" 
              className="nav-link nav-link-highlight"
            >
              <span className="nav-icon">🛒</span>
              <span>Marketplace</span>
              <span className="nav-badge">New</span>
            </Link>
            <a 
              href="#how-it-works" 
              className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
              onClick={(e) => scrollToSection(e, 'how-it-works')}
            >
              How It Works
            </a>
            <a 
              href="#features" 
              className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
              onClick={(e) => scrollToSection(e, 'features')}
            >
              Features
            </a>
            <a 
              href="#impact" 
              className={`nav-link ${activeSection === 'impact' ? 'active' : ''}`}
              onClick={(e) => scrollToSection(e, 'impact')}
            >
              Impact
            </a>
            <a 
              href="#testimonials" 
              className={`nav-link ${activeSection === 'testimonials' ? 'active' : ''}`}
              onClick={(e) => scrollToSection(e, 'testimonials')}
            >
              Stories
            </a>
          </nav>

          <div className="header-actions">
            <button 
              className="btn-login"
              onClick={handleLogin}
            >
              Log In
            </button>
            <MagneticButton 
              className="btn-signup"
              onClick={handleGetStarted}
            >
              <span>Get Started</span>
              <ArrowRight size={16} />
            </MagneticButton>
          </div>

          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="scroll-progress">
          <div 
            className="scroll-progress-bar"
            style={{ 
              width: `${(window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100}%` 
            }}
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <FloatingElement delay={0} amplitude={10}>
              <div className="hero-badge">
                <Sparkles size={16} className="sparkle-icon" />
                <span>Revolutionizing Food Distribution</span>
                <ArrowUpRight size={14} />
              </div>
            </FloatingElement>
          </div>
          
          <h1 className="hero-title">
            <TextReveal>Connect Surplus Food</TextReveal>
            <TextReveal delay={100}>
              <AnimatedGradientText>With Those Who Need It</AnimatedGradientText>
            </TextReveal>
          </h1>
          
          <div className="hero-description">
            <TextReveal delay={200}>
              Annam bridges the gap between farmers, NGOs, and volunteers
            </TextReveal>
            <TextReveal delay={300}>
              to ensure no food goes to waste. Join our mission to create
            </TextReveal>
            <TextReveal delay={400}>
              a sustainable food ecosystem for everyone.
            </TextReveal>
          </div>
          
          <div className="hero-cta">
            <MagneticButton 
              className="btn-primary"
              onClick={handleGetStarted}
            >
              <span>Start Your Journey</span>
              <ArrowRight size={20} />
              <div className="btn-shine" />
            </MagneticButton>
            <button className="btn-secondary">
              <Play size={20} />
              <span>Watch Demo</span>
            </button>
          </div>
          
          <div className="hero-stats" ref={statsRef}>
            <div className="stat-item">
              <span className="stat-number">
                {mealsCount.toLocaleString()}+
              </span>
              <span className="stat-label">Meals Saved</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">{partnersCount}+</span>
              <span className="stat-label">Active Partners</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">{citiesCount}+</span>
              <span className="stat-label">Cities Covered</span>
            </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <ParallaxSection speed={0.3}>
            <div className="hero-image-wrapper">
              <div className="image-frame">
                <img 
                  src={heroImage} 
                  alt="Fresh produce ready for distribution" 
                  className="hero-image"
                />
                <div className="image-overlay" />
              </div>
              
              {/* Floating Cards */}
              <FloatingElement delay={0} amplitude={15}>
                <TiltCard className="floating-card card-1">
                  <div className="card-icon-wrapper success">
                    <CheckCircle size={20} />
                  </div>
                  <div className="card-content">
                    <span className="card-title">Pickup Completed</span>
                    <span className="card-subtitle">15 kg vegetables saved</span>
                  </div>
                  <div className="card-pulse" />
                </TiltCard>
              </FloatingElement>
              
              <FloatingElement delay={0.5} amplitude={12}>
                <TiltCard className="floating-card card-2">
                  <div className="card-icon-wrapper primary">
                    <Users size={20} />
                  </div>
                  <div className="card-content">
                    <span className="card-title">New NGO Partner</span>
                    <span className="card-subtitle">Hope Foundation joined</span>
                  </div>
                </TiltCard>
              </FloatingElement>
            </div>
          </ParallaxSection>
          
          {/* Background Elements */}
          <div className="hero-bg-elements">
            <div className="floating-shape shape-1" />
            <div className="floating-shape shape-2" />
            <div className="floating-shape shape-3" />
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className="marquee-section">
        <div className="marquee-track">
          <div className="marquee-content">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="marquee-items">
                <span className="marquee-item">🌾 Sustainable Farming</span>
                <span className="marquee-item">🤝 Community First</span>
                <span className="marquee-item">🚛 Fast Delivery</span>
                <span className="marquee-item">💚 Zero Waste</span>
                <span className="marquee-item">🌍 Global Impact</span>
                <span className="marquee-item">✨ Fresh Produce</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Timeline */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-header">
          <span className="section-tag">
            <Zap size={14} />
            Simple Process
          </span>
          <h2>
            <TextReveal>How Annam Works</TextReveal>
          </h2>
          <p>Our streamlined process makes food redistribution effortless</p>
        </div>

        <div className="timeline-container">
          <div className="timeline-line">
            <div className="timeline-progress" />
          </div>
          
          {[
            {
              number: '01',
              icon: <Leaf size={32} />,
              title: 'Farmers List Surplus',
              description: 'Farmers and food businesses list their surplus produce with just a few taps.',
              color: 'green'
            },
            {
              number: '02',
              icon: <Users size={32} />,
              title: 'NGOs Claim Donations',
              description: 'Verified NGOs browse and claim what their communities need most.',
              color: 'blue'
            },
            {
              number: '03',
              icon: <Truck size={32} />,
              title: 'Volunteers Deliver',
              description: 'Our volunteer network ensures food reaches its destination fresh.',
              color: 'purple'
            }
          ].map((step, index) => {
            const [ref, isInView] = useInView();
            return (
              <div 
                key={index}
                ref={ref}
                className={`timeline-step ${isInView ? 'visible' : ''}`}
                style={{ '--delay': `${index * 0.2}s` } as React.CSSProperties}
              >
                <div className={`timeline-node ${step.color}`}>
                  <span className="step-number">{step.number}</span>
                </div>
                <TiltCard className={`process-card ${step.color}`}>
                  <div className="process-icon">
                    {step.icon}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className="card-arrow">
                    <ArrowRight size={20} />
                  </div>
                </TiltCard>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-tag">
            <Star size={14} />
            Why Choose Us
          </span>
          <h2>
            <TextReveal>Built for Maximum Impact</TextReveal>
          </h2>
          <p>Powerful features designed to maximize food redistribution</p>
        </div>

        <div className="bento-grid">
          <TiltCard className="bento-card bento-large">
            <div className="bento-image-wrapper">
              <img src={farmImage} alt="Local farms" />
              <div className="bento-overlay" />
            </div>
            <div className="bento-content">
              <div className="bento-icon green">
                <Leaf size={24} />
              </div>
              <h3>For Farmers & Producers</h3>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Easy listing in under 2 minutes</li>
                <li><CheckCircle size={16} /> Flexible pickup scheduling</li>
                <li><CheckCircle size={16} /> Environmental impact tracking</li>
                <li><CheckCircle size={16} /> Tax deduction documentation</li>
              </ul>

              <div className="landing-farmer-stats">
                <div className="landing-farmer-stat">
                  <Globe size={18} />
                  <div className="landing-farmer-stat-text">
                    <span className="landing-farmer-stat-value">25+</span>
                    <span className="landing-farmer-stat-label">Cities</span>
                  </div>
                </div>
                <div className="landing-farmer-stat">
                  <Users size={18} />
                  <div className="landing-farmer-stat-text">
                    <span className="landing-farmer-stat-value">500+</span>
                    <span className="landing-farmer-stat-label">Partners</span>
                  </div>
                </div>
                <div className="landing-farmer-stat">
                  <Heart size={18} />
                  <div className="landing-farmer-stat-text">
                    <span className="landing-farmer-stat-value">50K+</span>
                    <span className="landing-farmer-stat-label">Meals</span>
                  </div>
                </div>
                <div className="landing-farmer-stat">
                  <Leaf size={18} />
                  <div className="landing-farmer-stat-text">
                    <span className="landing-farmer-stat-value">150T</span>
                    <span className="landing-farmer-stat-label">Saved</span>
                  </div>
                </div>
              </div>

              <MagneticButton className="bento-cta" onClick={handleGetStarted}>
                Start Donating <ArrowRight size={16} />
              </MagneticButton>
            </div>
          </TiltCard>

          <TiltCard className="bento-card">
            <div className="bento-image-wrapper">
              <img src={communityImage} alt="Community support" />
              <div className="bento-overlay" />
            </div>
            <div className="bento-content">
              <div className="bento-icon blue">
                <Heart size={24} />
              </div>
              <h3>For NGOs</h3>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Real-time availability</li>
                <li><CheckCircle size={16} /> Dietary filters</li>
                <li><CheckCircle size={16} /> Multi-pickup coordination</li>
              </ul>
              <MagneticButton className="bento-cta" onClick={handleGetStarted}>
                Partner With Us <ArrowRight size={16} />
              </MagneticButton>
            </div>
          </TiltCard>

          <TiltCard className="bento-card">
            <div className="bento-image-wrapper">
              <img src={deliveryImage} alt="Delivery" />
              <div className="bento-overlay" />
            </div>
            <div className="bento-content">
              <div className="bento-icon purple">
                <Truck size={24} />
              </div>
              <h3>For Volunteers</h3>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Optimized routes</li>
                <li><CheckCircle size={16} /> Flexible scheduling</li>
                <li><CheckCircle size={16} /> Recognition badges</li>
              </ul>
              <MagneticButton className="bento-cta" onClick={handleGetStarted}>
                Join as Driver <ArrowRight size={16} />
              </MagneticButton>
            </div>
          </TiltCard>

        </div>
      </section>

      {/* Impact Section - Immersive */}
      <section id="impact" className="impact-section" ref={impactRef}>
        <div className="impact-bg">
          <div className="impact-gradient" />
          <div className="impact-particles">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="particle"
                style={{
                  '--x': `${Math.random() * 100}%`,
                  '--y': `${Math.random() * 100}%`,
                  '--duration': `${3 + Math.random() * 4}s`,
                  '--delay': `${Math.random() * 2}s`
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        
        <div className="impact-content">
          <span className="section-tag light">
            <TrendingUp size={14} />
            Our Impact
          </span>
          <h2>Making a Real Difference</h2>
          <p>
            Every meal saved is a step towards a sustainable future.
            Together, we're building a community that values food.
          </p>

          <div className="impact-metrics">
            <div className="metric-card">
              <div className="metric-icon">
                <Leaf size={32} />
              </div>
              <span className="metric-value">{tonsCount}+</span>
              <span className="metric-label">Tons of Food Saved</span>
              <div className="metric-bar">
                <div className="metric-progress" style={{ width: '75%' }} />
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">
                <Users size={32} />
              </div>
              <span className="metric-value">{familiesCount.toLocaleString()}+</span>
              <span className="metric-label">Families Helped</span>
              <div className="metric-bar">
                <div className="metric-progress" style={{ width: '85%' }} />
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">
                <TrendingUp size={32} />
              </div>
              <span className="metric-value">75%</span>
              <span className="metric-label">Reduction in Waste</span>
              <div className="metric-bar">
                <div className="metric-progress" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="impact-features">
          <TiltCard className="impact-feature-card">
            <Shield size={40} />
            <h4>Verified Partners</h4>
            <p>All organizations are thoroughly vetted for trust and accountability.</p>
          </TiltCard>
          <TiltCard className="impact-feature-card">
            <Leaf size={40} />
            <h4>Eco-Friendly</h4>
            <p>Reducing carbon footprint by minimizing food waste in landfills.</p>
          </TiltCard>
        </div>
      </section>

      {/* Testimonials - Carousel */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-header">
          <span className="section-tag">
            <Heart size={14} />
            Success Stories
          </span>
          <h2>
            <TextReveal>Voices from Our Community</TextReveal>
          </h2>
          <p>Real stories from people making a difference</p>
        </div>

        <div className="testimonials-container">
          <div className="testimonials-track">
            {[
              {
                quote: "Annam has transformed how we handle surplus produce. What used to go to waste now reaches families in need. The platform is incredibly easy to use.",
                author: "Rajesh Sharma",
                role: "Organic Farmer, Punjab",
                image: testimonial1,
                featured: true
              },
              {
                quote: "As an NGO serving 200+ families daily, reliable food sources are crucial. Annam connects us with quality donations consistently.",
                author: "Priya Patel",
                role: "Director, Food for All NGO",
                image: testimonial2
              },
              {
                quote: "Volunteering as a driver gives me purpose. The route optimization helps me complete more deliveries, maximizing my impact.",
                author: "Amit Kumar",
                role: "Volunteer Driver, Delhi",
                image: testimonial3
              }
            ].map((testimonial, index) => (
              <TiltCard 
                key={index}
                className={`testimonial-card ${testimonial.featured ? 'featured' : ''}`}
              >
                <div className="testimonial-rating">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="testimonial-quote">"{testimonial.quote}"</p>
                <div className="testimonial-author">
                  <div className="author-image">
                    <img src={testimonial.image} alt={testimonial.author} />
                    <div className="author-status" />
                  </div>
                  <div className="author-info">
                    <h4>{testimonial.author}</h4>
                    <span>{testimonial.role}</span>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Immersive */}
      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-gradient" />
          <div className="cta-shapes">
            <div className="cta-shape shape-1" />
            <div className="cta-shape shape-2" />
            <div className="cta-shape shape-3" />
          </div>
        </div>
        
        <div className="cta-content">
          <FloatingElement amplitude={10}>
            <Sparkles size={48} className="cta-icon" />
          </FloatingElement>
          <h2>Ready to Make an Impact?</h2>
          <p>
            Join thousands of farmers, NGOs, and volunteers who are already
            making a difference. Start your journey with Annam today.
          </p>
          <div className="cta-buttons">
            <MagneticButton className="btn-cta-primary" onClick={handleGetStarted}>
              <span>Create Free Account</span>
              <ArrowRight size={20} />
            </MagneticButton>
            <Link to="/auth" className="btn-cta-secondary">
              Already have an account? Log in
              <ArrowUpRight size={16} />
            </Link>
          </div>
          
          <div className="cta-trust">
            <span>Trusted by 500+ organizations</span>
            <div className="trust-logos">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="trust-logo" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-glow" />
        
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <div className="logo-icon-wrapper">
                <span className="logo-icon">🌾</span>
              </div>
              <span className="logo-text">Annam</span>
            </Link>
            <p>
              Connecting surplus food with those who need it most.
              Building a sustainable future, one meal at a time.
            </p>
            <div className="footer-social">
              {['Twitter', 'LinkedIn', 'Instagram', 'GitHub'].map((social, i) => (
                <a key={i} href="#" className="social-link">
                  {social[0]}
                </a>
              ))}
            </div>
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
              <a href="#">Careers <span className="hiring-badge">Hiring</span></a>
              <a href="#">Press</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 Annam. All rights reserved.</p>
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