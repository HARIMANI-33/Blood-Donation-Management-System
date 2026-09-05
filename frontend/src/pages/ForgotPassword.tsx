import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!GMAIL_REGEX.test(email.trim())) {
      setError('The entered email must be in the form example@gmail.com (e.g. name@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    // Frontend mock simulation for reset password flow
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="forgot-password-container">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Reset Password</h1>
        <p>Enter the email address associated with your LifeFlow account.</p>
      </div>

      <div
        className="feature-card"
        style={{ maxWidth: '420px', margin: '2rem auto 0', alignItems: 'stretch', gap: '1.25rem' }}
      >
        {isSubmitted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ color: '#16a34a', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle2 size={48} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Reset Link Sent
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              If an account with <strong>{email}</strong> exists, password reset instructions have been sent.
              Please check your inbox.
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
                {error}
              </p>
            )}

            <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
              Email Address
              <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="example@gmail.com"
                  autoFocus
                />
              </div>
            </label>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ marginTop: '0.5rem' }}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <Link
                to="/login"
                style={{
                  color: '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <ArrowLeft size={15} />
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
