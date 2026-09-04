import { Droplet, Heart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1 className="hero-title">
          Blood Bank Management & Real-Time Inventory
        </h1>
        <p className="hero-subtitle">
          A professional healthcare solution for monitoring blood stock, managing donors, and ensuring rapid response during emergencies.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn-primary">
            Become a Donor
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            View Inventory
          </Link>
        </div>
      </section>

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
