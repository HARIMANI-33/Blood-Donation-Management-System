import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplet,
  Award,
  Calendar,
  MapPin,
  Heart,
  History,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarClock,
  Phone as PhoneIcon,
  Search,
  Building2,
  Hospital,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchBloodBanks,
  bookAppointment,
  fetchDonorAppointments,
  cancelAppointment,
  fetchDonorDonations,
  fetchDonationCount,
  fetchEligibilityStatus
} from '../services/donor.service';
import type {
  BloodBank,
  Appointment,
  DonationRecord,
  EligibilityStatus
} from '../types/donor';
import { ApiError } from '../services/api';

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM'
];

const Dashboard = () => {
  const { user, token, isNewRegistration } = useAuth();

  // Modals state
  const [showFindBloodModal, setShowFindBloodModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Live donor data state
  const [donationCount, setDonationCount] = useState<number>(0);
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [allBloodBanks, setAllBloodBanks] = useState<BloodBank[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);

  // Search/City filter for donation centers modal (defaults to empty to show all registered centers)
  const [centerCityFilter, setCenterCityFilter] = useState<string>('');
  const [isSearchingCenters, setIsSearchingCenters] = useState(false);

  // Booking form state
  const [selectedBankId, setSelectedBankId] = useState('');
  const [centerSelectionError, setCenterSelectionError] = useState(false);
  const [selectionPulse, setSelectionPulse] = useState(false);
  const centerSelectRef = useRef<HTMLDivElement>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const donorName = user?.name ? user.name.toUpperCase() : 'DONOR';
  const greetingPrefix = isNewRegistration ? 'Welcome,' : 'Welcome back,';

  // Function to load blood banks filtered by search keyword or city
  const loadBloodBanks = useCallback(
    async (searchTerm?: string) => {
      if (!token) return;
      setIsSearchingCenters(true);
      try {
        const res = await fetchBloodBanks(token, searchTerm);
        setBloodBanks(res.data.bloodBanks);
        if (!searchTerm) {
          setAllBloodBanks(res.data.bloodBanks);
        }
        if (res.data.bloodBanks.length > 0) {
          setSelectedBankId((prev) => {
            const exists = res.data.bloodBanks.some((b) => b.id === prev);
            return exists ? prev : '';
          });
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingCenters(false);
      }
    },
    [token]
  );

  // Load centers whenever token or city filter changes
  useEffect(() => {
    if (!token) return;
    loadBloodBanks(centerCityFilter || undefined);
  }, [token, centerCityFilter, loadBloodBanks]);

  // Load all other donor data on mount
  useEffect(() => {
    if (!token) return;

    // Fetch dynamic count
    fetchDonationCount(token)
      .then((res) => setDonationCount(res.data.totalDonations))
      .catch(() => {});

    // Fetch live eligibility
    fetchEligibilityStatus(token)
      .then((res) => setEligibility(res.data))
      .catch(() => {});

    // Fetch donor appointments
    fetchDonorAppointments(token)
      .then((res) => setAppointments(res.data.appointments))
      .catch(() => {});

    // Fetch donation records
    fetchDonorDonations(token)
      .then((res) => setDonations(res.data.donations))
      .catch(() => {});

    // Ensure all blood banks are loaded for booking dropdown
    fetchBloodBanks(token)
      .then((res) => setAllBloodBanks(res.data.bloodBanks))
      .catch(() => {});
  }, [token]);

  // Today in YYYY-MM-DD for min date
  const todayStr = new Date().toISOString().split('T')[0];

  // If donor is in mandatory recovery period, the earliest booking date allowed is nextEligibleDate
  const minBookingDate =
    eligibility && !eligibility.isEligible && eligibility.nextEligibleDate && eligibility.nextEligibleDate > todayStr
      ? eligibility.nextEligibleDate
      : todayStr;

  const handleBookAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBookingError(null);
    setBookingSuccess(null);
    setCenterSelectionError(false);

    if (!selectedBankId) {
      setCenterSelectionError(true);
      setSelectionPulse(true);
      setBookingError('Please select a donation center / organization before booking.');
      centerSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setSelectionPulse(false), 2000);
      return;
    }
    if (!appointmentDate) {
      setBookingError('Please choose an appointment date.');
      return;
    }

    // Check 90-day whole blood recovery waiting period
    if (eligibility && !eligibility.isEligible && eligibility.nextEligibleDate && appointmentDate < eligibility.nextEligibleDate) {
      const prevDateFormatted = formatDate(eligibility.lastDonationDate);
      const nextDateFormatted = formatDate(eligibility.nextEligibleDate);
      setBookingError(
        `Appointment booking restricted: You cannot schedule an appointment before your next eligible date (${nextDateFormatted}). Your previous donation was completed on ${prevDateFormatted}. Please choose ${nextDateFormatted} or a later date.`
      );
      return;
    }

    if (!appointmentTime) {
      setBookingError('Please select an appointment time slot.');
      return;
    }

    setIsBooking(true);
    try {
      const res = await bookAppointment(token, {
        bloodBankId: selectedBankId,
        organizationId: selectedBankId,
        appointmentDate,
        appointmentTime,
        bloodGroup: user?.bloodGroup || undefined,
        notes: appointmentNotes.trim() || undefined
      });

      setBookingSuccess(res.message || 'Donation appointment scheduled successfully!');
      setAppointmentNotes('');

      // Refresh appointments & eligibility
      const updatedApps = await fetchDonorAppointments(token);
      setAppointments(updatedApps.data.appointments);

      const updatedElig = await fetchEligibilityStatus(token);
      setEligibility(updatedElig.data);
    } catch (err) {
      setBookingError(err instanceof ApiError ? err.message : 'Failed to schedule appointment.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!token) return;
    setCancellingId(appointmentId);
    try {
      await cancelAppointment(token, appointmentId);
      // Refresh appointments & eligibility
      const updatedApps = await fetchDonorAppointments(token);
      setAppointments(updatedApps.data.appointments);

      const updatedElig = await fetchEligibilityStatus(token);
      setEligibility(updatedElig.data);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not cancel appointment.');
    } finally {
      setCancellingId(null);
    }
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'None Recorded';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Filter active appointments
  const activeAppointments = appointments.filter(
    (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
  );

  return (
    <div className="donor-dashboard-container">
      {/* Welcome Banner */}
      <section className="donor-welcome-banner">
        <div className="welcome-text-group">
          <div className="donor-welcome-badge">
            <Sparkles size={14} />
            <span>Lifesaver Dashboard</span>
          </div>
          <h1 className="welcome-heading">
            {greetingPrefix} <span className="welcome-name">{donorName}</span>!
          </h1>
          <p className="welcome-subtext">
            Thank you for being part of LifeFlow. Here is your personal donation overview and readiness status.
          </p>
        </div>

        {/* Action Button */}
        <div className="welcome-action-group">
          <button
            type="button"
            className="btn-find-blood"
            onClick={() => {
              setBookingError(null);
              setBookingSuccess(null);
              setShowFindBloodModal(true);
            }}
            id="btn-find-donation-centers"
          >
            <MapPin size={20} className="btn-icon-pin" />
            <span>Find Donation Centers</span>
          </button>
        </div>
      </section>

      {/* Upcoming Appointment Notice Banner (if active appointment exists) */}
      {eligibility?.hasUpcomingAppointment && eligibility.upcomingAppointment && (
        <section
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#dc2626',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CalendarClock size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                Upcoming Donation Appointment
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#7f1d1d', margin: '0.15rem 0 0' }}>
                <strong>{formatDate(eligibility.upcomingAppointment.appointment_date)}</strong> at{' '}
                <strong>{eligibility.upcomingAppointment.appointment_time}</strong> &bull;{' '}
                {eligibility.upcomingAppointment.blood_bank_name} ({eligibility.upcomingAppointment.blood_bank_city})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFindBloodModal(true)}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Manage Appointment
          </button>
        </section>
      )}

      {/* Recovery Waiting Period Banner on Dashboard (if within 90-day waiting period) */}
      {eligibility && !eligibility.isEligible && eligibility.lastDonationDate && (
        <section
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fcd34d',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#d97706',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#92400e', margin: 0 }}>
                Rest & Recovery Period Active
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#78350f', margin: '0.2rem 0 0' }}>
                Previous Donation: <strong>{formatDate(eligibility.lastDonationDate)}</strong> &bull; Next Eligible Donation: <strong>{formatDate(eligibility.nextEligibleDate)}</strong> ({eligibility.daysRemaining} {eligibility.daysRemaining === 1 ? 'day' : 'days'} remaining)
              </p>
            </div>
          </div>
          <span
            style={{
              padding: '0.4rem 0.85rem',
              background: '#ffffff',
              border: '1px solid #fde68a',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#b45309'
            }}
          >
            Eligible: {formatDate(eligibility.nextEligibleDate)}
          </span>
        </section>
      )}

      {/* 3 Core Cards: Blood Group, Total Donations, Last Donation */}
      <section className="donor-cards-grid">
        {/* 1. Blood Group Card */}
        <div className="donor-stat-card">
          <div className="donor-card-top">
            <div className="donor-card-icon-wrap icon-droplet">
              <Droplet size={24} />
            </div>
            <span className="donor-card-label">Blood Group</span>
          </div>
          <div className="donor-card-body">
            {user?.bloodGroup ? (
              <div className="donor-blood-group-val">
                <span className="blood-group-tag">{user.bloodGroup}</span>
                <span className="donor-card-helper">Donor Registered</span>
              </div>
            ) : (
              <div className="donor-blood-group-val">
                <span className="placeholder-text">Not Specified</span>
                <Link to="/profile" className="donor-card-link">
                  Set in Profile &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 2. Total Donations Card (Connected to dynamic backend count) */}
        <div className="donor-stat-card">
          <div className="donor-card-top">
            <div className="donor-card-icon-wrap icon-award">
              <Award size={24} />
            </div>
            <span className="donor-card-label">Total Donations</span>
          </div>
          <div className="donor-card-body">
            <div className="donor-number-display">{donationCount}</div>
            <span className="donor-card-helper">Lifetime donations recorded</span>
          </div>
        </div>

        {/* 3. Last Donation Card (Connected to live eligibility & dates) */}
        <div className="donor-stat-card">
          <div className="donor-card-top">
            <div className="donor-card-icon-wrap icon-calendar">
              <Calendar size={24} />
            </div>
            <span className="donor-card-label">Last Donation</span>
          </div>
          <div className="donor-card-body">
            <div className="donor-last-date">
              <span className="placeholder-text">{formatDate(eligibility?.lastDonationDate)}</span>
            </div>
            {eligibility ? (
              eligibility.isEligible ? (
                <div className="eligibility-tag">
                  <CheckCircle2 size={14} />
                  <span>Eligible to Donate</span>
                </div>
              ) : (
                <div
                  className="eligibility-tag"
                  style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}
                  title={eligibility.statusMessage}
                >
                  <Clock size={14} />
                  <span>Next: {formatDate(eligibility.nextEligibleDate)}</span>
                </div>
              )
            ) : (
              <div className="eligibility-tag">
                <CheckCircle2 size={14} />
                <span>Eligible to Donate</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Your Donation Journey Section */}
      <section className="donation-journey-card">
        <div className="journey-header">
          <div className="journey-icon-wrap">
            <Heart size={26} />
          </div>
          <div className="journey-title-wrap">
            <h2 className="journey-title">Your Donation Journey</h2>
            <p className="journey-subtitle">Every drop counts toward saving a life</p>
          </div>
        </div>

        <div className="journey-content">
          <div className="journey-quote-box">
            <p>
              &ldquo;A single blood donation can save up to three lives. Your willingness to give
              brings hope to surgical patients, accident victims, and those battling chronic illnesses.&rdquo;
            </p>
          </div>

          <div className="journey-milestone-preview">
            <div className="milestone-status-item">
              <span className="milestone-label">Milestone Target:</span>
              <span className="milestone-value">
                {donationCount === 0
                  ? '1st Blood Donation Milestone 🩸'
                  : `${donationCount + 1}${donationCount === 1 ? 'nd' : donationCount === 2 ? 'rd' : 'th'} Donation Milestone 🩸`}
              </span>
            </div>
            <div className="milestone-status-item">
              <span className="milestone-label">Donation Status:</span>
              <span
                className="milestone-ready"
                style={{
                  color: eligibility?.isEligible ? '#16a34a' : '#d97706'
                }}
              >
                {eligibility?.statusMessage || 'Ready for next drive'}
              </span>
            </div>
          </div>

          <div className="journey-actions">
            <button
              type="button"
              className="btn-journey-history"
              onClick={() => setShowHistoryModal(true)}
              id="btn-view-donation-history"
            >
              <History size={18} />
              <span>View Donation History ({donations.length})</span>
            </button>

            <Link to="/profile" className="btn-journey-secondary">
              View Donor Profile &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Modal: "Find Donation Centers" & Book Appointment */}
      {showFindBloodModal && (
        <div className="dashboard-modal-backdrop" onClick={() => setShowFindBloodModal(false)}>
          <div
            className="dashboard-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="modal-close-btn"
              onClick={() => setShowFindBloodModal(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="modal-icon-badge modal-icon-red">
              <MapPin size={28} />
            </div>

            <h3 className="modal-title">Find Donation Centers</h3>
            <p className="modal-desc" style={{ marginBottom: '1.25rem' }}>
              Locate registered blood banks, hospital donation units, and donation centers in your city. Call directly or choose a center to schedule an appointment.
            </p>

            {/* City Filter & Search Bar */}
            <div style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by blood bank name, city, or address..."
                  value={centerCityFilter}
                  onChange={(e) => setCenterCityFilter(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem', fontSize: '0.88rem' }}
                />
              </div>

              {/* Quick Filter Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginRight: '0.2rem' }}>
                  Quick Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setCenterCityFilter('')}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid #cbd5e1',
                    background: centerCityFilter === '' ? '#1e293b' : '#f8fafc',
                    color: centerCityFilter === '' ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  All Centers ({allBloodBanks.length || bloodBanks.length})
                </button>
                {user?.city && (
                  <button
                    type="button"
                    onClick={() => setCenterCityFilter(user.city || '')}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: '1px solid #dc2626',
                      background: centerCityFilter.toLowerCase() === (user.city || '').toLowerCase() ? '#dc2626' : '#fef2f2',
                      color: centerCityFilter.toLowerCase() === (user.city || '').toLowerCase() ? '#ffffff' : '#dc2626',
                      cursor: 'pointer'
                    }}
                  >
                    📍 My City ({user.city})
                  </button>
                )}
                {['Chennai', 'Bengaluru', 'Coimbatore', 'Madurai'].map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setCenterCityFilter(city)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: '1px solid #cbd5e1',
                      background: centerCityFilter.toLowerCase() === city.toLowerCase() ? '#1e293b' : '#f8fafc',
                      color: centerCityFilter.toLowerCase() === city.toLowerCase() ? '#ffffff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {city}
                  </button>
                ))}
                {centerCityFilter && (
                  <button
                    type="button"
                    onClick={() => setCenterCityFilter('')}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    Show All
                  </button>
                )}
              </div>
            </div>

            {/* List of Rich Center Cards */}
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Registered Donation Centers ({bloodBanks.length})
                </h4>
                {isSearchingCenters && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Searching...</span>
                )}
              </div>

              {bloodBanks.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px dashed #cbd5e1'
                  }}
                >
                  <AlertCircle size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.92rem' }}>
                    No donation centers found in &ldquo;{centerCityFilter}&rdquo;
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 1rem' }}>
                    Try viewing all cities or select one of the major cities above.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCenterCityFilter('')}
                    style={{
                      padding: '0.4rem 1rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View All Registered Centers
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {bloodBanks.map((bank) => {
                    const isSelected = selectedBankId === bank.id;
                    const isHospital = bank.type === 'HOSPITAL';
                    const isDonationCenter = bank.type === 'DONATION_CENTER';

                    return (
                      <div
                        key={bank.id}
                        style={{
                          background: isSelected ? '#fff5f5' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#dc2626' : '#e2e8f0'}`,
                          borderRadius: '12px',
                          padding: '1.1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          boxShadow: isSelected
                            ? '0 4px 12px rgba(220, 38, 38, 0.1)'
                            : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                              {bank.name}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.84rem', color: '#475569' }}>
                              <MapPin size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                              <span>{bank.address}</span>
                            </div>
                          </div>

                          {/* Center Type Badge */}
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              whiteSpace: 'nowrap',
                              background: isHospital ? '#dbeafe' : isDonationCenter ? '#fef3c7' : '#fee2e2',
                              color: isHospital ? '#1e40af' : isDonationCenter ? '#92400e' : '#991b1b'
                            }}
                          >
                            {isHospital ? (
                              <>
                                <Hospital size={13} />
                                Hospital Unit
                              </>
                            ) : isDonationCenter ? (
                              <>
                                <HeartHandshake size={13} />
                                Donation Centre
                              </>
                            ) : (
                              <>
                                <Building2 size={13} />
                                Certified Blood Bank
                              </>
                            )}
                          </span>
                        </div>

                        {/* Operating Hours and Phone Meta */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={14} style={{ color: '#94a3b8' }} />
                            <span>{bank.operating_hours || '09:00 AM - 06:00 PM'}</span>
                          </div>
                          {bank.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <PhoneIcon size={14} style={{ color: '#94a3b8' }} />
                              <span>{bank.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Direct Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          {bank.phone && (
                            <a
                              href={`tel:${bank.phone.replace(/[^0-9+]/g, '')}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.45rem 0.95rem',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                borderRadius: '7px',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                transition: 'all 0.15s'
                              }}
                            >
                              <PhoneIcon size={14} style={{ color: '#16a34a' }} />
                              <span>Call Center</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBankId(bank.id);
                              setCenterSelectionError(false);
                              setSelectionPulse(false);
                              setBookingError(null);
                              const formEl = document.getElementById('appointment-booking-section');
                              formEl?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.45rem 1rem',
                              background: isSelected ? '#dc2626' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#dc2626',
                              border: '1px solid #dc2626',
                              borderRadius: '7px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <CalendarClock size={14} />
                            <span>{isSelected ? '✓ Selected for Booking' : 'Book Appointment'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Appointment Booking Section */}
            <div
              id="appointment-booking-section"
              style={{
                borderTop: '2px solid #f1f5f9',
                paddingTop: '1.25rem',
                textAlign: 'left'
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                📅 Schedule Your Appointment
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '1rem' }}>
                Pick your preferred date and time slot for your selected donation center:
              </p>

              {/* Eligibility & Next Donation Date Notice Banner */}
              {eligibility?.lastDonationDate && (
                <div
                  style={{
                    marginBottom: '1.25rem',
                    padding: '1rem 1.25rem',
                    borderRadius: '10px',
                    border: eligibility.isEligible ? '1.5px solid #86efac' : '1.5px solid #fcd34d',
                    backgroundColor: eligibility.isEligible ? '#f0fdf4' : '#fffbeb',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {eligibility.isEligible ? (
                      <CheckCircle2 size={22} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertCircle size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: eligibility.isEligible ? '#15803d' : '#92400e' }}>
                        {eligibility.isEligible
                          ? '✓ Fully Eligible for Blood Donation'
                          : '⚠️ Recovery Waiting Period Active — Blood Donation Restricted'}
                      </div>
                      <p style={{ fontSize: '0.84rem', color: eligibility.isEligible ? '#166534' : '#78350f', margin: '0.25rem 0 0.65rem' }}>
                        {eligibility.isEligible
                          ? 'You have completed the required 90-day recovery period since your previous donation and are fully eligible to donate blood again.'
                          : 'To protect your health, whole blood donors must observe a mandatory 90-day recovery interval between donations. The system will not allow booking before your next eligible date.'}
                      </p>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                          gap: '0.65rem',
                          background: 'rgba(255,255,255,0.85)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div>
                          <span style={{ display: 'block', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>
                            Previous Donation Date
                          </span>
                          <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                            {formatDate(eligibility.lastDonationDate)}
                          </strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>
                            Next Eligible Date
                          </span>
                          <strong style={{ color: eligibility.isEligible ? '#15803d' : '#b45309', fontSize: '0.92rem' }}>
                            {formatDate(eligibility.nextEligibleDate)}
                          </strong>
                        </div>
                        {!eligibility.isEligible && eligibility.daysRemaining > 0 && (
                          <div>
                            <span style={{ display: 'block', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>
                              Waiting Period Remaining
                            </span>
                            <strong style={{ color: '#b45309', fontSize: '0.92rem' }}>
                              {eligibility.daysRemaining} {eligibility.daysRemaining === 1 ? 'day' : 'days'}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bookingSuccess && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              {bookingError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#b91c1c',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    marginBottom: '1rem'
                  }}
                >
                  {bookingError}
                </div>
              )}

              {/* Appointment Booking Form */}
              <form onSubmit={handleBookAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* SELECTED DONATION CENTER DISPLAY & SELECTOR */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Selected Donation Center <span style={{ color: '#dc2626' }}>*</span>
                  </label>

                  {(() => {
                    const availableCenters = allBloodBanks.length > 0 ? allBloodBanks : bloodBanks;
                    const selectedBank = availableCenters.find((b) => b.id === selectedBankId);
                    return selectedBank ? (
                      <div
                        ref={centerSelectRef}
                        className={selectionPulse ? 'input-invalid-pulse' : ''}
                        style={{
                          padding: '1.1rem 1.25rem',
                          background: '#ffffff',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Confirmed Donation Location
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0' }}>
                              {selectedBank.name}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.65rem',
                              borderRadius: '9999px',
                              background: selectedBank.type === 'HOSPITAL' ? '#dbeafe' : '#fee2e2',
                              color: selectedBank.type === 'HOSPITAL' ? '#1e40af' : '#991b1b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            {selectedBank.type === 'HOSPITAL' ? <Hospital size={13} /> : <Building2 size={13} />}
                            {selectedBank.type === 'HOSPITAL' ? 'Hospital Unit' : 'Certified Blood Bank'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: '#475569', marginTop: '0.15rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={14} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                            <span>{selectedBank.city} &bull; {selectedBank.address}</span>
                          </div>
                          {selectedBank.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <PhoneIcon size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                              <span>{selectedBank.phone}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                            <span>{selectedBank.operating_hours || '08:00 AM - 08:00 PM'}</span>
                          </div>
                        </div>

                        {/* Switch Center dropdown */}
                        <div style={{ marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Change Center:</span>
                          <select
                            value={selectedBankId}
                            onChange={(e) => {
                              setSelectedBankId(e.target.value);
                              setCenterSelectionError(false);
                              setSelectionPulse(false);
                              setBookingError(null);
                            }}
                            className="form-input"
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', maxWidth: '380px' }}
                          >
                            {(allBloodBanks.length > 0 ? allBloodBanks : bloodBanks).map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.name} &bull; {bank.city}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div
                        ref={centerSelectRef}
                        className={selectionPulse ? 'input-invalid-pulse' : ''}
                        style={{
                          padding: '1.25rem',
                          borderRadius: '10px',
                          border: centerSelectionError ? '2px solid #dc2626' : '2px dashed #cbd5e1',
                          backgroundColor: centerSelectionError ? '#fef2f2' : '#f8fafc',
                          textAlign: 'center'
                        }}
                      >
                        <Building2 size={26} style={{ color: centerSelectionError ? '#dc2626' : '#94a3b8', margin: '0 auto 0.4rem' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: centerSelectionError ? '#991b1b' : '#334155' }}>
                          No Donation Center Selected
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0.85rem' }}>
                          Select an organization from the centers list above or choose one from the menu below:
                        </p>
                        <select
                          value={selectedBankId}
                          onChange={(e) => {
                            setSelectedBankId(e.target.value);
                            setCenterSelectionError(false);
                            setSelectionPulse(false);
                            setBookingError(null);
                          }}
                          className="form-input"
                          style={{
                            maxWidth: '420px',
                            margin: '0 auto',
                            borderColor: centerSelectionError ? '#dc2626' : undefined
                          }}
                        >
                          <option value="">-- Choose a Donation Center / Organization --</option>
                          {(allBloodBanks.length > 0 ? allBloodBanks : bloodBanks).map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.name} &bull; {bank.city} ({bank.operating_hours || '08:00 AM - 08:00 PM'})
                            </option>
                          ))}
                        </select>
                        {centerSelectionError && (
                          <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <AlertCircle size={14} /> Please select an organization / donation center before booking.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                    Donor Blood Group
                    <div
                      style={{
                        marginTop: '0.35rem',
                        padding: '0.6rem 0.85rem',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#991b1b',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Droplet size={15} style={{ color: '#dc2626' }} />
                      <span>{user?.bloodGroup || 'To be recorded'}</span>
                    </div>
                  </label>

                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                    Appointment Date <span style={{ color: '#dc2626' }}>*</span>
                    <input
                      type="date"
                      min={minBookingDate}
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="form-input"
                      style={{ marginTop: '0.35rem' }}
                      required
                    />
                    {eligibility && !eligibility.isEligible && eligibility.nextEligibleDate && (
                      <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.76rem', color: '#b45309', fontWeight: 600 }}>
                        Earliest available: {formatDate(eligibility.nextEligibleDate)}
                      </span>
                    )}
                  </label>

                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                    Time Slot <span style={{ color: '#dc2626' }}>*</span>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="form-input"
                      style={{ marginTop: '0.35rem' }}
                      required
                    >
                      <option value="">Select Time</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                  Notes (Optional)
                  <input
                    type="text"
                    placeholder="e.g. Morning visit, first-time donor"
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '0.35rem' }}
                  />
                </label>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isBooking || bloodBanks.length === 0}
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  {isBooking ? 'Scheduling...' : 'Confirm Appointment Booking'}
                </button>
              </form>
            </div>

            {/* Existing Active Appointments List */}
            {activeAppointments.length > 0 && (
              <div style={{ marginTop: '1.75rem', textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                  Your Active Appointments ({activeAppointments.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeAppointments.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b' }}>
                          {app.blood_bank_name}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
                          📅 {formatDate(app.appointment_date)} at {app.appointment_time}
                        </div>
                        {app.blood_bank_address && (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            📍 {app.blood_bank_address}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            background: app.status === 'CONFIRMED' ? '#dcfce7' : '#fef3c7',
                            color: app.status === 'CONFIRMED' ? '#15803d' : '#92400e'
                          }}
                        >
                          {app.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(app.id)}
                          disabled={cancellingId === app.id}
                          style={{
                            border: '1px solid #fca5a5',
                            background: 'white',
                            color: '#dc2626',
                            fontSize: '0.78rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {cancellingId === app.id ? '...' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: "View Donation History" (Connected to real donation records) */}
      {showHistoryModal && (
        <div className="dashboard-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div
            className="dashboard-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}
          >
            <button
              className="modal-close-btn"
              onClick={() => setShowHistoryModal(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="modal-icon-badge modal-icon-neutral">
              <History size={32} />
            </div>

            <h3 className="modal-title">Donation History</h3>

            {donations.length === 0 ? (
              <div className="modal-empty-state">
                <AlertCircle size={40} className="modal-empty-icon" />
                <p className="modal-empty-title">No completed donation records yet</p>
                <p className="modal-empty-desc">
                  When you visit a blood bank and complete a blood donation, your donation certificate,
                  blood units, and hospital records will appear here automatically.
                </p>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setShowHistoryModal(false);
                      setShowFindBloodModal(true);
                    }}
                  >
                    Schedule Your First Donation
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'left', marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {donations.map((don) => (
                    <div
                      key={don.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b' }}>
                          {don.blood_bank_name || 'Certified Blood Bank'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          📅 {formatDate(don.donation_date)} &bull; {don.quantity_ml} ml donated
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="blood-badge">{don.blood_group}</span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            background: '#dcfce7',
                            color: '#15803d'
                          }}
                        >
                          {don.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions-dual" style={{ marginTop: '1.5rem' }}>
              <Link
                to="/profile"
                className="btn-modal-primary"
                onClick={() => setShowHistoryModal(false)}
              >
                Go to Profile
              </Link>
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setShowHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
