import { useState, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Eye,
  EyeOff,
  Check,
  X as XIcon,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { registerBloodBank } from '../services/bloodBank.service';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import type { User } from '../types/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const QUICK_CITIES = ['Chennai', 'Bengaluru', 'Coimbatore', 'Madurai'];

interface FieldErrors {
  organizationName?: string;
  email?: string;
  phone?: string;
  city?: string;
  fullAddress?: string;
  openingHours?: string;
  password?: string;
  confirmPassword?: string;
}

const BloodBankRegister = () => {
  const navigate = useNavigate();
  const { loginWithSession } = useAuth();

  // Form Fields
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('08:00 AM - 08:00 PM');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Field validation & animation states
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pulseField, setPulseField] = useState<string | null>(null);

  // Element Refs for Ordered Focus & Scroll
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

  // Clear single field error upon user interaction
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
    // 1. ORDERED VALIDATION (Top-to-Bottom)
    // 1. Name -> 2. Email -> 3. Phone -> 4. City ->
    // 5. Address -> 6. Hours -> 7. Password -> 8. Confirm Password
    // ==========================================
    const errors: FieldErrors = {};
    let firstInvalidField: { name: string; ref: React.RefObject<HTMLInputElement | null> } | null = null;

    // 1. Blood Bank Name
    if (!organizationName.trim()) {
      errors.organizationName = 'Blood Bank Name is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'organizationName', ref: nameRef };
    } else if (organizationName.trim().length < 2) {
      errors.organizationName = 'Blood Bank Name must be at least 2 characters.';
      if (!firstInvalidField) firstInvalidField = { name: 'organizationName', ref: nameRef };
    }

    // 2. Official Email
    if (!email.trim()) {
      errors.email = 'Official Email is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'email', ref: emailRef };
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. contact@bloodbank.org).';
      if (!firstInvalidField) firstInvalidField = { name: 'email', ref: emailRef };
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
      errors.fullAddress = 'Complete facility address must be at least 5 characters.';
      if (!firstInvalidField) firstInvalidField = { name: 'fullAddress', ref: addressRef };
    }

    // 6. Opening Hours
    if (!openingHours.trim()) {
      errors.openingHours = 'Opening Hours is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'openingHours', ref: hoursRef };
    } else if (openingHours.trim().length < 3) {
      errors.openingHours = 'Opening Hours must be at least 3 characters.';
      if (!firstInvalidField) firstInvalidField = { name: 'openingHours', ref: hoursRef };
    }

    // 7. Password
    if (!password) {
      errors.password = 'Password is required.';
      if (!firstInvalidField) firstInvalidField = { name: 'password', ref: passwordRef };
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
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

    // If validation failed, focus first invalid field, trigger pulse & scroll into view
    if (firstInvalidField) {
      setFieldErrors(errors);
      setPulseField(firstInvalidField.name);

      firstInvalidField.ref.current?.focus();
      firstInvalidField.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Automatically reset pulse effect after 2 seconds
      setTimeout(() => {
        setPulseField(null);
      }, 2000);

      return;
    }

    // Validation passed - proceed with API request
    setFieldErrors({});
    setPulseField(null);

    try {
      setIsSubmitting(true);
      const res = await registerBloodBank({
        organizationName: organizationName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        city: city.trim(),
        fullAddress: fullAddress.trim(),
        openingHours: openingHours.trim() || '08:00 AM - 08:00 PM'
      });

      if (res.data?.token) {
        const userObj: User = {
          id: res.data.bloodBank.id,
          name: res.data.bloodBank.name,
          email: res.data.bloodBank.email,
          phone: res.data.bloodBank.phone,
          bloodGroup: null,
          city: res.data.bloodBank.city,
          role: 'blood_bank' as const,
          createdAt: res.data.bloodBank.createdAt
        };
        loginWithSession(userObj, res.data.token);
        navigate('/blood-bank/dashboard');
      }
    } catch (err: unknown) {
      console.error('[BloodBankRegister] Error:', err);
      let errorMsg = 'Blood bank registration failed. Please try again.';
      if (err instanceof ApiError) {
        errorMsg = err.message;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      setApiError(`Registration failed: ${errorMsg}`);
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
            <Building2 size={14} />
            <span>Join the LifeFlow Inventory Network</span>
          </div>
          <h1 className="register-page-title">Inventory Management Registration</h1>
          <p className="register-page-subtitle">
            Register your facility to manage real-time blood inventory, stock levels, and donor appointments.
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
            <span>Already registered for inventory management?</span>
            <Link to="/blood-bank/login" className="register-login-link" id="link-bloodbank-top-login">
              <LogIn size={15} />
              <span>Login to Inventory Portal</span>
            </Link>
          </div>

          {/* Global API Error Alert */}
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
              {/* 1. Blood Bank Name */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="input-org-name">
                  Blood Bank Name <span className="field-required">*</span>
                </label>
                <input
                  ref={nameRef}
                  id="input-org-name"
                  type="text"
                  placeholder="e.g. Apollo Blood Bank & Research Centre"
                  value={organizationName}
                  onChange={(e) => handleFieldChange('organizationName', setOrganizationName, e.target.value)}
                  className={`register-input ${fieldErrors.organizationName ? 'input-box-error' : ''} ${pulseField === 'organizationName' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.organizationName && (
                  <span className="register-field-error">
                    {fieldErrors.organizationName}
                  </span>
                )}
              </div>

              {/* 2. Official Email */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="input-org-email">
                  Official Email <span className="field-required">*</span>
                </label>
                <input
                  ref={emailRef}
                  id="input-org-email"
                  type="email"
                  placeholder="contact@bloodbank.org"
                  value={email}
                  onChange={(e) => handleFieldChange('email', setEmail, e.target.value)}
                  className={`register-input ${fieldErrors.email ? 'input-box-error' : ''} ${pulseField === 'email' ? 'input-invalid-pulse' : ''}`}
                />
                {fieldErrors.email && (
                  <span className="register-field-error">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* 3. Phone Number */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="input-org-phone">
                  Phone Number <span className="field-required">*</span>
                </label>
                <input
                  ref={phoneRef}
                  id="input-org-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
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

              {/* 4. Password */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="input-org-password">
                  Password <span className="field-required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    ref={passwordRef}
                    id="input-org-password"
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
              {/* 1. City / Location with Quick Suggestions */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="input-org-city">
                  City / Location <span className="field-required">*</span>
                </label>
                <input
                  ref={cityRef}
                  id="input-org-city"
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
                <label className="register-field-label" htmlFor="input-org-address">
                  Full Address <span className="field-required">*</span>
                </label>
                <input
                  ref={addressRef}
                  id="input-org-address"
                  type="text"
                  placeholder="Street address, landmark, area"
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
                <label className="register-field-label" htmlFor="input-org-hours">
                  Opening / Operating Hours <span className="field-required">*</span>
                </label>
                <input
                  ref={hoursRef}
                  id="input-org-hours"
                  type="text"
                  placeholder="e.g. 08:00 AM - 08:00 PM or 24/7"
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

              {/* 4. Confirm Password */}
              <div className="register-field-group">
                <label className="register-field-label" htmlFor="input-org-confirm-password">
                  Confirm Password <span className="field-required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    ref={confirmPasswordRef}
                    id="input-org-confirm-password"
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
              id="btn-bloodbank-register"
            >
              {isSubmitting ? (
                <span>Registering Facility...</span>
              ) : (
                <>
                  <Building2 size={18} />
                  <span>Complete Inventory Registration</span>
                </>
              )}
            </button>
            <p className="register-legal-notice">
              LifeFlow verifies all facilities to maintain certified real-time inventory standards.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BloodBankRegister;
