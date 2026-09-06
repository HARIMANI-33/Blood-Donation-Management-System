import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, Database, CalendarCheck, Truck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';

const BloodBankLogin = () => {
  const { login } = useAuth();
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
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: email.trim(), password });

      // Inspect updated auth from storage
      const raw = localStorage.getItem('bloodbank_auth');
      const parsed = raw ? JSON.parse(raw) : null;

      if (parsed?.user?.role === 'blood_bank') {
        navigate('/blood-bank/dashboard');
      } else {
        // User logged in with a donor account
        navigate('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
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
              <Building2 size={14} color="#dc2626" />
              <span>Certified Inventory Network</span>
            </div>
            <h2 className="auth-info-title">Inventory Management & Operations</h2>
            <p className="auth-info-desc">
              Secure facility management system for certified blood banks, transfusion services, and regional storage centers.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Database size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Real-Time Inventory Control</strong>
                  <span>Manage units across all 8 blood groups and track stock levels instantly.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <CalendarCheck size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Donor Appointment Processing</strong>
                  <span>Verify donor eligibility and complete appointments with automated logs.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Truck size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Hospital Requisition Fulfillment</strong>
                  <span>Coordinate rapid dispatches for emergency blood requisitions.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-info-footer">
            <ShieldCheck size={16} color="#059669" />
            <span>Authorized medical facility access only. Cold-chain storage compliant.</span>
          </div>
        </div>

        {/* Right Side: Action Form */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Inventory Portal Sign In</h1>
            <p className="auth-form-subtitle">Manage your facility blood inventory and appointments</p>
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
              Official Email
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', margin: 0 }}
                  placeholder="contact@bloodbank.org"
                  id="input-bb-email"
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', margin: 0 }}
                  placeholder="Enter your password"
                  id="input-bb-password"
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
              id="btn-bb-login"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In to Inventory Portal'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.2rem', color: '#64748b' }}>
              New to Inventory Management?{' '}
              <Link to="/blood-bank/register" style={{ color: '#dc2626', fontWeight: 700 }} id="link-bb-register">
                Register for Inventory Management
              </Link>
            </p>
          </form>

          {/* Quick Portal Switcher */}
          <div className="auth-switch-bar">
            <span>Need to access another portal?</span>
            <div className="auth-switch-links">
              <Link to="/login" className="auth-switch-link" id="link-bb-switch-donor">
                Donor Login →
              </Link>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Link to="/hospital/login" className="auth-switch-link" id="link-bb-switch-hospital">
                Blood Search Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BloodBankLogin;

