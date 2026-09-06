import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Phone,
  Droplet,
  Calendar,
  Award,
  ShieldCheck,
  Edit3,
  Check,
  X,
  CheckCircle2,
  MapPin,
  Sparkles,
  Heart,
  Activity,
  ArrowRight,
  Shield,
  Coffee,
  Apple,
  Moon,
  IdCard
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchDonorProfile, updateDonorProfile, fetchDonationCount, fetchEligibilityStatus } from '../services/donor.service';
import type { BloodGroup } from '../types/auth';
import type { EligibilityStatus } from '../types/donor';
import { ApiError } from '../services/api';
import PasswordChangeCard from '../components/PasswordChangeCard';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BLOOD_COMPATIBILITY: Record<
  string,
  { canGiveTo: string[]; canReceiveFrom: string[]; tag?: string }
> = {
  'A+': { canGiveTo: ['A+', 'AB+'], canReceiveFrom: ['A+', 'A-', 'O+', 'O-'], tag: 'Common Type' },
  'A-': { canGiveTo: ['A+', 'A-', 'AB+', 'AB-'], canReceiveFrom: ['A-', 'O-'], tag: 'Rare Platelet Donor' },
  'B+': { canGiveTo: ['B+', 'AB+'], canReceiveFrom: ['B+', 'B-', 'O+', 'O-'], tag: 'High Demand' },
  'B-': { canGiveTo: ['B+', 'B-', 'AB+', 'AB-'], canReceiveFrom: ['B-', 'O-'], tag: 'Rare Blood Type' },
  'AB+': { canGiveTo: ['AB+'], canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], tag: 'Universal Plasma Donor' },
  'AB-': { canGiveTo: ['AB+', 'AB-'], canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'], tag: 'Universal Plasma Provider' },
  'O+': { canGiveTo: ['O+', 'A+', 'B+', 'AB+'], canReceiveFrom: ['O+', 'O-'], tag: 'Most Needed Red Cells' },
  'O-': { canGiveTo: ['All Blood Groups (Universal Donor)'], canReceiveFrom: ['O-'], tag: 'Universal Red Cell Donor' }
};

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

  // Dynamic donation count & eligibility
  const [donationCount, setDonationCount] = useState<number>(0);
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);

  // Sync profile fields from user
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditCity(user.city || '');
      setEditBloodGroup(user.bloodGroup || '');
    }
  }, [user]);

  // Fetch live profile, donation count & eligibility from backend on mount
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

    fetchEligibilityStatus(token)
      .then((res) => {
        setEligibility(res.data);
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

  // Compute donor initials & avatar
  const donorFullName = user?.name ? user.name.trim() : 'Donor';
  const donorInitials = donorFullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'D';
  const donorAvatar = (user as unknown as { avatar?: string; profileImage?: string })?.avatar || (user as unknown as { avatar?: string; profileImage?: string })?.profileImage;

  // Milestone tier calculation
  let tierName = 'Registered Lifesaver';
  let tierBadge = '🌟';
  let nextMilestone = 1;
  let progressPercent = 0;

  if (donationCount >= 5) {
    tierName = 'Gold Lifesaver';
    tierBadge = '🥇';
    nextMilestone = 10;
    progressPercent = Math.min(100, Math.round((donationCount / 10) * 100));
  } else if (donationCount >= 3) {
    tierName = 'Silver Lifesaver';
    tierBadge = '🥈';
    nextMilestone = 5;
    progressPercent = Math.round((donationCount / 5) * 100);
  } else if (donationCount >= 1) {
    tierName = 'Bronze Lifesaver';
    tierBadge = '🥉';
    nextMilestone = 3;
    progressPercent = Math.round((donationCount / 3) * 100);
  } else {
    tierName = 'Registered Lifesaver';
    tierBadge = '🌱';
    nextMilestone = 1;
    progressPercent = 0;
  }

  const bloodGroupKey = user.bloodGroup || 'O+';
  const compatibility = BLOOD_COMPATIBILITY[bloodGroupKey] || BLOOD_COMPATIBILITY['O+'];

  return (
    <div className="donor-profile-page-wrapper">
      {/* Sophisticated Clinical Healthcare-Tech Ambient Layer (No red wave) */}
      <div className="donor-tech-bg-layer" aria-hidden="true">
        <div className="donor-tech-grid-overlay" />
        <div className="donor-tech-glow glow-slate-blue" />
        <div className="donor-tech-glow glow-soft-teal" />
      </div>

      <div className="profile-container">
        {/* Success Alert Banner */}
        {successMsg && (
          <div className="profile-alert-banner">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Hero Credential Header Card */}
        <section className="profile-hero-credential-card">
          <div className="hero-credential-content">
            {/* Big Avatar */}
            <div className="hero-avatar-wrap">
              <div className="hero-avatar-circle">
                {donorAvatar ? (
                  <img src={donorAvatar} alt={donorFullName} className="hero-avatar-img" />
                ) : (
                  <span>{donorInitials}</span>
                )}
              </div>
              <div className="hero-avatar-verified-dot" title="Verified LifeFlow Account">
                <ShieldCheck size={14} />
              </div>
            </div>

            {/* Profile Identity Details */}
            <div className="hero-identity-group">
              <div className="hero-badges-row">
                <span className="badge-verified-donor">
                  <ShieldCheck size={13} />
                  <span>Verified Lifesaver</span>
                </span>
                <span className="badge-tier-tag">
                  {tierBadge} {tierName}
                </span>
                {eligibility && (
                  <span
                    className="badge-eligibility-tag"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: eligibility.isEligible ? '#ecfdf5' : '#fef3c7',
                      color: eligibility.isEligible ? '#047857' : '#b45309',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '0.22rem 0.75rem',
                      borderRadius: '9999px',
                      border: `1px solid ${eligibility.isEligible ? '#a7f3d0' : '#fde68a'}`
                    }}
                  >
                    <Activity size={12} />
                    <span>
                      {eligibility.isEligible
                        ? 'Eligible to Donate'
                        : `Rest Period (${eligibility.daysRemaining} days left)`}
                    </span>
                  </span>
                )}
              </div>

              <h1 className="hero-donor-name">{user.name}</h1>
              <p className="hero-donor-subtext">
                Registered LifeFlow Donor &bull; Member since {formattedDate}
              </p>
            </div>

            {/* Right-aligned Stats & Action */}
            <div className="hero-action-group">
              {user.bloodGroup ? (
                <div className="hero-blood-badge">
                  <span className="hero-blood-drop-icon">
                    <Droplet size={18} />
                  </span>
                  <div>
                    <span className="hero-blood-type">{user.bloodGroup}</span>
                    <span className="hero-blood-lbl">Blood Group</span>
                  </div>
                </div>
              ) : (
                <div className="hero-blood-badge not-set">
                  <span className="hero-blood-lbl">Blood Group</span>
                  <span className="hero-blood-type-sm">Not Specified</span>
                </div>
              )}

              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="btn-edit-profile-hero"
                  id="btn-edit-donor-profile"
                >
                  <Edit3 size={15} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-cancel-profile-hero"
                >
                  <X size={15} />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Main 2-Column Balanced Grid */}
        <div className="profile-grid">
          {/* LEFT COLUMN: Personal Details & Pre-Donation Health */}
          <div className="profile-left-col">
            {/* Profile Details Card */}
            <div className="profile-card profile-details-card">
              <div className="profile-card-header">
                <div className="profile-card-header-icon">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h2 className="profile-card-title">Personal Information</h2>
                  <p className="profile-card-subtitle">Official donor identity records & contact data</p>
                </div>
              </div>

              {error && (
                <div className="profile-error-box">
                  <span>{error}</span>
                </div>
              )}

              {isEditing ? (
                /* Edit Form Mode */
                <form onSubmit={handleSaveProfile} className="profile-edit-form">
                  <label className="profile-form-label">
                    Full Name <span className="required-star">*</span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </label>

                  <label className="profile-form-label">
                    Email Address
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="form-input input-disabled"
                    />
                    <span className="input-helper-note">Email address cannot be changed</span>
                  </label>

                  <label className="profile-form-label">
                    Phone Number
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 90000 00000"
                      className="form-input"
                    />
                  </label>

                  <label className="profile-form-label">
                    City / District
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="e.g. Chennai, Bengaluru"
                      className="form-input"
                    />
                  </label>

                  <label className="profile-form-label">
                    Blood Group
                    <select
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value as BloodGroup | '')}
                      className="form-input"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="profile-edit-actions">
                    <button
                      type="submit"
                      className="btn-save-profile"
                      disabled={isSaving}
                    >
                      <Check size={16} />
                      <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn-cancel-edit"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Normal View Mode */
                <div className="profile-details-list">
                  <div className="profile-detail-row">
                    <div className="profile-detail-label">
                      <UserIcon size={17} />
                      <span>Full Name</span>
                    </div>
                    <span className="profile-detail-value">{user.name}</span>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-label">
                      <Mail size={17} />
                      <span>Email Address</span>
                    </div>
                    <span className="profile-detail-value value-email">{user.email}</span>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-label">
                      <Phone size={17} />
                      <span>Phone Number</span>
                    </div>
                    <span className="profile-detail-value">
                      {user.phone ? user.phone : <span className="text-muted">Not provided</span>}
                    </span>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-label">
                      <MapPin size={17} />
                      <span>City / District</span>
                    </div>
                    <span className="profile-detail-value">
                      {user.city ? user.city : <span className="text-muted">Not specified</span>}
                    </span>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-label">
                      <Droplet size={17} />
                      <span>Blood Group</span>
                    </div>
                    <span className="profile-detail-value">
                      {user.bloodGroup ? (
                        <span className="blood-badge-prominent">{user.bloodGroup}</span>
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </span>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-label">
                      <Calendar size={17} />
                      <span>Member Since</span>
                    </div>
                    <span className="profile-detail-value">{formattedDate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Account & Password Information Card */}
            <PasswordChangeCard
              token={token}
              accountEmail={user.email}
              title="Account Security & Password"
              subtitle="Update your voluntary donor password and security settings"
            />

            {/* Pre-Donation Health & Safety Checklist */}
            <div className="profile-card profile-checklist-card">
              <div className="profile-card-header">
                <div className="profile-card-header-icon icon-teal">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="profile-card-title">Donor Health Checklist</h3>
                  <p className="profile-card-subtitle">Healthy preparation tips for your next donation</p>
                </div>
              </div>

              <div className="checklist-grid">
                <div className="checklist-item">
                  <div className="checklist-icon-wrap">
                    <Coffee size={18} />
                  </div>
                  <div>
                    <h4 className="checklist-item-title">Hydration</h4>
                    <p className="checklist-item-desc">Drink 500ml of water or fluids 2 hours before donating.</p>
                  </div>
                </div>

                <div className="checklist-item">
                  <div className="checklist-icon-wrap">
                    <Apple size={18} />
                  </div>
                  <div>
                    <h4 className="checklist-item-title">Iron-Rich Meal</h4>
                    <p className="checklist-item-desc">Eat a nutritious meal. Avoid high-fat foods right before donating.</p>
                  </div>
                </div>

                <div className="checklist-item">
                  <div className="checklist-icon-wrap">
                    <Moon size={18} />
                  </div>
                  <div>
                    <h4 className="checklist-item-title">Restful Sleep</h4>
                    <p className="checklist-item-desc">Get a full night of restful sleep (7–8 hours) prior to drive day.</p>
                  </div>
                </div>

                <div className="checklist-item">
                  <div className="checklist-icon-wrap">
                    <IdCard size={18} />
                  </div>
                  <div>
                    <h4 className="checklist-item-title">Valid ID</h4>
                    <p className="checklist-item-desc">Bring a valid government-issued photo ID to the donation center.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Achievements, Impact & Blood Compatibility */}
          <div className="profile-right-col">
            {/* Total Donations & Impact Card */}
            <div className="profile-card profile-impact-card">
              <div className="profile-card-header">
                <div className="profile-card-header-icon icon-award">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="profile-card-title">Lifetime Impact</h3>
                  <p className="profile-card-subtitle">Dynamic verification of completed donations</p>
                </div>
              </div>

              <div className="impact-counter-box">
                <div className="impact-count-number">{donationCount}</div>
                <div className="impact-count-label">Completed Blood Donations</div>
                <div className="impact-lives-saved-tag">
                  <Heart size={14} className="impact-heart-pulse" />
                  <span>
                    {donationCount > 0
                      ? `Up to ${donationCount * 3} lives directly impacted`
                      : 'Each donation can save up to 3 lives'}
                  </span>
                </div>
              </div>

              {/* Milestone Progress Bar */}
              <div className="milestone-progress-section">
                <div className="milestone-progress-top">
                  <span className="milestone-current-tier">
                    {tierBadge} {tierName}
                  </span>
                  <span className="milestone-next-target">
                    {donationCount >= nextMilestone
                      ? 'Milestone Achieved!'
                      : `${donationCount} / ${nextMilestone} donations`}
                  </span>
                </div>
                <div className="milestone-progress-bar-bg">
                  <div
                    className="milestone-progress-bar-fill"
                    style={{ width: `${Math.max(8, progressPercent)}%` }}
                  />
                </div>
                <span className="milestone-progress-note">
                  {donationCount === 0
                    ? 'Book your first appointment to earn your Bronze Lifesaver badge!'
                    : `Next achievement milestone unlocks at ${nextMilestone} donations.`}
                </span>
              </div>

              <div className="impact-verified-note">
                <Shield size={16} />
                <p>
                  <strong>Verified Records:</strong> Every recorded donation is certified by an authorized hospital or blood bank.
                </p>
              </div>
            </div>

            {/* Blood Compatibility & Giving Power Card */}
            <div className="profile-card profile-compatibility-card">
              <div className="profile-card-header">
                <div className="profile-card-header-icon icon-droplet">
                  <Droplet size={20} />
                </div>
                <div>
                  <h3 className="profile-card-title">Blood Group Compatibility</h3>
                  <p className="profile-card-subtitle">
                    Type <strong>{bloodGroupKey}</strong> &bull; {compatibility.tag || 'Certified Type'}
                  </p>
                </div>
              </div>

              <div className="compatibility-groups">
                <div className="compatibility-block">
                  <span className="compat-label">Can Donate Red Blood Cells To:</span>
                  <div className="compat-pills-row">
                    {compatibility.canGiveTo.map((type) => (
                      <span key={type} className="compat-pill pill-give">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="compatibility-block">
                  <span className="compat-label">Can Safely Receive Blood From:</span>
                  <div className="compat-pills-row">
                    {compatibility.canReceiveFrom.map((type) => (
                      <span key={type} className="compat-pill pill-receive">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="compat-footer-note">
                <Sparkles size={14} />
                <span>
                  Your blood components (Red Cells, Platelets, Plasma) are separated to treat emergency trauma, leukemia, and surgical needs.
                </span>
              </div>
            </div>

            {/* Quick Navigation Card */}
            <div className="profile-card profile-nav-card">
              <div className="quick-nav-header">
                <h4>Quick Donor Actions</h4>
              </div>
              <div className="quick-nav-links">
                <Link to="/dashboard" className="quick-nav-item">
                  <div className="quick-nav-icon">
                    <Activity size={18} />
                  </div>
                  <div className="quick-nav-text">
                    <span className="quick-nav-title">Lifesaver Dashboard</span>
                    <span className="quick-nav-desc">View donation journey & appointment status</span>
                  </div>
                  <ArrowRight size={16} className="quick-nav-arrow" />
                </Link>

                <Link to="/dashboard" className="quick-nav-item">
                  <div className="quick-nav-icon icon-red">
                    <MapPin size={18} />
                  </div>
                  <div className="quick-nav-text">
                    <span className="quick-nav-title">Find Donation Centers</span>
                    <span className="quick-nav-desc">Schedule appointments at nearby blood banks</span>
                  </div>
                  <ArrowRight size={16} className="quick-nav-arrow" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
