import { useState, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, MapPin, Clock, Phone, Mail, Lock, AlertCircle } from 'lucide-react';
import { registerBloodBank } from '../services/bloodBank.service';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import type { User } from '../types/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '1rem 1rem 2.5rem' }}>
      {/* Compact Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-600)',
            marginBottom: '0.4rem'
          }}
        >
          <Building2 size={24} />
        </div>
        <h1 className="page-title" style={{ fontSize: '1.7rem', margin: 0 }}>
          Blood Bank Registration
        </h1>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
          Register your certified facility to manage real-time inventory and donor appointments.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="feature-card"
        style={{
          padding: '1.75rem 2rem',
          margin: 0,
          backgroundColor: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-200)'
        }}
        noValidate
      >
        {/* Global API Error Alert */}
        {apiError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
              border: '1px solid #fecaca'
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* =========================================================
            LANDSCAPE TWO-COLUMN FORM LAYOUT (Desktop)
            Switches to 1 column on screens < 768px
            ========================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.1rem 1.75rem'
          }}
        >
          {/* COLUMN 1 - ROW 1: Blood Bank Name */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              Blood Bank Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Building2
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.organizationName ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={nameRef}
                type="text"
                value={organizationName}
                onChange={(e) => handleFieldChange('organizationName', setOrganizationName, e.target.value)}
                className={`form-input ${pulseField === 'organizationName' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  borderColor: fieldErrors.organizationName ? '#dc2626' : undefined
                }}
                placeholder="e.g. Apollo Blood Bank & Research Centre"
                id="input-org-name"
              />
            </div>
            {fieldErrors.organizationName && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.organizationName}
              </div>
            )}
          </div>

          {/* COLUMN 2 - ROW 1: Official Email */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              Official Email <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.email ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => handleFieldChange('email', setEmail, e.target.value)}
                className={`form-input ${pulseField === 'email' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  borderColor: fieldErrors.email ? '#dc2626' : undefined
                }}
                placeholder="contact@bloodbank.org"
                id="input-org-email"
              />
            </div>
            {fieldErrors.email && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.email}
              </div>
            )}
          </div>

          {/* COLUMN 1 - ROW 2: Phone Number */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              Phone Number <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Phone
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.phone ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                onChange={(e) => handleFieldChange('phone', setPhone, e.target.value)}
                className={`form-input ${pulseField === 'phone' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  borderColor: fieldErrors.phone ? '#dc2626' : undefined
                }}
                placeholder="+91 98765 43210"
                id="input-org-phone"
              />
            </div>
            {fieldErrors.phone && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.phone}
              </div>
            )}
          </div>

          {/* COLUMN 2 - ROW 2: City */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              City <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.city ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={cityRef}
                type="text"
                value={city}
                onChange={(e) => handleFieldChange('city', setCity, e.target.value)}
                className={`form-input ${pulseField === 'city' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  borderColor: fieldErrors.city ? '#dc2626' : undefined
                }}
                placeholder="e.g. Chennai"
                id="input-org-city"
              />
            </div>
            {/* Quick Pick Chips */}
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>Quick:</span>
              {QUICK_CITIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => handleFieldChange('city', setCity, c)}
                  style={{
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.72rem',
                    borderRadius: '12px',
                    border: city.toLowerCase() === c.toLowerCase() ? '1px solid var(--primary-600)' : '1px solid var(--neutral-300)',
                    background: city.toLowerCase() === c.toLowerCase() ? 'var(--primary-100)' : 'white',
                    color: city.toLowerCase() === c.toLowerCase() ? 'var(--primary-700)' : 'var(--neutral-700)',
                    cursor: 'pointer'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            {fieldErrors.city && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.city}
              </div>
            )}
          </div>

          {/* COLUMN 1 - ROW 3: Full Address */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              Full Address <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.fullAddress ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={addressRef}
                type="text"
                value={fullAddress}
                onChange={(e) => handleFieldChange('fullAddress', setFullAddress, e.target.value)}
                className={`form-input ${pulseField === 'fullAddress' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  borderColor: fieldErrors.fullAddress ? '#dc2626' : undefined
                }}
                placeholder="Street address, landmark, area"
                id="input-org-address"
              />
            </div>
            {fieldErrors.fullAddress && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.fullAddress}
              </div>
            )}
          </div>

          {/* COLUMN 2 - ROW 3: Opening Hours */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              Opening Hours <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Clock
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.openingHours ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={hoursRef}
                type="text"
                value={openingHours}
                onChange={(e) => handleFieldChange('openingHours', setOpeningHours, e.target.value)}
                className={`form-input ${pulseField === 'openingHours' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  borderColor: fieldErrors.openingHours ? '#dc2626' : undefined
                }}
                placeholder="e.g. 08:00 AM - 08:00 PM or 24/7 Service"
                id="input-org-hours"
              />
            </div>
            {fieldErrors.openingHours && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.openingHours}
              </div>
            )}
          </div>

          {/* COLUMN 1 - ROW 4: Password */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.password ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handleFieldChange('password', setPassword, e.target.value)}
                className={`form-input ${pulseField === 'password' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  paddingRight: '2.4rem',
                  borderColor: fieldErrors.password ? '#dc2626' : undefined
                }}
                placeholder="Min 6 characters"
                id="input-org-password"
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
            {fieldErrors.password && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.password}
              </div>
            )}
          </div>

          {/* COLUMN 2 - ROW 4: Confirm Password */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
              Confirm Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: fieldErrors.confirmPassword ? '#dc2626' : 'var(--neutral-400)'
                }}
              />
              <input
                ref={confirmPasswordRef}
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', setConfirmPassword, e.target.value)}
                className={`form-input ${pulseField === 'confirmPassword' ? 'input-invalid-pulse' : ''}`}
                style={{
                  paddingLeft: '2.3rem',
                  paddingRight: '2.4rem',
                  borderColor: fieldErrors.confirmPassword ? '#dc2626' : undefined
                }}
                placeholder="Re-enter password"
                id="input-org-confirm-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} /> {fieldErrors.confirmPassword}
              </div>
            )}
          </div>
        </div>

        {/* SUBMIT BUTTON - Spans across the entire form width */}
        <div style={{ marginTop: '1.75rem' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-primary)'
            }}
            id="btn-register-blood-bank"
          >
            {isSubmitting ? 'Registering Organization...' : 'REGISTER'}
          </button>
        </div>

        {/* Bottom Link: strictly only Blood Bank Login (no Donor links) */}
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.88rem', color: 'var(--neutral-600)' }}>
          Already registered?{' '}
          <Link to="/blood-bank/login" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
            Login to Blood Bank Portal
          </Link>
        </div>
      </form>
    </div>
  );
};

export default BloodBankRegister;

