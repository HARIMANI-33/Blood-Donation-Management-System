import { useState, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Heart, CalendarCheck, Activity, Award, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!email.trim()) {
      setError('Please enter your email address.');
      emailRef.current?.focus();
      return;
    }
    if (!GMAIL_REGEX.test(email.trim())) {
      setError('The entered email must be in the form example@gmail.com (e.g. name@gmail.com).');
      emailRef.current?.focus();
      return;
    }

    // Validate password
    if (!password) {
      setError('Please enter your password.');
      passwordRef.current?.focus();
      return;
    }

    try {
      await login({ email: email.trim(), password });
      const raw = localStorage.getItem('bloodbank_auth');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.user?.role === 'blood_bank') {
        navigate('/blood-bank/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
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
              <Heart size={14} color="#dc2626" />
              <span>Voluntary Donor Network</span>
            </div>
            <h2 className="auth-info-title">Save Lives With Every Donation</h2>
            <p className="auth-info-desc">
              Sign in to manage your appointments, view completed donations, and respond to urgent regional blood requests.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <CalendarCheck size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Verified Donation Appointments</strong>
                  <span>Book and manage hassle-free donation slots at certified centers.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Activity size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Urgent Community Alerts</strong>
                  <span>Get notified immediately when your blood type is needed nearby.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Award size={18} />
                </div>
                <div className="auth-feature-text">
                  <strong>Official Donation History</strong>
                  <span>Access your verified donation timeline and contribution records.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-info-footer">
            <ShieldCheck size={16} color="#059669" />
            <span>100% voluntary, safe, and confidential healthcare network.</span>
          </div>
        </div>

        {/* Right Side: Action Form */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Donor Sign In</h1>
            <p className="auth-form-subtitle">Access your voluntary donor dashboard</p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              Email Address
              <input
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="example@gmail.com"
                id="input-donor-email"
              />
            </label>

            <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
              Password
              <div className="password-input-wrapper">
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input password-input-field"
                  placeholder="••••••••"
                  id="input-donor-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot Password?
                </Link>
              </div>
            </label>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ marginTop: '0.25rem' }}
              id="btn-donor-login"
            >
              {isSubmitting ? 'Logging in...' : 'Sign In as Donor'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.25rem', color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#dc2626', fontWeight: 700 }} id="link-donor-register">
                Register as Donor
              </Link>
            </p>
          </form>

          {/* Quick Portal Switcher */}
          <div className="auth-switch-bar">
            <span>Looking for certified medical facilities?</span>
            <div className="auth-switch-links">
              <Link to="/blood-bank/login" className="auth-switch-link" id="link-switch-bloodbank">
                Inventory Portal →
              </Link>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Link to="/hospital/login" className="auth-switch-link" id="link-switch-hospital">
                Blood Search Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
