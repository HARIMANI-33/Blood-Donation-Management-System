import { Droplet, Heart, ShieldCheck, Droplets, Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const BloodDropSvg = () => (
  <svg
    viewBox="0 0 12 16"
    width="11"
    height="15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 2px 4px rgba(185, 28, 28, 0.45))' }}
  >
    <defs>
      <linearGradient id="bloodDropGrad" x1="6" y1="0" x2="6" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="40%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    <path
      d="M6 0.5C6 0.5 0.5 7 0.5 10.8C0.5 13.7 2.9 15.5 6 15.5C9.1 15.5 11.5 13.7 11.5 10.8C11.5 7 6 0.5 6 0.5Z"
      fill="url(#bloodDropGrad)"
    />
    {/* Subtle specular reflection for realistic fluid sheen */}
    <path
      d="M4 8.5C3.2 9.2 2.8 10.2 2.8 11.2C2.8 11.5 3 11.7 3.3 11.6C3.6 11.5 3.7 11.2 3.8 10.9C4 9.8 4.6 9 5.3 8.5C5.6 8.3 5.5 7.9 5.2 8C4.8 8.1 4.3 8.2 4 8.5Z"
      fill="rgba(255, 255, 255, 0.75)"
    />
  </svg>
);

const Home = () => {
  return (
    <div className="home-container">
      {/* Subtle organic flowing wave ribbon background element */}
      <div className="home-bg-flow" aria-hidden="true">
        <svg
          viewBox="0 0 1440 620"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="home-flow-svg"
        >
          <path
            d="M-80 180 C 240 60, 480 260, 820 140 C 1140 20, 1360 220, 1540 160"
            stroke="url(#flowWaveGrad1)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.38"
          />
          <path
            d="M-100 240 C 260 120, 520 320, 880 190 C 1200 80, 1400 280, 1560 220"
            stroke="url(#flowWaveGrad2)"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
            fill="none"
            opacity="0.28"
          />
          <defs>
            <linearGradient id="flowWaveGrad1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fecdd3" stopOpacity="0.1" />
              <stop offset="35%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fecdd3" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="flowWaveGrad2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Heart size={14} />
          <span>Every Drop Counts</span>
        </div>

        <h1 className="hero-title">
          Find Blood. Donate Blood.{' '}
          <span className="hero-title-accent-wrap">
            <span className="hero-title-accent">Save Lives</span>
            {/* Continuous vertical blood-drop cascade originating immediately after SAVE LIVES */}
            <span className="blood-flow-track" aria-hidden="true">
              <span className="blood-drop drop-1">
                <BloodDropSvg />
              </span>
              <span className="blood-drop drop-2">
                <BloodDropSvg />
              </span>
              <span className="blood-drop drop-3">
                <BloodDropSvg />
              </span>
              <span className="blood-drop drop-4">
                <BloodDropSvg />
              </span>
            </span>
          </span>
        </h1>

        <p className="hero-subtitle">
          A unified healthcare platform connecting blood donors, blood banks, and hospitals in real-time.
        </p>

        {/* 3 Core LifeFlow Actions with Distinct Vibrant Thematic Colors */}
        <div className="hero-actions">
          {/* Card 1: Become a Donor (Vibrant Crimson / Ruby) */}
          <Link to="/register" className="cta-card cta-card-donor" id="cta-become-donor">
            <div className="cta-icon-wrap cta-icon-donor">
              <Heart size={30} />
            </div>
            <div className="cta-content">
              <span className="cta-label">Become a Donor</span>
              <span className="cta-desc">Give blood. Save lives. Schedule your donation.</span>
            </div>
            <div className="cta-arrow cta-arrow-donor">
              <ArrowRight size={22} />
            </div>
          </Link>

          {/* Card 2: Inventory Management (Royal Sapphire Blue) */}
          <Link to="/blood-bank/register" className="cta-card cta-card-inventory" id="cta-blood-bank-mgmt">
            <div className="cta-icon-wrap cta-icon-inventory">
              <Droplets size={30} />
            </div>
            <div className="cta-content">
              <span className="cta-label">Inventory Management</span>
              <span className="cta-desc">Manage blood inventory, donations and availability in real time.</span>
            </div>
            <div className="cta-arrow cta-arrow-inventory">
              <ArrowRight size={22} />
            </div>
          </Link>

          {/* Card 3: Search Blood (Vibrant Emerald / Teal) */}
          <Link to="/hospital/register" className="cta-card cta-card-search" id="cta-hospitals">
            <div className="cta-icon-wrap cta-icon-search">
              <Search size={30} />
            </div>
            <div className="cta-content">
              <span className="cta-label">Search Blood</span>
              <span className="cta-desc">Find available blood and connect with nearby healthcare facilities.</span>
            </div>
            <div className="cta-arrow cta-arrow-search">
              <ArrowRight size={22} />
            </div>
          </Link>
        </div>

        {/* Quick Access / Sign In Options in a Clean Centered Row */}
        <div
          style={{
            marginTop: '2.25rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
            fontSize: '0.9rem',
            color: 'var(--neutral-600)'
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--neutral-500)' }}>Quick Portal Access:</span>
          <Link
            to="/login"
            id="home-donor-login-link"
            style={{
              color: '#be123c',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              padding: '0.42rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#ffe4e6',
              border: '1px solid #fecdd3',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s'
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
              color: '#1d4ed8',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              padding: '0.42rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s'
            }}
          >
            <Droplets size={14} />
            <span>Inventory Portal</span>
          </Link>
          <span style={{ color: 'var(--neutral-300)' }}>&bull;</span>
          <Link
            to="/hospital/login"
            id="home-hospital-login-link"
            style={{
              color: '#047857',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              padding: '0.42rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s'
            }}
          >
            <Search size={14} />
            <span>Blood Search Portal</span>
          </Link>
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

