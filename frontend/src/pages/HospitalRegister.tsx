import { useState, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Hospital,
  Eye,
  EyeOff,
  Check,
  X as XIcon,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { registerHospital } from '../services/hospital.service';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const QUICK_CITIES = ['Chennai', 'Bengaluru', 'Coimbatore', 'Madurai'];

interface FieldErrors {
  hospitalName?: string;
  officialEmail?: string;
  phone?: string;
  city?: string;
  fullAddress?: string;
  password?: string;
  confirmPassword?: string;
  openingHours?: string;
}

const HospitalRegister = () => {
  const navigate = useNavigate();
  const { loginWithSession } = useAuth();

  // Form Fields
  const [hospitalName, setHospitalName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [openingHours, setOpeningHours] = useState('24/7 Available');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [hospitalType, setHospitalType] = useState('General Hospital');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Field errors & pulse states
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pulseField, setPulseField] = useState<string | null>(null);

  // Element Refs for Auto-Focus and Scroll
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Live Password Validation Checks
  const hasMinLength = password.length >= 6;
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const isConfirmEntered = confirmPassword.length > 0;
  const isPasswordMismatch = isConfirmEntered && password !== confirmPassword;
  const isPasswordMatch = isConfirmEntered && password === confirmPassword;

  const handleFieldChange = (
    field: keyof FieldErrors,
    setter: (val: string) => void,
    val: string
  ) => {
    setter(val);
    setApiError(null);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (pulseField === field) {
      setPulseField(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);

    // ==========================================
    // Ordered Validation (Top to Bottom)
    // 1. Hospital Name -> 2. Email -> 3. Phone ->
    // 4. City -> 5. Address -> 6. Hours -> 7. Password -> 8. Confirm
    // ==========================================
    const errors: FieldErrors = {};
    let firstInvalidField: { name: string; ref: React.RefObject<HTMLInputElement | null> } | null = null;

    // 1. Hospital Name
    if (!hospitalName.trim()) {
      errors.hospitalName = 'Hospital Name is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'hospitalName', ref: nameRef };
    } else if (hospitalName.trim().length < 2) {
      errors.hospitalName = 'Hospital Name must be at least 2 characters.';
      if (!firstInvalidField) firstInvalidField = { name: 'hospitalName', ref: nameRef };
    }

    // 2. Official Email
    if (!officialEmail.trim()) {
      errors.officialEmail = 'Official Email is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'officialEmail', ref: emailRef };
    } else if (!EMAIL_REGEX.test(officialEmail.trim())) {
      errors.officialEmail = 'Please enter a valid email address (e.g. contact@cityhospital.org).';
      if (!firstInvalidField) firstInvalidField = { name: 'officialEmail', ref: emailRef };
    }

    // 3. Phone Number
    if (!phone.trim()) {
      errors.phone = 'Phone Number is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'phone', ref: phoneRef };
    } else if (phone.trim().replace(/\D/g, '').length < 7) {
      errors.phone = 'Please enter a valid phone number (at least 7 digits).';
      if (!firstInvalidField) firstInvalidField = { name: 'phone', ref: phoneRef };
    }

    // 4. City
    if (!city.trim()) {
      errors.city = 'City is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'city', ref: cityRef };
    } else if (city.trim().length < 2) {
      errors.city = 'City must be at least 2 characters.';
      if (!firstInvalidField) firstInvalidField = { name: 'city', ref: cityRef };
    }

    // 5. Full Address
    if (!fullAddress.trim()) {
      errors.fullAddress = 'Full Address is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'fullAddress', ref: addressRef };
    } else if (fullAddress.trim().length < 5) {
      errors.fullAddress = 'Complete hospital address must be at least 5 characters.';
      if (!firstInvalidField) firstInvalidField = { name: 'fullAddress', ref: addressRef };
    }

    // 6. Opening Hours
    if (!openingHours.trim()) {
      errors.openingHours = 'Opening Hours is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'openingHours', ref: hoursRef };
    }

    // 7. Password
    if (!password) {
      errors.password = 'Password is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'password', ref: passwordRef };
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
      if (!firstInvalidField) firstInvalidField = { name: 'password', ref: passwordRef };
    } else if (!SPECIAL_CHAR_REGEX.test(password)) {
      errors.password = 'Password must contain at least one special character (!@#$%^&* etc.).';
      if (!firstInvalidField) firstInvalidField = { name: 'password', ref: passwordRef };
    }

    // 8. Confirm Password
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
      if (!firstInvalidField) firstInvalidField = { name: 'confirmPassword', ref: confirmPasswordRef };
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
      if (!firstInvalidField) firstInvalidField = { name: 'confirmPassword', ref: confirmPasswordRef };
    }

    // If validation fails: focus, pulse & smooth scroll
    if (firstInvalidField) {
      setFieldErrors(errors);
      setPulseField(firstInvalidField.name);

      firstInvalidField.ref.current?.focus();
      firstInvalidField.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        setPulseField(null);
      }, 2000);

      return;
    }

    setFieldErrors({});
    setPulseField(null);

    try {
      setIsSubmitting(true);
      const res = await registerHospital({
        hospitalName: hospitalName.trim(),
        officialEmail: officialEmail.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        city: city.trim(),
        fullAddress: fullAddress.trim(),
        openingHours: openingHours.trim() || '24/7 Available',
        emergencyContact: emergencyContact.trim() || undefined,
        hospitalType: hospitalType.trim() || 'General Hospital'
      });

      if (res.data?.token && res.data?.user) {
        loginWithSession(res.data.user, res.data.token);
        navigate('/hospital/dashboard');
      } else {
        setApiError('Registration succeeded but session could not be established. Please login.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError('Registration failed. Please verify your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container">
        {/* Page Header */}
        <div className="register-page-header">
          <div className="register-header-badge">
            <Hospital size={14} />
            <span>Join the LifeFlow Blood Search Network</span>
          </div>
          <h1 className="register-page-title">Search Blood Registration</h1>
          <p className="register-page-subtitle">
            Register your healthcare facility on LifeFlow for emergency blood discovery, search, and priority allocation.
          </p>
        </div>

        {/* Wide Two-Column Registration Card */}
        <form
          onSubmit={handleSubmit}
          className="register-card-wide"
          noValidate
          autoComplete="off"
        >
          {/* Top Secondary Login Banner */}
          <div className="register-top-login-bar">
            <span>Already registered for blood search?</span>
            <Link to="/hospital/login" className="register-login-link" id="link-hospital-top-login">
              <LogIn size={15} />
              <span>Login to Blood Search Portal</span>
            </Link>
          </div>

          {/* Global Error Banner */}
          {apiError && (
            <div className="register-error-banner" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Two-Column Form Grid */}
          <div className="register-two-column-grid">
            {/* ================= LEFT COLUMN ================= */}
            <div className="register-column">
              {/* 1. Hospital Name */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-name">
                  Hospital Name <span className="field-required">*</span>
                </label>
                <input
                  ref={nameRef}
                  id="reg-hosp-name"
                  type="text"
                  placeholder="e.g. Apollo Multi-Specialty Hospital"
                  value={hospitalName}
                  onChange={(e) => handleFieldChange('hospitalName', setHospitalName, e.target.value)}
                  className={`register-input ${fieldErrors.hospitalName ? 'input-box-error' : ''} ${pulseField === 'hospitalName' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.hospitalName && (
                  <span className="register-field-error">
                    {fieldErrors.hospitalName}
                  </span>
                )}
              </div>

              {/* 2. Official Email */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-email">
                  Official Email Address <span className="field-required">*</span>
                </label>
                <input
                  ref={emailRef}
                  id="reg-hosp-email"
                  type="email"
                  placeholder="example@gmail.com"
                  value={officialEmail}
                  onChange={(e) => handleFieldChange('officialEmail', setOfficialEmail, e.target.value)}
                  className={`register-input ${fieldErrors.officialEmail ? 'input-box-error' : ''} ${pulseField === 'officialEmail' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.officialEmail && (
                  <span className="register-field-error">
                    {fieldErrors.officialEmail}
                  </span>
                )}
              </div>

              {/* 3. Phone Number */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-phone">
                  Phone Number <span className="field-required">*</span>
                </label>
                <input
                  ref={phoneRef}
                  id="reg-hosp-phone"
                  type="tel"
                  placeholder="+91 44 2829 0000"
                  value={phone}
                  onChange={(e) => handleFieldChange('phone', setPhone, e.target.value)}
                  className={`register-input ${fieldErrors.phone ? 'input-box-error' : ''} ${pulseField === 'phone' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.phone && (
                  <span className="register-field-error">
                    {fieldErrors.phone}
                  </span>
                )}
              </div>

              {/* 4. Hospital Type */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-type">
                  Hospital Type
                </label>
                <select
                  id="reg-hosp-type"
                  value={hospitalType}
                  onChange={(e) => setHospitalType(e.target.value)}
                  className="register-input register-select"
                >
                  <option value="General Hospital">General Hospital</option>
                  <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
                  <option value="Super Specialty Hospital">Super Specialty Hospital</option>
                  <option value="Government Medical College">Government Medical College</option>
                  <option value="Research & Trauma Center">Research & Trauma Center</option>
                </select>
              </div>

              {/* 5. Password */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-password">
                  Password <span className="field-required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    ref={passwordRef}
                    id="reg-hosp-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => handleFieldChange('password', setPassword, e.target.value)}
                    className={`register-input password-input-field ${fieldErrors.password ? 'input-box-error' : ''} ${pulseField === 'password' ? 'input-invalid-pulse' : ''}`}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="register-field-error">
                    {fieldErrors.password}
                  </span>
                )}

                {/* Live Password Requirements Checklist */}
                <div className="password-requirements-list" style={{ marginTop: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155', marginBottom: '0.15rem', fontSize: '0.78rem' }}>
                    Password requirements:
                  </span>
                  <div className={`password-requirement-item ${hasMinLength ? 'valid' : ''}`}>
                    {hasMinLength ? <Check size={13} /> : <XIcon size={13} />}
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`password-requirement-item ${hasSpecialChar ? 'valid' : ''}`}>
                    {hasSpecialChar ? <Check size={13} /> : <XIcon size={13} />}
                    <span>Special character (!@#$%^&*)</span>
                  </div>
                  <div className={`password-requirement-item ${hasUpperCase && hasLowerCase ? 'valid' : ''}`}>
                    {hasUpperCase && hasLowerCase ? <Check size={13} /> : <XIcon size={13} />}
                    <span>Upper & lowercase letters</span>
                  </div>
                  <div className={`password-requirement-item ${hasNumber ? 'valid' : ''}`}>
                    {hasNumber ? <Check size={13} /> : <XIcon size={13} />}
                    <span>At least one number (0-9)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="register-column">
              {/* 1. City with Quick Suggestions */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-city">
                  City / Location <span className="field-required">*</span>
                </label>
                <input
                  ref={cityRef}
                  id="reg-hosp-city"
                  type="text"
                  placeholder="e.g. Chennai"
                  value={city}
                  onChange={(e) => handleFieldChange('city', setCity, e.target.value)}
                  className={`register-input ${fieldErrors.city ? 'input-box-error' : ''} ${pulseField === 'city' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.city && (
                  <span className="register-field-error">
                    {fieldErrors.city}
                  </span>
                )}
                {/* Quick City Pills */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>Quick:</span>
                  {QUICK_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleFieldChange('city', setCity, c)}
                      style={{
                        background: city === c ? '#fee2e2' : '#f1f5f9',
                        color: city === c ? '#dc2626' : '#475569',
                        border: `1px solid ${city === c ? '#fca5a5' : '#cbd5e1'}`,
                        borderRadius: '9999px',
                        padding: '0.15rem 0.6rem',
                        fontSize: '0.74rem',
                        fontWeight: city === c ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Full Facility Address */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-address">
                  Full Address <span className="field-required">*</span>
                </label>
                <input
                  ref={addressRef}
                  id="reg-hosp-address"
                  type="text"
                  placeholder="Street address, department, locality"
                  value={fullAddress}
                  onChange={(e) => handleFieldChange('fullAddress', setFullAddress, e.target.value)}
                  className={`register-input ${fieldErrors.fullAddress ? 'input-box-error' : ''} ${pulseField === 'fullAddress' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.fullAddress && (
                  <span className="register-field-error">
                    {fieldErrors.fullAddress}
                  </span>
                )}
              </div>

              {/* 3. Opening Hours */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-hours">
                  Opening / Service Hours <span className="field-required">*</span>
                </label>
                <input
                  ref={hoursRef}
                  id="reg-hosp-hours"
                  type="text"
                  placeholder="e.g. 24/7 Available or 08:00 AM - 10:00 PM"
                  value={openingHours}
                  onChange={(e) => handleFieldChange('openingHours', setOpeningHours, e.target.value)}
                  className={`register-input ${fieldErrors.openingHours ? 'input-box-error' : ''} ${pulseField === 'openingHours' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.openingHours && (
                  <span className="register-field-error">
                    {fieldErrors.openingHours}
                  </span>
                )}
              </div>

              {/* 4. Emergency Contact (Optional) */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-emergency">
                  Emergency Helpline <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  id="reg-hosp-emergency"
                  type="tel"
                  placeholder="+91 44 2829 1066 (24/7 Emergency Line)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="register-input"
                />
              </div>

              {/* 5. Confirm Password */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="reg-hosp-confirm-pass">
                  Confirm Password <span className="field-required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    ref={confirmPasswordRef}
                    id="reg-hosp-confirm-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => handleFieldChange('confirmPassword', setConfirmPassword, e.target.value)}
                    className={`register-input password-input-field ${fieldErrors.confirmPassword || isPasswordMismatch ? 'input-box-error' : ''} ${isPasswordMatch ? 'input-box-success' : ''} ${pulseField === 'confirmPassword' ? 'input-invalid-pulse' : ''}`}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span className="register-field-error">
                    {fieldErrors.confirmPassword}
                  </span>
                )}
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
              </div>
            </div>
          </div>

          {/* Centered Wide Action Button */}
          <div className="register-actions-row">
            <button
              type="submit"
              className="btn-primary btn-register-submit"
              disabled={isSubmitting}
              id="btn-hospital-register"
            >
              {isSubmitting ? (
                <span>Registering Hospital...</span>
              ) : (
                <>
                  <Hospital size={18} />
                  <span>Complete Blood Search Registration</span>
                </>
              )}
            </button>
            <p className="register-legal-notice">
              LifeFlow verifies all healthcare facilities for emergency priority allocation and compliance.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HospitalRegister;
