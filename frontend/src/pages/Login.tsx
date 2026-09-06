import { useState, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { launchGoogleSignIn } from '../utils/googleAuth';

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const Login = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleGoogleSignIn = () => {
    setError(null);
    launchGoogleSignIn({
      onSuccess: async (tokens) => {
        await googleLogin(tokens);
        navigate('/dashboard');
      },
      onError: (err) => {
        setError(err);
      },
      onLoading: (isLoading) => {
        setGoogleLoading(isLoading);
      }
    });
  };

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
    <div>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Login</h1>
        <p>Access your account.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="feature-card"
        style={{ maxWidth: '420px', margin: '0 auto', marginTop: '2rem', alignItems: 'stretch', gap: '1rem' }}
        noValidate
      >
        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>
        )}

        {/* Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || isSubmitting}
          className="btn-google"
          id="btn-google-login"
        >
          <GoogleIcon />
          <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
        </button>

        <div className="auth-divider">
          <span>or with email</span>
        </div>

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Email
          <input
            ref={emailRef}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="example@gmail.com"
          />
        </label>

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
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
          {/* Forgot Password link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>
        </label>

        <button type="submit" className="btn-primary" disabled={isSubmitting || googleLoading} style={{ marginTop: '0.25rem' }}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Don't have an account? <Link to="/register" style={{ color: '#dc2626', fontWeight: 600 }}>Register</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
