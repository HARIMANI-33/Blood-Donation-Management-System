import { useState, useEffect, useCallback, type FormEvent } from 'react';
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
  Droplets,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Lock,
  ArrowRight,
  Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getBloodBankProfile, updateBloodBankProfile } from '../services/bloodBank.service';
import { ApiError } from '../services/api';
import PasswordChangeCard from '../components/PasswordChangeCard';
import type { BloodBankProfile } from '../types/bloodBank';

const BloodBankProfilePage = () => {
  const { token, updateUser } = useAuth();

  const [profile, setProfile] = useState<BloodBankProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
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

  const populateForm = (p: BloodBankProfile) => {
    setProfile(p);
    setFormName(p.organizationName || p.name || '');
    setFormPhone(p.phone || '');
    setFormCity(p.city || '');
    setFormAddress(p.fullAddress || p.address || '');
    setFormHours(p.openingHours || p.operatingHours || '08:00 AM - 08:00 PM');
  };

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getBloodBankProfile(token);
      if (res.data?.profile) {
        populateForm(res.data.profile);
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

  const handleCopyFacilityId = () => {
    const facilityId = profile?.id || '';
    if (!facilityId) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(facilityId);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = facilityId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCancelEdit = () => {
    if (profile) {
      populateForm(profile);
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: FormEvent) => {
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
        populateForm(updated);
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

  const orgName = profile?.organizationName || profile?.name || 'Blood Bank Facility';
  const orgEmail = profile?.email || 'N/A';
  const orgPhone = profile?.phone || 'Not specified';
  const orgCity = profile?.city || 'Not specified';
  const orgAddress = profile?.fullAddress || profile?.address || 'Not specified';
  const orgHours = profile?.openingHours || profile?.operatingHours || '08:00 AM - 08:00 PM';
  const registeredDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Verified';

  const googleMapsUrl = profile
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${orgName}, ${orgAddress}, ${orgCity}`)}`
    : '#';

  if (loading) {
    return (
      <div style={{ maxWidth: '1140px', margin: '3rem auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={36} style={{ color: 'var(--primary-600)', margin: '0 auto 1.25rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-800)' }}>Loading Organization Profile</h3>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.95rem' }}>Fetching real-time facility credentials and operational details...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '1.75rem 1.25rem 3.5rem' }}>
      {/* Toast Notification */}
      {statusMessage && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.85rem',
            fontSize: '0.95rem',
            fontWeight: 500,
            backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#166534' : '#991b1b',
            border: `1.5px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hero Facility Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 55%, #fee2e2 100%)',
          borderRadius: '20px',
          padding: '2.25rem',
          marginBottom: '1.75rem',
          border: '1px solid rgba(220, 38, 38, 0.18)',
          boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative background watermark */}
        <div
          style={{
            position: 'absolute',
            right: '-25px',
            bottom: '-25px',
            color: 'rgba(220, 38, 38, 0.04)',
            pointerEvents: 'none'
          }}
        >
          <Droplets size={220} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.5rem',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Avatar + Title Block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, var(--primary-600) 0%, #991b1b 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px -3px rgba(220, 38, 38, 0.38)',
                flexShrink: 0
              }}
            >
              <Building2 size={38} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0, letterSpacing: '-0.025em' }}>
                  {orgName}
                </h1>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0'
                  }}
                >
                  <ShieldCheck size={14} />
                  Certified Blood Bank
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: 'white',
                    color: 'var(--primary-700)',
                    border: '1px solid var(--primary-200)'
                  }}
                >
                  <Droplet size={13} />
                  Licensed Blood Facility
                </span>
              </div>

              {/* Facility Metadata Strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                  color: 'var(--neutral-600)',
                  fontSize: '0.88rem',
                  marginTop: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={15} style={{ color: 'var(--primary-600)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>{orgCity}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--neutral-400)' }}>•</span>
                  <span>Facility ID:</span>
                  <code
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      border: '1px solid var(--neutral-200)',
                      color: 'var(--neutral-800)'
                    }}
                  >
                    {(profile?.id || 'Active').slice(0, 18)}...
                  </code>
                  <button
                    onClick={handleCopyFacilityId}
                    title="Copy full Facility UUID"
                    id="btn-copy-facility-id"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: copiedId ? '#dcfce7' : 'white',
                      border: `1px solid ${copiedId ? '#86efac' : 'var(--neutral-300)'}`,
                      color: copiedId ? '#15803d' : 'var(--neutral-700)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedId ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--neutral-400)' }}>•</span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      boxShadow: '0 0 0 2.5px rgba(34, 197, 94, 0.2)'
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>
                    Registered on {registeredDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.4rem',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  borderRadius: '12px',
                  boxShadow: '0 6px 16px -2px rgba(220, 38, 38, 0.35)',
                  cursor: 'pointer'
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  border: '1.5px solid var(--neutral-300)',
                  color: 'var(--neutral-700)',
                  cursor: 'pointer'
                }}
                id="btn-cancel-edit-profile"
              >
                <X size={16} />
                <span>Cancel Editing</span>
              </button>
            )}

            <Link
              to="/blood-bank/dashboard?tab=inventory"
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '0.92rem',
                borderRadius: '12px',
                border: '1.5px solid var(--neutral-300)',
                backgroundColor: '#ffffff',
                color: 'var(--neutral-800)',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span>Go to Inventory</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Metrics & Readiness Bar (3 Columns) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Card 1: Operating Readiness */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.15rem'
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: '#fef2f2',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-500)', fontWeight: 700 }}>
              Operating Schedule
            </span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neutral-900)', margin: '0.15rem 0 0' }}>
              {orgHours}
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, margin: '0.1rem 0 0' }}>
              ● Public Dispensation Active
            </p>
          </div>
        </div>

        {/* Card 2: Blood Stock Management */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Droplet size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-500)', fontWeight: 700 }}>
                Blood Stock
              </span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neutral-900)', margin: '0.15rem 0 0' }}>
                8 Groups Monitored
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
                Real-time inventory levels
              </p>
            </div>
          </div>
          <Link
            to="/blood-bank/dashboard?tab=inventory"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid #bfdbfe',
              textDecoration: 'none'
            }}
          >
            <span>Stock</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Card 3: Donor Reception */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Calendar size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-500)', fontWeight: 700 }}>
                Appointments
              </span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neutral-900)', margin: '0.15rem 0 0' }}>
                Donor Reception
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
                Scheduled blood donations
              </p>
            </div>
          </div>
          <Link
            to="/blood-bank/dashboard?tab=appointments"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid #fde68a',
              textDecoration: 'none'
            }}
          >
            <span>Donors</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Main Content Area: View Mode (Dual Columns) vs Edit Mode */}
      {!isEditing ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '1.75rem',
            alignItems: 'start',
            marginBottom: '1.75rem'
          }}
        >
          {/* Column 1: Institutional Credentials & Contact Details */}
          <div
            style={{
              background: 'white',
              borderRadius: '18px',
              padding: '2rem',
              border: '1px solid var(--neutral-200)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--neutral-100)'
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
                  Institutional Identity
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
                  Registered facility credentials and contact lines
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              {/* Field 1: Official Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Registered Facility Name
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
                  {orgName}
                </span>
              </div>

              {/* Field 2: Official Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Official Email
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--neutral-500)',
                      backgroundColor: 'var(--neutral-100)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}
                  >
                    <Lock size={10} /> Login ID
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    background: 'var(--neutral-50)',
                    padding: '0.7rem 0.95rem',
                    borderRadius: '10px',
                    border: '1px solid var(--neutral-200)',
                    color: 'var(--neutral-800)',
                    fontSize: '0.96rem',
                    fontWeight: 600
                  }}
                >
                  <Mail size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span>{orgEmail}</span>
                </div>
              </div>

              {/* Field 3: Emergency & Contact Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Emergency & Inquiries Phone
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    background: 'var(--neutral-50)',
                    padding: '0.7rem 0.95rem',
                    borderRadius: '10px',
                    border: '1px solid var(--neutral-200)',
                    color: 'var(--neutral-900)',
                    fontSize: '0.96rem',
                    fontWeight: 700
                  }}
                >
                  <Phone size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <a href={`tel:${orgPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {orgPhone}
                  </a>
                </div>
              </div>

              {/* Field 4: Operating City */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Operating Jurisdiction / City
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} style={{ color: 'var(--primary-600)' }} />
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
                    {orgCity}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Physical Facility Location & Schedule */}
          <div
            style={{
              background: 'white',
              borderRadius: '18px',
              padding: '2rem',
              border: '1px solid var(--neutral-200)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--neutral-100)'
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
                  Location & Availability
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
                  Physical center address and daily operating times
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              {/* Operating Hours */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Operating Hours & Public Availability
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    background: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--neutral-200)',
                    color: 'var(--neutral-900)',
                    fontSize: '0.98rem',
                    fontWeight: 700
                  }}
                >
                  <Clock size={16} style={{ color: 'var(--primary-600)' }} />
                  <span>{orgHours}</span>
                </div>
              </div>

              {/* Complete Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Full Facility Address
                </span>
                <div
                  style={{
                    background: 'var(--neutral-50)',
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--neutral-200)',
                    color: 'var(--neutral-800)',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    fontWeight: 600
                  }}
                >
                  {orgAddress}
                </div>
                <div style={{ marginTop: '0.35rem' }}>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--primary-600)',
                      textDecoration: 'none'
                    }}
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Verified Network Assurance Box */}
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#15803d' }}>
                    Verified Healthcare Center
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '0.15rem', lineHeight: 1.4 }}>
                    Your facility is publicly visible to registered donors and certified hospitals for real-time blood allocation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== EDIT FORM ======================== */
        <form
          onSubmit={handleSaveProfile}
          style={{
            background: 'white',
            borderRadius: '18px',
            padding: '2rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
            marginBottom: '1.75rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--neutral-100)'
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--neutral-900)' }}>
                Edit Organization Details
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', margin: '0.2rem 0 0' }}>
                Update institutional contacts and operating schedules across LifeFlow
              </p>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                color: 'var(--neutral-500)',
                backgroundColor: 'var(--neutral-100)',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px'
              }}
            >
              <Lock size={12} /> Official email is permanent
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.35rem'
            }}
          >
            {/* Field 1: Organization Name */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.35rem', color: 'var(--neutral-800)' }}>
                Blood Bank Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="form-input"
                id="input-edit-org-name"
                placeholder="e.g. LifeFlow Central Blood Center"
                style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '10px' }}
              />
            </div>

            {/* Field 2: Official Email (Read-Only) */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.35rem', color: 'var(--neutral-800)' }}>
                Official Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={orgEmail}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--neutral-100)',
                  color: 'var(--neutral-600)',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            {/* Field 3: Phone */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.35rem', color: 'var(--neutral-800)' }}>
                Emergency & Contact Phone <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="tel"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="form-input"
                id="input-edit-org-phone"
                placeholder="e.g. +91 98765 43210"
                style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '10px' }}
              />
            </div>

            {/* Field 4: City */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.35rem', color: 'var(--neutral-800)' }}>
                Operating City <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="form-input"
                id="input-edit-org-city"
                placeholder="e.g. Chennai"
                style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '10px' }}
              />
            </div>

            {/* Field 5: Opening Hours */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.35rem', color: 'var(--neutral-800)' }}>
                Opening Hours & Public Access <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
                className="form-input"
                placeholder="e.g. 08:00 AM - 08:00 PM or 24/7 Available"
                id="input-edit-org-hours"
                style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '10px' }}
              />
            </div>

            {/* Field 6: Full Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.35rem', color: 'var(--neutral-800)' }}>
                Complete Physical Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="form-input"
                id="input-edit-org-address"
                placeholder="e.g. 12 Healthcare Avenue, Anna Nagar, Chennai"
                style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '10px' }}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--neutral-100)' }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              style={{
                padding: '0.7rem 1.35rem',
                fontSize: '0.92rem',
                borderRadius: '10px',
                border: '1.5px solid var(--neutral-300)',
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
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.7rem 1.6rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                borderRadius: '10px'
              }}
              id="btn-save-blood-bank-profile"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Bottom Section: Account Security + Facility Direct Actions Hub */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.75rem',
          alignItems: 'start'
        }}
      >
        {/* Left Card: Account Security & Password */}
        <div>
          <PasswordChangeCard
            token={token}
            accountEmail={profile?.email}
            title="Account Security & Password"
            subtitle="Update your blood bank facility password and access security"
          />
        </div>

        {/* Right Card: Facility Operations Quick Hub */}
        <div
          style={{
            background: 'white',
            borderRadius: '18px',
            padding: '2rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--neutral-100)'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Activity size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
                Operations Quick Hub
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
                Direct access to core blood bank management modules
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <Link
              to="/blood-bank/dashboard?tab=inventory"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.15rem',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                color: 'var(--primary-700)',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Droplet size={20} style={{ color: 'var(--primary-600)' }} />
                <div>
                  <div style={{ color: 'var(--neutral-900)' }}>Manage Blood Stock</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Update real-time 8-group inventory units
                  </div>
                </div>
              </div>
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/blood-bank/dashboard?tab=appointments"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.15rem',
                borderRadius: '12px',
                backgroundColor: '#fefce8',
                border: '1px solid #fef08a',
                color: '#854d0e',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={20} style={{ color: '#ca8a04' }} />
                <div>
                  <div style={{ color: 'var(--neutral-900)' }}>Donor Appointments</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Approve and review scheduled donor slots
                  </div>
                </div>
              </div>
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/blood-bank/dashboard?tab=requests"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.15rem',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Building2 size={20} style={{ color: '#2563eb' }} />
                <div>
                  <div style={{ color: 'var(--neutral-900)' }}>Hospital Blood Requests</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Process pending emergency hospital demands
                  </div>
                </div>
              </div>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BloodBankProfilePage;
