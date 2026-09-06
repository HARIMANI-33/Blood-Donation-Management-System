import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  X,
  Save,
  RefreshCw,
  Droplet,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getBloodBankProfile, updateBloodBankProfile } from '../services/bloodBank.service';
import { ApiError } from '../services/api';
import type { BloodBankProfile } from '../types/bloodBank';

const BloodBankProfilePage = () => {
  const { token, updateUser } = useAuth();

  const [profile, setProfile] = useState<BloodBankProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form edit fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formHours, setFormHours] = useState('');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getBloodBankProfile(token);
      if (res.data?.profile) {
        const p = res.data.profile;
        setProfile(p);
        setFormName(p.organizationName || p.name || '');
        setFormPhone(p.phone || '');
        setFormCity(p.city || '');
        setFormAddress(p.fullAddress || p.address || '');
        setFormHours(p.openingHours || p.operatingHours || '');
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load organization profile';
      showNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleCancelEdit = () => {
    if (profile) {
      setFormName(profile.organizationName || profile.name || '');
      setFormPhone(profile.phone || '');
      setFormCity(profile.city || '');
      setFormAddress(profile.fullAddress || profile.address || '');
      setFormHours(profile.openingHours || profile.operatingHours || '');
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formName.trim() || formName.trim().length < 2) {
      showNotification('error', 'Blood Bank Name must be at least 2 characters.');
      return;
    }
    if (!formCity.trim() || formCity.trim().length < 2) {
      showNotification('error', 'City must be at least 2 characters.');
      return;
    }
    if (!formAddress.trim() || formAddress.trim().length < 5) {
      showNotification('error', 'Complete address must be at least 5 characters.');
      return;
    }
    if (!formPhone.trim() || formPhone.trim().replace(/\D/g, '').length < 7) {
      showNotification('error', 'A valid phone number is required (at least 7 digits).');
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateBloodBankProfile(
        {
          organizationName: formName.trim(),
          phone: formPhone.trim(),
          city: formCity.trim(),
          fullAddress: formAddress.trim(),
          openingHours: formHours.trim() || '08:00 AM - 08:00 PM'
        },
        token
      );

      if (res.data?.profile) {
        const updated = res.data.profile;
        setProfile(updated);
        setIsEditing(false);
        showNotification('success', 'Organization profile updated successfully.');

        // Synchronize auth state
        updateUser({
          id: updated.id,
          name: updated.organizationName || updated.name,
          email: updated.email,
          phone: updated.phone,
          bloodGroup: null,
          city: updated.city,
          role: 'blood_bank',
          createdAt: updated.createdAt
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update organization profile';
      showNotification('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary-600)', margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', color: 'var(--neutral-600)' }}>Loading organization profile...</p>
      </div>
    );
  }

  const orgName = profile?.organizationName || profile?.name || 'Blood Bank Facility';
  const orgEmail = profile?.email || 'N/A';
  const orgPhone = profile?.phone || 'Not specified';
  const orgCity = profile?.city || 'Not specified';
  const orgAddress = profile?.fullAddress || profile?.address || 'Not specified';
  const orgHours = profile?.openingHours || profile?.operatingHours || '08:00 AM - 08:00 PM';
  const registeredDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Verified';

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      {/* Toast Notification */}
      {statusMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: statusMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: statusMessage.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Facility Header Card */}
      <div
        className="feature-card"
        style={{
          padding: '1.75rem 2rem',
          margin: '0 0 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Building2 size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--neutral-900)' }}>
                {orgName}
              </h1>
              <span
                style={{
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                Certified Blood Bank
              </span>
            </div>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
              Registered on {registeredDate} &bull; City: <strong>{orgCity}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                fontSize: '0.9rem'
              }}
              id="btn-edit-profile"
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                fontSize: '0.9rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--neutral-300)',
                background: 'white',
                cursor: 'pointer',
                color: 'var(--neutral-700)',
                fontWeight: 600
              }}
              id="btn-cancel-edit-profile"
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
          )}

          <Link
            to="/blood-bank/dashboard?tab=inventory"
            style={{
              padding: '0.6rem 1.1rem',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--neutral-300)',
              backgroundColor: 'var(--neutral-50)',
              color: 'var(--neutral-800)',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            Go to Inventory &rarr;
          </Link>
        </div>
      </div>

      {/* Main Profile View / Edit Section */}
      {!isEditing ? (
        /* READ-ONLY VIEW */
        <div
          className="feature-card"
          style={{
            padding: '2rem',
            margin: 0,
            backgroundColor: '#ffffff',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--neutral-900)' }}>
            Facility Information
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem'
            }}
          >
            {/* Field 1: Organization Name */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Blood Bank / Facility Name
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} style={{ color: 'var(--primary-600)' }} />
                <span>{orgName}</span>
              </div>
            </div>

            {/* Field 2: Official Email */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Official Email (Login Identifier)
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={18} style={{ color: 'var(--primary-600)' }} />
                <span>{orgEmail}</span>
              </div>
            </div>

            {/* Field 3: Contact Phone */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Emergency & Inquiries Phone
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={18} style={{ color: 'var(--primary-600)' }} />
                <a href={`tel:${orgPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {orgPhone}
                </a>
              </div>
            </div>

            {/* Field 4: City */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Operating City
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} style={{ color: 'var(--primary-600)' }} />
                <span>{orgCity}</span>
              </div>
            </div>

            {/* Field 5: Full Address */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '10px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Full Facility Address
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--neutral-800)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                {orgAddress}
              </div>
            </div>

            {/* Field 6: Opening Hours */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '10px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Operating Hours & Public Availability
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: 'var(--primary-600)' }} />
                <span>{orgHours}</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts to Inventory and Appointments */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--neutral-200)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <Link
              to="/blood-bank/dashboard?tab=inventory"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-700)',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              <Droplet size={16} /> Manage Blood Stock
            </Link>

            <Link
              to="/blood-bank/dashboard?tab=appointments"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              <Calendar size={16} /> View Donor Appointments
            </Link>
          </div>
        </div>
      ) : (
        /* EDIT FORM */
        <form
          onSubmit={handleSaveProfile}
          className="feature-card"
          style={{
            padding: '2rem',
            margin: 0,
            backgroundColor: '#ffffff',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>
              Edit Organization Details
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
              Official email cannot be changed
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {/* Field 1: Organization Name */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
                Blood Bank Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="form-input"
                id="input-edit-org-name"
              />
            </div>

            {/* Field 2: Official Email (Read-Only) */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
                Official Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={orgEmail}
                className="form-input"
                style={{ backgroundColor: 'var(--neutral-100)', color: 'var(--neutral-600)', cursor: 'not-allowed' }}
              />
            </div>

            {/* Field 3: Phone */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
                Phone Number <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="tel"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="form-input"
                id="input-edit-org-phone"
              />
            </div>

            {/* Field 4: City */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
                City <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="form-input"
                id="input-edit-org-city"
              />
            </div>

            {/* Field 5: Full Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
                Complete Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="form-input"
                id="input-edit-org-address"
              />
            </div>

            {/* Field 6: Opening Hours */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
                Opening Hours <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
                className="form-input"
                placeholder="e.g. 08:00 AM - 08:00 PM or 24/7 Available"
                id="input-edit-org-hours"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              style={{
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--neutral-300)',
                background: 'white',
                cursor: 'pointer',
                color: 'var(--neutral-700)',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.5rem',
                fontSize: '0.9rem'
              }}
              id="btn-save-blood-bank-profile"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BloodBankProfilePage;
