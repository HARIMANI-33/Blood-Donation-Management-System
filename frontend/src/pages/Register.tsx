import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import type { BloodGroup } from '../types/auth';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        phone: phone || undefined,
        bloodGroup: bloodGroup || undefined
      });
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
        <h1 className="page-title">Register</h1>
        <p>Create a new account to become a donor or partner.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="feature-card"
        style={{ maxWidth: '440px', margin: '0 auto', marginTop: '2rem', alignItems: 'stretch', gap: '1rem' }}
      >
        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>
        )}

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Full Name
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="Jane Doe"
          />
        </label>

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
          Phone (optional)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="form-input"
            placeholder="+91 90000 00000"
          />
        </label>

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Blood Group (optional)
          <select
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value as BloodGroup | '')}
            className="form-input"
          >
            <option value="">Select blood group</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
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
            placeholder="At least 6 characters"
          />
        </label>

        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Confirm Password
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
            placeholder="Re-enter password"
          />
        </label>

        <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '0.5rem' }}>
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: '#dc2626', fontWeight: 600 }}>Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
