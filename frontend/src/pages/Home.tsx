import { Droplet, Heart, ShieldCheck, Users, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Heart size={14} />
          <span>Every Drop Counts</span>
        </div>

        <h1 className="hero-title">
          Find Blood. Donate Blood.
          <span className="hero-title-accent"> Save Lives.</span>
        </h1>

        <p className="hero-subtitle">
          A modern healthcare platform connecting blood donors with those in need.
          Join thousands of heroes making a difference every day.
        </p>

        <div className="hero-actions">
          <Link to="/register" className="cta-card cta-card-primary" id="cta-become-donor">
            <div className="cta-icon-wrap cta-icon-primary">
              <Heart size={28} />
            </div>
            <span className="cta-label">Become a Donor</span>
            <span className="cta-desc">Register and start saving lives today</span>
          </Link>

          <Link to="/dashboard" className="cta-card cta-card-secondary" id="cta-view-inventory">
            <div className="cta-icon-wrap cta-icon-secondary">
              <Droplet size={28} />
            </div>
            <span className="cta-label">View Inventory</span>
            <span className="cta-desc">Check real-time blood stock levels</span>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-item">
          <Users size={20} />
          <div>
            <span className="stat-number">10,000+</span>
            <span className="stat-label">Registered Donors</span>
          </div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <Clock size={20} />
          <div>
            <span className="stat-number">24/7</span>
            <span className="stat-label">Availability</span>
          </div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <TrendingUp size={20} />
          <div>
            <span className="stat-number">50+</span>
            <span className="stat-label">Partner Hospitals</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="feature-card">
          <div className="feature-icon">
            <Droplet size={32} />
          </div>
          <h3>Real-Time Tracking</h3>
          <p>Monitor blood inventory levels in real-time across multiple hospital branches.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <Heart size={32} />
          </div>
          <h3>Save Lives</h3>
          <p>Connect willing donors with patients in urgent need instantly through our platform.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <ShieldCheck size={32} />
          </div>
          <h3>Secure & Reliable</h3>
          <p>Built with top-tier security standards to ensure patient and donor data privacy.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
