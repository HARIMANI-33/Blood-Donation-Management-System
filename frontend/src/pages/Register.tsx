import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X as XIcon, UserPlus, LogIn, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import type { BloodGroup } from '../types/auth';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

const Register = () => {
  const { register } = useAuth();
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
    <div className="register-page-wrapper">
      <div className="register-container">
      <div className="register-page-header">
        <div className="register-header-badge">
          <Heart size={14} />
          <span>Join the LifeFlow Lifesaver Network</span>
        </div>
        <h1 className="register-page-title">Donor Registration</h1>
        <p className="register-page-subtitle">
          Create your voluntary donor profile to connect with regional blood centers and save lives.
        </p>
      </div>

      {/* Wide Two-Column Registration Card */}
      <form
        onSubmit={handleSubmit}
        className="register-card-wide"
        noValidate
        autoComplete="off"
      >
        {/* Hidden dummy fields to trap browser password manager autofill */}
        <input type="text" name="fake_username_trap" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
        <input type="password" name="fake_password_trap" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

        {/* Top Secondary Login Banner */}
        <div className="register-top-login-bar">
          <span>Already have an account?</span>
          <Link to="/login" className="register-login-link" id="register-top-login-btn">
            <LogIn size={15} />
            <span>Login</span>
          </Link>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="register-error-banner" role="alert">
            <XIcon size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Form Grid */}
        <div className="register-two-column-grid">
          {/* ================= LEFT COLUMN ================= */}
          <div className="register-column">
            {/* 1. Full Name */}
            <label className="register-field-label">
              <span>Full Name <span className="field-required">*</span></span>
              <input
                ref={nameRef}
                type="text"
                name="donor_full_name"
                autoComplete="off"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input register-input"
                placeholder="e.g. Jane Doe"
              />
            </label>

            {/* 2. Email Address */}
            <label className="register-field-label">
              <span>Email Address <span className="field-required">*</span></span>
              <input
                ref={emailRef}
                type="email"
                name="donor_new_email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input register-input"
                placeholder="example@gmail.com"
              />
            </label>

            {/* 3. Phone Number */}
            <label className="register-field-label">
              <span>Phone Number <span className="field-required">*</span></span>
              <input
                ref={phoneRef}
                type="tel"
                name="donor_phone"
                autoComplete="off"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input register-input"
                placeholder="+91 90000 00000"
              />
            </label>

            {/* 4. Password */}
            <label className="register-field-label">
              <span>Password <span className="field-required">*</span></span>
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
                  className={`form-input register-input password-input-field ${isPasswordMismatch ? 'input-box-error' : ''}`}
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

            {/* Live Password Requirements Checklist */}
            <div className="password-requirements-list" style={{ marginTop: '0.25rem' }}>
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
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="register-column">
            {/* 1. City */}
            <label className="register-field-label">
              <span>City / Region <span className="field-required">*</span></span>
              <input
                ref={cityRef}
                type="text"
                name="donor_city"
                autoComplete="off"
                required
                minLength={2}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="form-input register-input"
                placeholder="e.g. Chennai, Bengaluru, Coimbatore"
              />
            </label>

            {/* 2. Age */}
            <label className="register-field-label">
              <span>Age (years) <span className="field-required">*</span></span>
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
                className={`form-input register-input ${isUnderage ? 'input-box-error' : isEligibleAge ? 'input-box-success' : ''}`}
                placeholder="e.g. 24 (must be 18+)"
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

            {/* 3. Blood Group */}
            <label className="register-field-label">
              <span>Blood Group <span className="field-required">*</span></span>
              <select
                ref={bloodGroupRef}
                value={bloodGroup}
                required
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup | '')}
                className="form-input register-input"
                style={{ cursor: 'pointer', backgroundColor: 'white' }}
              >
                <option value="">Select blood group (required)</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>

            {/* 4. Confirm Password */}
            <label className="register-field-label">
              <span>Confirm Password <span className="field-required">*</span></span>
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
                  className={`form-input register-input password-input-field ${isPasswordMismatch ? 'input-box-error' : ''} ${isPasswordMatch ? 'input-box-success' : ''}`}
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
          </div>
        </div>

        {/* Form Action Row: Centered Wide Register Button */}
        <div className="register-actions-row">
          <button
            type="submit"
            className="btn-primary btn-register-submit"
            disabled={isSubmitting}
            id="btn-donor-register-submit"
          >
            <UserPlus size={18} />
            <span>{isSubmitting ? 'Creating account...' : 'Register'}</span>
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default Register;
