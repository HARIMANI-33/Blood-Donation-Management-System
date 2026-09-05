import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X as XIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import type { BloodGroup } from '../types/auth';
import { launchGoogleSignIn } from '../utils/googleAuth';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
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

const Register = () => {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Field states - strictly initialized empty
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>('');

  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & loading states
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  // Field refs for auto-focus and auto-scroll on validation
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const bloodGroupRef = useRef<HTMLSelectElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Reset any browser autofill values on initial mount
  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhone('');
    setCity('');
    setAge('');
    setBloodGroup('');

    const clearTimer = setTimeout(() => {
      if (emailRef.current && emailRef.current.value !== '') {
        emailRef.current.value = '';
        setEmail('');
      }
      if (passwordRef.current && passwordRef.current.value !== '') {
        passwordRef.current.value = '';
        setPassword('');
      }
      if (confirmPasswordRef.current && confirmPasswordRef.current.value !== '') {
        confirmPasswordRef.current.value = '';
        setConfirmPassword('');
      }
      if (ageRef.current && ageRef.current.value !== '') {
        ageRef.current.value = '';
        setAge('');
      }
    }, 100);

    return () => clearTimeout(clearTimer);
  }, []);

  // Live password validation rules
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/]/.test(password);

  // Live age validation rules (Must be 18 or above)
  const enteredAge = age.trim() ? parseInt(age.trim(), 10) : null;
  const isAgeEntered = age.trim().length > 0;
  const isUnderage = isAgeEntered && (enteredAge === null || isNaN(enteredAge) || enteredAge < 18);
  const isEligibleAge = isAgeEntered && enteredAge !== null && !isNaN(enteredAge) && enteredAge >= 18;

  // Password & confirm password matching states for dynamic red box
  const isConfirmEntered = confirmPassword.length > 0;
  const isPasswordMismatch = isConfirmEntered && password !== confirmPassword;
  const isPasswordMatch = isConfirmEntered && password === confirmPassword;

  // Special character missing check for live blinking animation
  const isPasswordEntered = password.length > 0;
  const isSpecialCharMissing = isPasswordEntered && !hasSpecialChar;

  const focusAndScroll = (ref: React.RefObject<HTMLElement | null>) => {
    if (ref.current) {
      ref.current.focus();
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate Full Name (Compulsory)
    if (!name.trim()) {
      setError('Please enter your full name.');
      focusAndScroll(nameRef);
      return;
    }
    if (name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      focusAndScroll(nameRef);
      return;
    }

    // 2. Validate Email (Compulsory, format example@gmail.com)
    if (!email.trim()) {
      setError('Please enter your email address.');
      focusAndScroll(emailRef);
      return;
    }
    if (!GMAIL_REGEX.test(email.trim())) {
      setError('The entered email must be in the form example@gmail.com (e.g. name@gmail.com).');
      focusAndScroll(emailRef);
      return;
    }

    // 3. Validate Phone Number (Compulsory)
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      focusAndScroll(phoneRef);
      return;
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      focusAndScroll(phoneRef);
      return;
    }

    // 4. Validate City (Compulsory)
    if (!city.trim()) {
      setError('Please enter your city.');
      focusAndScroll(cityRef);
      return;
    }
    if (city.trim().length < 2) {
      setError('City must be at least 2 characters.');
      focusAndScroll(cityRef);
      return;
    }

    // 5. Validate Age (Compulsory, must be 18 or above)
    if (!age.trim()) {
      setError('Please enter your age. Donors must be 18 or older to register.');
      focusAndScroll(ageRef);
      return;
    }
    const parsedAge = parseInt(age.trim(), 10);
    if (isNaN(parsedAge) || parsedAge < 1) {
      setError('Please enter a valid age.');
      focusAndScroll(ageRef);
      return;
    }
    if (parsedAge < 18) {
      setError('Registration is restricted to donors aged 18 or above. You must be at least 18 years old to register.');
      focusAndScroll(ageRef);
      return;
    }
    if (parsedAge > 100) {
      setError('Please enter a valid age under 100.');
      focusAndScroll(ageRef);
      return;
    }

    // 6. Validate Blood Group (Compulsory)
    if (!bloodGroup) {
      setError('Please select your blood group.');
      focusAndScroll(bloodGroupRef);
      return;
    }

    // 7. Validate Password (Compulsory)
    if (!password) {
      setError('Please enter a password.');
      focusAndScroll(passwordRef);
      return;
    }
    if (!hasMinLength) {
      setError('Password must have at least 6 characters.');
      focusAndScroll(passwordRef);
      return;
    }
    if (!hasUpperCase) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      focusAndScroll(passwordRef);
      return;
    }
    if (!hasLowerCase) {
      setError('Password must contain at least one lowercase letter (a-z).');
      focusAndScroll(passwordRef);
      return;
    }
    if (!hasNumber) {
      setError('Password must contain at least one number (0-9).');
      focusAndScroll(passwordRef);
      return;
    }
    if (!hasSpecialChar) {
      setError('Password must contain at least one special character (e.g. @, #, $, !).');
      focusAndScroll(passwordRef);
      return;
    }

    // 8. Validate Confirm Password (Compulsory & must match)
    if (!confirmPassword) {
      setError('Please confirm your password.');
      focusAndScroll(confirmPasswordRef);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both password fields match.');
      focusAndScroll(confirmPasswordRef);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        city: city.trim(),
        bloodGroup: bloodGroup,
        age: parsedAge
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
        style={{ maxWidth: '460px', margin: '0 auto', marginTop: '2rem', alignItems: 'stretch', gap: '1rem' }}
        noValidate
        autoComplete="off"
      >
        {/* Hidden dummy fields to trap browser password manager autofill */}
        <input type="text" name="fake_username_trap" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
        <input type="password" name="fake_password_trap" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>
        )}

        {/* Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || isSubmitting}
          className="btn-google"
          id="btn-google-register"
        >
          <GoogleIcon />
          <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
        </button>

        <div className="auth-divider">
          <span>or with email</span>
        </div>

        {/* Full Name */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Full Name <span style={{ color: '#dc2626' }}>*</span>
          <input
            ref={nameRef}
            type="text"
            name="donor_full_name"
            autoComplete="off"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="Jane Doe"
          />
        </label>

        {/* Email */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Email <span style={{ color: '#dc2626' }}>*</span>
          <input
            ref={emailRef}
            type="email"
            name="donor_new_email"
            autoComplete="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="example@gmail.com"
          />
        </label>

        {/* Phone Number - Compulsory */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Phone Number <span style={{ color: '#dc2626' }}>*</span>
          <input
            ref={phoneRef}
            type="tel"
            name="donor_phone"
            autoComplete="off"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="form-input"
            placeholder="+91 90000 00000"
          />
        </label>

        {/* City - Compulsory */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          City <span style={{ color: '#dc2626' }}>*</span>
          <input
            ref={cityRef}
            type="text"
            name="donor_city"
            autoComplete="off"
            required
            minLength={2}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="form-input"
            placeholder="e.g. Chennai, Bengaluru, Coimbatore"
          />
        </label>

        {/* Age - Compulsory (18 or above) */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Age (years) <span style={{ color: '#dc2626' }}>*</span>
          <input
            ref={ageRef}
            type="number"
            name="donor_age"
            min={1}
            max={120}
            autoComplete="off"
            required
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={`form-input ${isUnderage ? 'input-box-error' : isEligibleAge ? 'input-box-success' : ''}`}
            placeholder="e.g. 24 (must be 18 or above)"
          />
          {isUnderage && (
            <div className="password-match-status mismatch" style={{ marginTop: '0.35rem' }}>
              <XIcon size={14} />
              <span>Must be 18 or older to register as a donor</span>
            </div>
          )}
          {isEligibleAge && (
            <div className="password-match-status match" style={{ marginTop: '0.35rem' }}>
              <Check size={14} />
              <span>Age eligible for donation (18+)</span>
            </div>
          )}
        </label>

        {/* Blood Group - Compulsory */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Blood Group <span style={{ color: '#dc2626' }}>*</span>
          <select
            ref={bloodGroupRef}
            value={bloodGroup}
            required
            onChange={(e) => setBloodGroup(e.target.value as BloodGroup | '')}
            className="form-input"
          >
            <option value="">Select blood group (required)</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>

        {/* Password */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Password <span style={{ color: '#dc2626' }}>*</span>
          <div className="password-input-wrapper">
            <input
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              name="donor_new_password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`form-input password-input-field ${isPasswordMismatch ? 'input-box-error' : ''}`}
              placeholder="At least 6 characters"
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
        </label>

        {/* Live Password Requirements Checklist with blinking special character */}
        <div className="password-requirements-list">
          <span style={{ fontWeight: 600, color: '#334155', marginBottom: '0.15rem' }}>
            Password requirements:
          </span>
          <div className={`password-requirement-item ${hasMinLength ? 'valid' : ''}`}>
            {hasMinLength ? <Check size={14} /> : <XIcon size={14} />}
            <span>At least 6 characters</span>
          </div>
          <div className={`password-requirement-item ${hasUpperCase ? 'valid' : ''}`}>
            {hasUpperCase ? <Check size={14} /> : <XIcon size={14} />}
            <span>At least one uppercase letter (A-Z)</span>
          </div>
          <div className={`password-requirement-item ${hasLowerCase ? 'valid' : ''}`}>
            {hasLowerCase ? <Check size={14} /> : <XIcon size={14} />}
            <span>At least one lowercase letter (a-z)</span>
          </div>
          <div className={`password-requirement-item ${hasNumber ? 'valid' : ''}`}>
            {hasNumber ? <Check size={14} /> : <XIcon size={14} />}
            <span>At least one number (0-9)</span>
          </div>
          <div
            className={`password-requirement-item ${hasSpecialChar ? 'valid' : isSpecialCharMissing ? 'blink-warning' : ''}`}
            title={isSpecialCharMissing ? 'Special character missing!' : ''}
          >
            {hasSpecialChar ? <Check size={14} /> : <XIcon size={14} />}
            <span>At least one special character (@, #, $, !, etc.)</span>
          </div>
        </div>

        {/* Confirm Password with Red Box on mismatch */}
        <label style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
          Confirm Password <span style={{ color: '#dc2626' }}>*</span>
          <div className="password-input-wrapper">
            <input
              ref={confirmPasswordRef}
              type={showConfirmPassword ? 'text' : 'password'}
              name="donor_new_confirm_password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`form-input password-input-field ${isPasswordMismatch ? 'input-box-error' : ''} ${isPasswordMatch ? 'input-box-success' : ''}`}
              placeholder="Re-enter password"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Visual indicator for password matching */}
          {isPasswordMismatch && (
            <div className="password-match-status mismatch">
              <XIcon size={14} />
              <span>Passwords do not match</span>
            </div>
          )}
          {isPasswordMatch && (
            <div className="password-match-status match">
              <Check size={14} />
              <span>Passwords match</span>
            </div>
          )}
        </label>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{ marginTop: '0.5rem' }}
        >
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
