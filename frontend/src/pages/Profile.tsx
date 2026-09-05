import { useState, useEffect, type FormEvent } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Droplet,
  Calendar,
  Award,
  Shield,
  Edit3,
  Check,
  X,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchDonorProfile, updateDonorProfile, fetchDonationCount } from '../services/donor.service';
import type { BloodGroup } from '../types/auth';
import { ApiError } from '../services/api';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const Profile = () => {
  const { user, token, updateUser } = useAuth();

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState<BloodGroup | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic donation count
  const [donationCount, setDonationCount] = useState<number>(0);

  // Sync profile fields from user
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditCity(user.city || '');
      setEditBloodGroup(user.bloodGroup || '');
    }
  }, [user]);

  // Fetch live profile & donation count from backend on mount
  useEffect(() => {
    if (!token) return;

    fetchDonorProfile(token)
      .then((res) => {
        if (res.data?.user) {
          updateUser(res.data.user);
        }
      })
      .catch(() => {});

    fetchDonationCount(token)
      .then((res) => {
        setDonationCount(res.data.totalDonations);
      })
      .catch(() => {});
  }, [token, updateUser]);

  if (!user) {
    return (
      <div className="profile-container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p>No user information available. Please log in.</p>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditName(user.name || '');
    setEditPhone(user.phone || '');
    setEditCity(user.city || '');
    setEditBloodGroup(user.bloodGroup || '');
    setError(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccessMsg(null);

    if (!editName.trim() || editName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    if (editPhone.trim()) {
      const digitsOnly = editPhone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        setError('Phone number must be at least 10 digits.');
        return;
      }
    }

    if (editCity.trim() && editCity.trim().length < 2) {
      setError('City must be at least 2 characters.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateDonorProfile(token, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        city: editCity.trim() || null,
        bloodGroup: editBloodGroup || null
      });

      if (res.data?.user) {
        updateUser(res.data.user);
      }

      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Format creation date
  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  return (
    <div className="profile-container">
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title">Donor Profile</h1>
        <p>Manage your donor information and lifetime donation record.</p>
      </div>

      {successMsg && (
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto 1.5rem',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#15803d',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="profile-grid">
        {/* Profile Details Card */}
        <div className="profile-card">
          <div className="profile-avatar-header">
            <div className="profile-avatar">
              <UserIcon size={40} />
            </div>
            <div className="profile-title-info">
              <h2>{user.name}</h2>
              <span className="profile-role-badge">
                <Shield size={14} style={{ marginRight: '4px' }} />
                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Donor'}
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={15} />
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
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    color: '#64748b',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: '0 0 1rem', padding: '0 1rem' }}>
              {error}
            </p>
          )}

          {isEditing ? (
            /* Edit Form Mode */
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                Full Name <span style={{ color: '#dc2626' }}>*</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                  style={{ marginTop: '0.35rem' }}
                  required
                />
              </label>

              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                Email Address
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="form-input"
                  style={{ marginTop: '0.35rem', background: '#f1f5f9', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Email address cannot be changed</span>
              </label>

              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                Phone Number
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                  className="form-input"
                  style={{ marginTop: '0.35rem' }}
                />
              </label>

              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                City
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Chennai, Bengaluru"
                  className="form-input"
                  style={{ marginTop: '0.35rem' }}
                />
              </label>

              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                Blood Group
                <select
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value as BloodGroup | '')}
                  className="form-input"
                  style={{ marginTop: '0.35rem' }}
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}
                >
                  <Check size={16} />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-modal-secondary"
                  style={{ margin: 0 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Normal View Mode */
            <div className="profile-details-list">
              <div className="profile-detail-item">
                <div className="profile-detail-label">
                  <UserIcon size={18} />
                  <span>Full Name</span>
                </div>
                <span className="profile-detail-value">{user.name}</span>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-label">
                  <Mail size={18} />
                  <span>Email Address</span>
                </div>
                <span className="profile-detail-value">{user.email}</span>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-label">
                  <Phone size={18} />
                  <span>Phone Number</span>
                </div>
                <span className="profile-detail-value">
                  {user.phone ? user.phone : <span className="text-muted">Not provided</span>}
                </span>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-label">
                  <MapPin size={18} />
                  <span>City</span>
                </div>
                <span className="profile-detail-value">
                  {user.city ? user.city : <span className="text-muted">Not specified</span>}
                </span>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-label">
                  <Droplet size={18} />
                  <span>Blood Group</span>
                </div>
                <span className="profile-detail-value">
                  {user.bloodGroup ? (
                    <span className="blood-badge">{user.bloodGroup}</span>
                  ) : (
                    <span className="text-muted">Not specified</span>
                  )}
                </span>
              </div>

              <div className="profile-detail-item">
                <div className="profile-detail-label">
                  <Calendar size={18} />
                  <span>Member Since</span>
                </div>
                <span className="profile-detail-value">{formattedDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Total Donations Section (Connected to dynamic count) */}
        <div className="profile-card donations-card">
          <div className="donations-header">
            <div className="donations-icon-wrap">
              <Award size={26} />
            </div>
            <div>
              <h3>Total Donations</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                Your lifetime blood donation contributions
              </p>
            </div>
          </div>

          <div className="donations-stat-box">
            <span className="donations-count">{donationCount}</span>
            <span className="donations-stat-label">Donations Recorded</span>
          </div>

          <div className="donations-notice">
            <p>
              <strong>Live Records:</strong> Each completed donation verified by a certified blood bank or hospital is dynamically counted here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
