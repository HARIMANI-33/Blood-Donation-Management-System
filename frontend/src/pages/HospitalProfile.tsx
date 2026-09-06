import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Hospital,
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
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  HeartPulse,
  Navigation,
  Lock,
  Search,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getHospitalProfile, updateHospitalProfile } from '../services/hospital.service';
import { ApiError } from '../services/api';
import type { HospitalProfile } from '../types/hospital';

const HospitalProfilePage = () => {
  const { token, user, updateUser } = useAuth();

  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formEmergency, setFormEmergency] = useState('');
  const [formType, setFormType] = useState('General Hospital');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const populateForm = (p: HospitalProfile) => {
    setProfile(p);
    setFormName(p.name || '');
    setFormPhone(p.phone || '');
    setFormCity(p.city || '');
    setFormAddress(p.address || '');
    setFormHours(p.openingHours || '24/7 Available');
    setFormEmergency(p.emergencyContact || '');
    setFormType(p.hospitalType || 'General Hospital');
  };

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getHospitalProfile(token);
      if (res.data) {
        populateForm(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load hospital profile';
      showNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleCopyFacilityId = () => {
    const facilityId = profile?.id || profile?.hospitalId || '';
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
    setTimeout(() => setCopiedId(false), 2200);
  };

  const handleCancelEdit = () => {
    if (profile) {
      populateForm(profile);
    }
    setIsEditing(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formName.trim()) {
      showNotification('error', 'Hospital name cannot be empty');
      return;
    }
    if (!formPhone.trim()) {
      showNotification('error', 'Phone number is required');
      return;
    }
    if (!formCity.trim()) {
      showNotification('error', 'City is required');
      return;
    }
    if (!formAddress.trim()) {
      showNotification('error', 'Full address is required');
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateHospitalProfile(
        {
          hospitalName: formName.trim(),
          phone: formPhone.trim(),
          city: formCity.trim(),
          fullAddress: formAddress.trim(),
          openingHours: formHours.trim(),
          emergencyContact: formEmergency.trim() || undefined,
          hospitalType: formType.trim()
        },
        token
      );

      if (res.data) {
        populateForm(res.data);
        if (user) {
          updateUser({
            ...user,
            name: res.data.name,
            phone: res.data.phone,
            city: res.data.city
          });
        }
        setIsEditing(false);
        showNotification('success', 'Hospital profile updated successfully!');
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update hospital profile';
      showNotification('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const googleMapsUrl = profile
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${profile.name}, ${profile.address}, ${profile.city}`
      )}`
    : '#';

  if (loading) {
    return (
      <div style={{ maxWidth: '1120px', margin: '3rem auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <RefreshCw size={36} className="spin" style={{ color: 'var(--primary-600)', margin: '0 auto 1.25rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-800)' }}>Loading Hospital Facility Profile</h3>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.95rem' }}>Fetching real-time verification and institutional credentials...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
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

      {/* Hero Medical Facility Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 50%, #fee2e2 100%)',
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
          <Hospital size={220} />
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
              <Hospital size={38} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0, letterSpacing: '-0.025em' }}>
                  {profile?.name || 'Medical Facility'}
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
                  Verified Facility
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
                  <Building2 size={13} />
                  {profile?.hospitalType || 'General Hospital'}
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
                  <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>{profile?.city || 'Location Active'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--neutral-400)' }}>•</span>
                  <span>Facility ID:</span>
                  <code
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      border: '1px solid var(--neutral-200)',
                      color: 'var(--neutral-800)'
                    }}
                  >
                    {(profile?.id || profile?.hospitalId || 'Active').slice(0, 18)}...
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
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>Active LifeFlow Network</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Edit Profile / View Toggle */}
          <div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                id="btn-edit-hospital-profile"
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
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={handleCancelEdit}
                className="btn"
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
              >
                <X size={16} />
                <span>Cancel Editing</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Operational Metrics & Readiness Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        {/* Card 1: Emergency Readiness */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.4rem 1.5rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
            <HeartPulse size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-500)', fontWeight: 700 }}>
              Emergency Readiness
            </span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neutral-900)', margin: '0.15rem 0 0' }}>
              {profile?.openingHours || '24/7 Available'}
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, margin: '0.1rem 0 0' }}>
              ● Trauma Response Active
            </p>
          </div>
        </div>

        {/* Card 2: Blood Network Link */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.4rem 1.5rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
              <Search size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-500)', fontWeight: 700 }}>
                Blood Coordination
              </span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neutral-900)', margin: '0.15rem 0 0' }}>
                Find Blood Banks
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
                Instant stock query by blood group
              </p>
            </div>
          </div>
          <Link
            to="/hospital/find-blood"
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
              border: '1px solid #bfdbfe'
            }}
          >
            <span>Search</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Card 3: Institutional Tier */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.4rem 1.5rem',
            border: '1px solid var(--neutral-200)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
              background: '#f8fafc',
              color: 'var(--neutral-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid var(--neutral-200)'
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-500)', fontWeight: 700 }}>
              Hospital Tier
            </span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neutral-900)', margin: '0.15rem 0 0' }}>
              {profile?.hospitalType || 'Medical Center'}
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
              Accredited Clinical Facility
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area: View Mode vs Edit Mode */}
      {!isEditing ? (
        /* ======================== VIEW MODE (DUAL COLUMN) ======================== */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.75rem',
            alignItems: 'start'
          }}
        >
          {/* Column 1: Institutional Credentials & Contact Details */}
          <div
            style={{
              background: 'white',
              borderRadius: '18px',
              padding: '2rem',
              border: '1px solid var(--neutral-200)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--neutral-100)' }}>
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
                <Hospital size={20} />
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
                  Registered Hospital Name
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
                  {profile?.name || '—'}
                </span>
              </div>

              {/* Field 2: Hospital Classification */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Facility Category
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} style={{ color: 'var(--primary-600)' }} />
                  <span style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--neutral-800)' }}>
                    {profile?.hospitalType || 'General Hospital'}
                  </span>
                </div>
              </div>

              {/* Field 3: Official Email */}
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
                    fontSize: '0.94rem',
                    fontWeight: 600
                  }}
                >
                  <Mail size={16} style={{ color: 'var(--neutral-500)', flexShrink: 0 }} />
                  <span>{profile?.email || '—'}</span>
                </div>
              </div>

              {/* Field 4: Primary Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Primary Phone Line
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--neutral-100)',
                      color: 'var(--neutral-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Phone size={15} />
                  </div>
                  {profile?.phone ? (
                    <a
                      href={`tel:${profile.phone}`}
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--primary-700)',
                        textDecoration: 'none'
                      }}
                    >
                      {profile.phone}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--neutral-400)' }}>—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Location Logistics & Critical Care */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Location & Navigation Card */}
            <div
              style={{
                background: 'white',
                borderRadius: '18px',
                padding: '2rem',
                border: '1px solid var(--neutral-200)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--neutral-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                    <Navigation size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
                      Facility Location
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: '0.1rem 0 0' }}>
                      Dispatch and emergency ambulance logistics
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    background: 'var(--neutral-100)',
                    color: 'var(--neutral-700)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                >
                  {profile?.city || 'City Region'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Full Campus Address
                  </span>
                  <p
                    style={{
                      fontSize: '0.96rem',
                      fontWeight: 500,
                      color: 'var(--neutral-800)',
                      lineHeight: 1.6,
                      margin: '0.35rem 0 0',
                      background: 'var(--neutral-50)',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid var(--neutral-200)'
                    }}
                  >
                    {profile?.address || 'No physical address recorded'}
                  </p>
                </div>

                {/* Google Maps Shortcut */}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    color: 'var(--neutral-800)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    border: '1.5px solid var(--neutral-200)',
                    transition: 'all 0.2s',
                    textDecoration: 'none'
                  }}
                >
                  <MapPin size={15} style={{ color: 'var(--primary-600)' }} />
                  <span>Open in Google Maps</span>
                  <ExternalLink size={13} style={{ color: 'var(--neutral-500)' }} />
                </a>
              </div>
            </div>

            {/* Critical Care & Emergency Hotline Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
                borderRadius: '18px',
                padding: '1.75rem',
                border: '1.5px solid #fecaca',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                    Emergency Coordination
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: '0.1rem 0 0' }}>
                    Dedicated 24/7 hotline for urgent blood requests
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    border: '1px solid #fecaca',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--neutral-500)' }}>
                      Emergency Hotline
                    </span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', margin: '0.1rem 0 0' }}>
                      {profile?.emergencyContact || profile?.phone || '24/7 Hotline Available'}
                    </div>
                  </div>

                  {profile?.emergencyContact && (
                    <a
                      href={`tel:${profile.emergencyContact}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        background: '#dc2626',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={13} />
                      <span>Call Now</span>
                    </a>
                  )}
                </div>

                {/* Operating Schedule Highlight */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.86rem',
                    color: 'var(--neutral-600)',
                    padding: '0.4rem 0.2rem'
                  }}
                >
                  <Clock size={15} style={{ color: 'var(--primary-600)' }} />
                  <span>Standard Facility Hours: <strong>{profile?.openingHours || '24/7 Available'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== EDIT MODE (PROFESSIONAL FORM) ======================== */
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2.5rem',
            border: '1.5px solid var(--neutral-200)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--neutral-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Edit3 size={22} style={{ color: 'var(--primary-600)' }} />
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
                Edit Medical Facility Profile
              </h2>
            </div>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.92rem', margin: '0.35rem 0 0' }}>
              Update institutional credentials, telephone numbers, and logistics for regional blood bank coordination.
            </p>
          </div>

          <form onSubmit={handleSave} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Section 1: Facility Identity */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--neutral-900)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Facility Classification & Identity
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.25rem'
                  }}
                >
                  {/* Hospital Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                      Hospital Legal Name <span style={{ color: 'var(--primary-600)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. SIMS Hospital"
                      style={{
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: '1.5px solid var(--neutral-300)',
                        fontSize: '0.95rem',
                        fontWeight: 500
                      }}
                      required
                    />
                  </div>

                  {/* Hospital Type */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                      Hospital Classification <span style={{ color: 'var(--primary-600)' }}>*</span>
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      style={{
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: '1.5px solid var(--neutral-300)',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="General Hospital">General Hospital</option>
                      <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
                      <option value="Super Specialty Hospital">Super Specialty Hospital</option>
                      <option value="Government Medical College">Government Medical College</option>
                      <option value="Research & Trauma Center">Research & Trauma Center</option>
                      <option value="Private Clinic & Surgical Center">Private Clinic & Surgical Center</option>
                    </select>
                  </div>

                  {/* Official Email (Readonly with explanation) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                      Official Email (Login Identifier)
                    </label>
                    <div
                      style={{
                        padding: '0.8rem 1rem',
                        backgroundColor: 'var(--neutral-100)',
                        borderRadius: '10px',
                        border: '1px solid var(--neutral-200)',
                        color: 'var(--neutral-600)',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem'
                      }}
                    >
                      <Lock size={15} style={{ color: 'var(--neutral-400)' }} />
                      <span>{profile?.email || '—'}</span>
                    </div>
                    <span style={{ fontSize: '0.76rem', color: 'var(--neutral-400)' }}>
                      Permanent account login identifier. Non-editable.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Location */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--neutral-900)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  2. Contact & Physical Location
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  {/* Phone */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                      Primary Telephone <span style={{ color: 'var(--primary-600)' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. +91 44 2829 0000"
                      style={{
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: '1.5px solid var(--neutral-300)',
                        fontSize: '0.95rem'
                      }}
                      required
                    />
                  </div>

                  {/* City */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                      City / Municipal Region <span style={{ color: 'var(--primary-600)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      style={{
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: '1.5px solid var(--neutral-300)',
                        fontSize: '0.95rem'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                    Full Campus / Facility Address <span style={{ color: 'var(--primary-600)' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Enter complete street, landmark, and postal code..."
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '10px',
                      border: '1.5px solid var(--neutral-300)',
                      fontSize: '0.95rem',
                      resize: 'vertical',
                      lineHeight: 1.5
                    }}
                    required
                  />
                </div>
              </div>

              {/* Section 3: Operating Schedule & Emergency Care */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--neutral-900)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Emergency & Operational Hours
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.25rem'
                  }}
                >
                  {/* Operating Hours */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                      Operating Hours
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        placeholder="24/7 Available"
                        style={{
                          width: '100%',
                          padding: '0.8rem 1rem 0.8rem 2.5rem',
                          borderRadius: '10px',
                          border: '1.5px solid var(--neutral-300)',
                          fontSize: '0.95rem'
                        }}
                      />
                      <Clock size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--neutral-400)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                      Dedicated Emergency Contact Hotline
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="tel"
                        value={formEmergency}
                        onChange={(e) => setFormEmergency(e.target.value)}
                        placeholder="e.g. +91 44 2829 1111"
                        style={{
                          width: '100%',
                          padding: '0.8rem 1rem 0.8rem 2.5rem',
                          borderRadius: '10px',
                          border: '1.5px solid var(--neutral-300)',
                          fontSize: '0.95rem'
                        }}
                      />
                      <PhoneCall size={16} style={{ position: 'absolute', left: '0.85rem', color: '#dc2626', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '1rem',
                borderTop: '1px solid var(--neutral-200)',
                paddingTop: '1.75rem',
                marginTop: '2.5rem'
              }}
            >
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="btn"
                style={{
                  backgroundColor: 'white',
                  border: '1.5px solid var(--neutral-300)',
                  color: 'var(--neutral-700)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.4rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
                id="btn-save-hospital-profile"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.85rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Saving Updates...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default HospitalProfilePage;
