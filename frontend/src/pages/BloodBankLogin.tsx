import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-600)',
            marginBottom: '0.75rem'
          }}
        >
          <Building2 size={28} />
        </div>
        <h1 className="page-title" style={{ fontSize: '1.85rem' }}>
          Blood Bank Portal
        </h1>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.95rem' }}>
          Manage your organization's blood inventory and donor appointments.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="feature-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
          padding: '2rem',
          alignItems: 'stretch'
        }}
        noValidate
      >
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '0.9rem',
              textAlign: 'center',
              border: '1px solid #fecaca'
            }}
          >
            {error}
          </div>
        )}

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.88rem' }}>
          Official Email
          <div style={{ position: 'relative', marginTop: '0.25rem' }}>
            <Mail
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
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
              style={{ paddingLeft: '2.4rem' }}
              placeholder="contact@bloodbank.org"
              id="input-bb-email"
            />
          </div>
        </label>

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.88rem' }}>
          Password
          <div style={{ position: 'relative', marginTop: '0.25rem' }}>
            <Lock
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
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
              style={{ paddingLeft: '2.4rem', paddingRight: '2.5rem' }}
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
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{ marginTop: '0.5rem', width: '100%' }}
          id="btn-bb-login"
        >
          {isSubmitting ? 'Logging in...' : 'Sign In to Portal'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--neutral-600)' }}>
          New Blood Bank?{' '}
          <Link to="/blood-bank/register" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
            Register your Organization
          </Link>
        </div>
      </form>
    </div>
  );
};

export default BloodBankLogin;
