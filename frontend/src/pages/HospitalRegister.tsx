import { useState, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hospital, Lock, Clock, Building, Eye, EyeOff } from 'lucide-react';
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
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

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
    // 4. City -> 5. Address -> 6. Password -> 7. Confirm
    // ==========================================
    const errors: FieldErrors = {};
    let firstInvalidField: { name: string; ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null> } | null = null;

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

    // 6. Password
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

    // 7. Confirm Password
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

  const getInputStyle = (fieldName: keyof FieldErrors) => {
    const hasError = !!fieldErrors[fieldName];
    const isPulsing = pulseField === fieldName;

    return {
      width: '100%',
      padding: '0.75rem 0.85rem',
      borderRadius: '8px',
      border: hasError ? '2px solid #ef4444' : '1px solid var(--neutral-300)',
      backgroundColor: hasError ? '#fef2f2' : '#ffffff',
      fontSize: '0.92rem',
      outline: 'none',
      transition: 'all 0.2s ease',
      boxShadow: isPulsing ? '0 0 0 4px rgba(239, 68, 68, 0.35)' : 'none'
    };
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
        <h1 className="page-title" style={{ fontSize: '1.9rem', marginBottom: '0.35rem' }}>
          Hospital Registration
        </h1>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.95rem' }}>
          Register your hospital facility on LifeFlow for emergency blood discovery and priority allocation.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="feature-card"
        style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
        noValidate
      >
        {apiError && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '0.9rem',
              border: '1px solid #fecaca',
              textAlign: 'center'
            }}
          >
            {apiError}
          </div>
        )}

        {/* Section 1: Facility & Official Contact (Two-column landscape on desktop) */}
        <div>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--neutral-800)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Building size={18} style={{ color: 'var(--primary-600)' }} />
            <span>Facility & Contact Information</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {/* Hospital Name */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-name"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Hospital Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                ref={nameRef}
                id="reg-hosp-name"
                type="text"
                placeholder="e.g. Apollo Multi-Specialty Hospital"
                value={hospitalName}
                onChange={(e) => handleFieldChange('hospitalName', setHospitalName, e.target.value)}
                style={getInputStyle('hospitalName')}
              />
              {fieldErrors.hospitalName && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500 }}>
                  {fieldErrors.hospitalName}
                </span>
              )}
            </div>

            {/* Official Email */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-email"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Official Email Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                ref={emailRef}
                id="reg-hosp-email"
                type="email"
                placeholder="example@gmail.com"
                value={officialEmail}
                onChange={(e) => handleFieldChange('officialEmail', setOfficialEmail, e.target.value)}
                style={getInputStyle('officialEmail')}
              />
              {fieldErrors.officialEmail && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500 }}>
                  {fieldErrors.officialEmail}
                </span>
              )}
            </div>

            {/* Phone Number */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-phone"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Phone Number <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                ref={phoneRef}
                id="reg-hosp-phone"
                type="tel"
                placeholder="+91 44 2829 0000"
                value={phone}
                onChange={(e) => handleFieldChange('phone', setPhone, e.target.value)}
                style={getInputStyle('phone')}
              />
              {fieldErrors.phone && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500 }}>
                  {fieldErrors.phone}
                </span>
              )}
            </div>

            {/* City */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-city"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                City <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                ref={cityRef}
                id="reg-hosp-city"
                type="text"
                placeholder="e.g. Chennai"
                value={city}
                onChange={(e) => handleFieldChange('city', setCity, e.target.value)}
                style={getInputStyle('city')}
              />
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                {QUICK_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleFieldChange('city', setCity, c)}
                    style={{
                      border: '1px solid var(--neutral-300)',
                      background: city === c ? 'var(--primary-100)' : '#ffffff',
                      color: city === c ? 'var(--primary-700)' : 'var(--neutral-600)',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {fieldErrors.city && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500 }}>
                  {fieldErrors.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full Address */}
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            htmlFor="reg-hosp-address"
            style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
          >
            Full Address <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            ref={addressRef}
            id="reg-hosp-address"
            rows={2}
            placeholder="Complete street address, area, landmark, and pincode"
            value={fullAddress}
            onChange={(e) => handleFieldChange('fullAddress', setFullAddress, e.target.value)}
            style={{
              ...getInputStyle('fullAddress'),
              resize: 'vertical'
            }}
          />
          {fieldErrors.fullAddress && (
            <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500 }}>
              {fieldErrors.fullAddress}
            </span>
          )}
        </div>

        {/* Section 2: Optional Operations Details */}
        <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '1.25rem' }}>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--neutral-800)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Clock size={18} style={{ color: 'var(--primary-600)' }} />
            <span>Operational Details (Optional)</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem'
            }}
          >
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-hours"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Operating Hours
              </label>
              <input
                id="reg-hosp-hours"
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="24/7 Available"
                style={getInputStyle('openingHours')}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-emergency"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Emergency Contact
              </label>
              <input
                id="reg-hosp-emergency"
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+91 44 2829 1111"
                style={getInputStyle('hospitalName')}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-type"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Hospital Type
              </label>
              <select
                id="reg-hosp-type"
                value={hospitalType}
                onChange={(e) => setHospitalType(e.target.value)}
                style={{
                  ...getInputStyle('hospitalName'),
                  cursor: 'pointer'
                }}
              >
                <option value="General Hospital">General Hospital</option>
                <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
                <option value="Super Specialty Hospital">Super Specialty Hospital</option>
                <option value="Government Medical College">Government Medical College</option>
                <option value="Research & Trauma Center">Research & Trauma Center</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Password & Security */}
        <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '1.25rem' }}>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--neutral-800)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Lock size={18} style={{ color: 'var(--primary-600)' }} />
            <span>Account Security</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {/* Password */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-password"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  ref={passwordRef}
                  id="reg-hosp-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 chars with special char (!@#$...)"
                  value={password}
                  onChange={(e) => handleFieldChange('password', setPassword, e.target.value)}
                  style={{
                    ...getInputStyle('password'),
                    paddingRight: '2.5rem'
                  }}
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
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500 }}>
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                htmlFor="reg-hosp-confirm-pass"
                style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}
              >
                Confirm Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  ref={confirmPasswordRef}
                  id="reg-hosp-confirm-pass"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', setConfirmPassword, e.target.value)}
                  style={{
                    ...getInputStyle('confirmPassword'),
                    paddingRight: '2.5rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--neutral-400)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500 }}>
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          id="btn-hospital-register"
          style={{
            width: '100%',
            padding: '0.9rem',
            marginTop: '0.75rem',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.75 : 1
          }}
        >
          {isSubmitting ? 'Registering Hospital...' : 'Complete Hospital Registration'}
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: '0.92rem',
            color: 'var(--neutral-600)'
          }}
        >
          Already registered your hospital?{' '}
          <Link
            to="/hospital/login"
            id="link-hospital-login"
            style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'underline' }}
          >
            Sign in to Hospital Portal
          </Link>
        </div>
      </form>
    </div>
  );
};

export default HospitalRegister;
