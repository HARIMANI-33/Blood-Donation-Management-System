import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hospital, Mail, Lock, Eye, EyeOff, Search, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loginHospital } from '../services/hospital.service';
import { ApiError } from '../services/api';

const HospitalLogin = () => {
  const { loginWithSession } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both official email and password');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await loginHospital(email.trim(), password);

      if (res.data?.token && res.data?.user) {
        loginWithSession(res.data.user, res.data.token);
        navigate('/hospital/dashboard');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please verify your official email and password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-split-card">
        {/* Left Side: Brand & Feature Highlights (Eliminates empty white space) */}
        <div className="auth-info-panel">
          <div>
            <div className="auth-info-badge">
              <Hospital size={14} color="#dc2626" />
              <span>Blood Search Network</span>
            </div>
            <h2 className="auth-info-title">Search Blood & Emergency Requisition</h2>
            <p className="auth-info-desc">
              Dedicated clinical portal for registered hospitals, trauma centers, and healthcare providers to search blood availability and requisition emergency units.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Search size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Real-Time Cross-Network Search</strong>
                  <span>Check verified inventory across all certified regional blood banks instantly.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Zap size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Emergency Priority Dispatch</strong>
                  <span>Fast-track blood requisitions for critical surgeries, ICUs, and trauma care.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Verified & Safe Blood Units</strong>
                  <span>Every unit is screened and cold-chain tracked from storage to transfusion.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-info-footer">
            <ShieldCheck size={16} color="#059669" />
            <span>24/7 Verified Healthcare Access. Emergency medical facilities only.</span>
          </div>
        </div>

        {/* Right Side: Action Form */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Blood Search Sign In</h1>
            <p className="auth-form-subtitle">Search real-time blood availability and submit requisitions</p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  border: '1px solid #fecaca',
                  textAlign: 'center'
                }}
              >
                {error}
              </div>
            )}

            <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
              Official Email Address
              <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--neutral-400)'
                  }}
                />
                <input
                  type="email"
                  id="hospital-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', margin: 0 }}
                  placeholder="admin@cityhospital.org"
                />
              </div>
            </label>

            <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
              Password
              <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--neutral-400)'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="hospital-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', margin: 0 }}
                  placeholder="Enter hospital password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--neutral-500)',
                    padding: 0
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ marginTop: '0.4rem', width: '100%' }}
              id="btn-hospital-login"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In to Blood Search Portal'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.2rem', color: '#64748b' }}>
              Need access to search blood?{' '}
              <Link to="/hospital/register" style={{ color: '#dc2626', fontWeight: 700 }} id="link-hospital-register">
                Register for Blood Search
              </Link>
            </p>
          </form>

          {/* Quick Portal Switcher */}
          <div className="auth-switch-bar">
            <span>Need to access another portal?</span>
            <div className="auth-switch-links">
              <Link to="/login" className="auth-switch-link" id="link-hosp-switch-donor">
                Donor Login →
              </Link>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Link to="/blood-bank/login" className="auth-switch-link" id="link-hosp-switch-bloodbank">
                Inventory Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalLogin;
