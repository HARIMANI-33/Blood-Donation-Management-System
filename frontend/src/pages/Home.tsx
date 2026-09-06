import { Droplet, Heart, ShieldCheck, Users, Clock, TrendingUp, Building2, Hospital } from 'lucide-react';
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
          A unified healthcare platform connecting blood donors, blood banks, and hospitals in real-time.
        </p>

        {/* 3 Core LifeFlow Modules */}
        <div
          className="hero-actions"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            maxWidth: '900px',
            margin: '2rem auto 0',
            width: '100%'
          }}
        >
          {/* Module 1: Become a Donor */}
          <Link to="/register" className="cta-card cta-card-primary" id="cta-become-donor">
            <div className="cta-icon-wrap cta-icon-primary">
              <Heart size={28} />
            </div>
            <span className="cta-label">Become a Donor</span>
            <span className="cta-desc">Register as a voluntary donor and schedule donation appointments</span>
          </Link>

          {/* Module 2: Blood Bank Management */}
          <Link to="/blood-bank/login" className="cta-card cta-card-secondary" id="cta-blood-bank-mgmt">
            <div
              className="cta-icon-wrap"
              style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}
            >
              <Building2 size={28} />
            </div>
            <span className="cta-label">Blood Bank Management</span>
            <span className="cta-desc">Manage real-time 8-group inventory and approve appointments</span>
          </Link>

          {/* Module 3: Hospitals */}
          <Link to="/hospital/login" className="cta-card" id="cta-hospitals">
            <div
              className="cta-icon-wrap"
              style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}
            >
              <Hospital size={28} />
            </div>
            <span className="cta-label">Hospitals</span>
            <span className="cta-desc">Search real-time blood inventory and submit priority blood requests</span>
          </Link>
        </div>

        {/* Big Screen Central Access / Sign In Options */}
        <div
          style={{
            marginTop: '2rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.92rem',
            color: 'var(--neutral-600)'
          }}
        >
          <span style={{ fontWeight: 500 }}>Already have an account?</span>
          <Link
            to="/login"
            id="home-donor-login-link"
            style={{
              color: 'var(--primary-600)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              padding: '0.4rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-100)',
              transition: 'background-color 0.15s'
            }}
          >
            <Heart size={14} />
            <span>Donor Login</span>
          </Link>
          <span style={{ color: 'var(--neutral-300)' }}>&bull;</span>
          <Link
            to="/blood-bank/login"
            id="home-bb-login-link"
            style={{
              color: 'var(--neutral-800)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              padding: '0.4rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--neutral-300)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s'
            }}
          >
            <Building2 size={14} />
            <span>Blood Bank Portal</span>
          </Link>
          <span style={{ color: 'var(--neutral-300)' }}>&bull;</span>
          <Link
            to="/hospital/login"
            id="home-hospital-login-link"
            style={{
              color: 'var(--neutral-800)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              padding: '0.4rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--neutral-300)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s'
            }}
          >
            <Hospital size={14} />
            <span>Hospital Portal</span>
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
            <span className="stat-label">Partner Facilities</span>
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
          <p>Monitor blood inventory levels in real-time across registered blood banks and centers.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <Heart size={32} />
          </div>
          <h3>Save Lives</h3>
          <p>Connect willing donors with certified blood centers in urgent need instantly.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <ShieldCheck size={32} />
          </div>
          <h3>Secure & Reliable</h3>
          <p>Built with top-tier security standards to ensure patient and facility data integrity.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
