import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
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
        style={{ maxWidth: '400px', margin: '0 auto', marginTop: '2rem', alignItems: 'stretch', gap: '1rem' }}
      >
        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>
        )}

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="you@example.com"
          />
        </label>

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '0.5rem' }}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: '#dc2626', fontWeight: 600 }}>Register</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
