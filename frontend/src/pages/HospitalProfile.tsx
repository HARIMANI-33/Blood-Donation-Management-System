import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Hospital,
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
  Building
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

  if (loading) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--primary-600)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--neutral-600)', fontSize: '1.05rem' }}>Loading hospital profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header Banner */}
      <div
        className="feature-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
          border: '1px solid var(--primary-200)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Hospital size={30} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
              {profile?.name || 'Hospital Profile'}
            </h1>
            <p style={{ color: 'var(--neutral-600)', margin: '0.2rem 0 0', fontSize: '0.88rem' }}>
              Facility ID: {profile?.id || profile?.hospitalId || 'Active'} • {profile?.hospitalType || 'General Hospital'}
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            id="btn-edit-hospital-profile"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.1rem',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.92rem',
            backgroundColor: statusMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: statusMessage.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Profile Form / View */}
      <div className="feature-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSave} noValidate>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            {/* Hospital Name */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                Hospital Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.95rem'
                  }}
                  required
                />
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--neutral-50)',
                    borderRadius: '8px',
                    color: 'var(--neutral-800)',
                    fontWeight: 600
                  }}
                >
                  {profile?.name || '—'}
                </div>
              )}
            </div>

            {/* Official Email (Readonly) */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                Official Email (Login Identifier)
              </label>
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--neutral-100)',
                  borderRadius: '8px',
                  color: 'var(--neutral-600)',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Mail size={16} />
                <span>{profile?.email || '—'}</span>
              </div>
            </div>

            {/* Phone */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.95rem'
                  }}
                  required
                />
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--neutral-50)',
                    borderRadius: '8px',
                    color: 'var(--neutral-800)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Phone size={16} style={{ color: 'var(--neutral-500)' }} />
                  <span>{profile?.phone || '—'}</span>
                </div>
              )}
            </div>

            {/* City */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                City
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.95rem'
                  }}
                  required
                />
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--neutral-50)',
                    borderRadius: '8px',
                    color: 'var(--neutral-800)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <MapPin size={16} style={{ color: 'var(--neutral-500)' }} />
                  <span>{profile?.city || '—'}</span>
                </div>
              )}
            </div>

            {/* Operating Hours */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                Operating Hours
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  placeholder="24/7 Available"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.95rem'
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--neutral-50)',
                    borderRadius: '8px',
                    color: 'var(--neutral-800)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Clock size={16} style={{ color: 'var(--neutral-500)' }} />
                  <span>{profile?.openingHours || '24/7 Available'}</span>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                Emergency Contact Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formEmergency}
                  onChange={(e) => setFormEmergency(e.target.value)}
                  placeholder="+91 44 2829 1111"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.95rem'
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--neutral-50)',
                    borderRadius: '8px',
                    color: 'var(--neutral-800)'
                  }}
                >
                  {profile?.emergencyContact || '—'}
                </div>
              )}
            </div>

            {/* Hospital Type */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
                Hospital Type
              </label>
              {isEditing ? (
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="General Hospital">General Hospital</option>
                  <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
                  <option value="Super Specialty Hospital">Super Specialty Hospital</option>
                  <option value="Government Medical College">Government Medical College</option>
                  <option value="Research & Trauma Center">Research & Trauma Center</option>
                </select>
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--neutral-50)',
                    borderRadius: '8px',
                    color: 'var(--neutral-800)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Building size={16} style={{ color: 'var(--neutral-500)' }} />
                  <span>{profile?.hospitalType || 'General Hospital'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Full Address */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
              Full Address
            </label>
            {isEditing ? (
              <textarea
                rows={3}
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--neutral-300)',
                  fontSize: '0.95rem',
                  resize: 'vertical'
                }}
                required
              />
            ) : (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--neutral-50)',
                  borderRadius: '8px',
                  color: 'var(--neutral-800)',
                  lineHeight: 1.5
                }}
              >
                {profile?.address || '—'}
              </div>
            )}
          </div>

          {/* Action Buttons in Edit Mode */}
          {isEditing && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--neutral-200)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="btn"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--neutral-300)',
                  color: 'var(--neutral-700)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 600
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
                  gap: '0.4rem',
                  padding: '0.65rem 1.5rem',
                  fontWeight: 600
                }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default HospitalProfilePage;
