import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hospital, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '2.5rem 1rem' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-700)',
            marginBottom: '0.75rem'
          }}
        >
          <Hospital size={30} />
        </div>
        <h1 className="page-title" style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>
          Hospital Portal
        </h1>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.92rem' }}>
          Access real-time blood inventory search and submit emergency requests.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="feature-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
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
              fontSize: '0.88rem',
              textAlign: 'center',
              border: '1px solid #fecaca',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label
            htmlFor="hospital-email"
            style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-700)' }}
          >
            Official Email Address
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Mail
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--neutral-400)',
                pointerEvents: 'none'
              }}
            />
            <input
              id="hospital-email"
              type="email"
              placeholder="hospital@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-300)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label
            htmlFor="hospital-password"
            style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-700)' }}
          >
            Password
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Lock
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--neutral-400)',
                pointerEvents: 'none'
              }}
            />
            <input
              id="hospital-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem 2.6rem 0.75rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-300)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--neutral-400)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          id="btn-hospital-login"
          style={{
            width: '100%',
            padding: '0.85rem',
            marginTop: '0.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.75 : 1
          }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In to Hospital Portal'}
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: '0.92rem',
            color: 'var(--neutral-600)',
            marginTop: '0.5rem'
          }}
        >
          Don't have a registered hospital account?{' '}
          <Link
            to="/hospital/register"
            id="link-hospital-register"
            style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'underline' }}
          >
            Register Hospital
          </Link>
        </div>
      </form>
    </div>
  );
};

export default HospitalLogin;
