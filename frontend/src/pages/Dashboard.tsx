import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Droplet,
  Award,
  Calendar,
  MapPin,
  Heart,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarClock,
  Phone as PhoneIcon,
  Search,
  Building2,
  Hospital,
  HeartHandshake,
  Check,
  ShieldCheck,
  Shield,
  Activity
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

// Curated Demo Donation Centers preserved for demonstration
const DEMO_DONATION_CENTERS: BloodBank[] = [
  {
    id: 'demo-lifeflow-53586',
    name: 'LifeFlow Center 53586 Updated',
    city: 'Chennai',
    address: '14 Hospital Road, Guindy, Chennai',
    phone: '+91 99887 76600',
    email: 'lifeflow53586@demo.org',
    operating_hours: '24/7 Service',
    type: 'DONATION_CENTER',
    is_donation_capable: true,
    source: 'DEMO'
  },
  {
    id: 'demo-lifeflow-99638',
    name: 'LifeFlow Center 99638 Updated',
    city: 'Chennai',
    address: '14 Hospital Road, Guindy, Chennai',
    phone: '+91 99887 76600',
    email: 'lifeflow99638@demo.org',
    operating_hours: '24/7 Service',
    type: 'DONATION_CENTER',
    is_donation_capable: true,
    source: 'DEMO'
  },
  {
    id: 'demo-apollo-chennai',
    name: 'Apollo Blood Bank Chennai',
    city: 'Chennai',
    address: '123 Anna Salai, Teynampet, Chennai, Tamil Nadu 600018',
    phone: '9988776655',
    email: 'apollo.chennai@demo.org',
    operating_hours: '24/7 Emergency Available',
    type: 'BLOOD_BANK',
    is_donation_capable: true,
    source: 'DEMO'
  },
  {
    id: 'demo-bengaluru-city',
    name: 'Bengaluru City Blood Center',
    city: 'Bengaluru',
    address: '26 MG Road, Shanthala Nagar, Bengaluru',
    phone: '+91 80 2558 1234',
    email: 'bengaluru.center@demo.org',
    operating_hours: '24/7 Available',
    type: 'DONATION_CENTER',
    is_donation_capable: true,
    source: 'DEMO'
  },
  {
    id: 'demo-kovai-care',
    name: 'Kovai Care Blood Bank',
    city: 'Coimbatore',
    address: '88 Avinashi Road, Peelamedu, Coimbatore',
    phone: '+91 422 257 8899',
    email: 'kovai.care@demo.org',
    operating_hours: '08:00 AM - 08:00 PM',
    type: 'BLOOD_BANK',
    is_donation_capable: true,
    source: 'DEMO'
  },
  {
    id: 'demo-madurai-mission',
    name: 'Madurai Mission Blood Centre',
    city: 'Madurai',
    address: '12 Melur Main Road, Madurai',
    phone: '+91 452 258 4400',
    email: 'madurai.mission@demo.org',
    operating_hours: '24 Hours Emergency',
    type: 'DONATION_CENTER',
    is_donation_capable: true,
    source: 'DEMO'
  }
];

const Dashboard = () => {
  const { user, token, isNewRegistration } = useAuth();
  const navigate = useNavigate();

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

  // Search/City filter for donation centers modal (defaults to donor's city or Chennai)
  const [centerCityFilter, setCenterCityFilter] = useState<string>('');
  const [centerSearchQuery, setCenterSearchQuery] = useState<string>('');
  const [isSearchingCenters, setIsSearchingCenters] = useState(false);

  // ONE Source of Truth for donor appointments:
  // Active upcoming appointment (PENDING or CONFIRMED for today or future, earliest upcoming first)
  const activeAppointment = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeList = appointments
      .filter(
        (a) =>
          (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
          (!a.appointment_date || a.appointment_date >= today)
      )
      .sort((a, b) => {
        const dateComp = (a.appointment_date || '').localeCompare(b.appointment_date || '');
        if (dateComp !== 0) return dateComp;
        return (a.appointment_time || '').localeCompare(b.appointment_time || '');
      });
    return activeList[0] || null;
  }, [appointments]);

  // State to toggle between the dedicated Booked Appointment view and the full Centers Directory
  const [showAllCentersAnyway, setShowAllCentersAnyway] = useState(false);

  // Look up full facility details for the booked hospital or blood bank
  const bookedFacility = useMemo(() => {
    if (!activeAppointment) return null;
    const available = allBloodBanks.length > 0 ? allBloodBanks : bloodBanks;
    return available.find((b) => b.id === activeAppointment.blood_bank_id) || null;
  }, [activeAppointment, allBloodBanks, bloodBanks]);

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

  /**
   * Safely deduplicate donation centers according to user priority:
   * 1. Unique organization/blood-bank ID (if two records have the same ID, display only one).
   * 2. Normalized combination of (organization name + full address + phone number).
   *    (Do NOT merge two genuinely different organizations merely because they have the same name).
   * 3. Keep the best/most complete record when duplicates are encountered.
   */
  const deduplicateDonationCenters = useCallback((centers: BloodBank[]): BloodBank[] => {
    if (!Array.isArray(centers) || centers.length === 0) return [];

    const getCompletenessScore = (c: BloodBank): number => {
      let score = 0;
      if (c.id && c.id.trim()) score += 10;
      if (c.name && c.name.trim()) score += 5;
      if (c.address && c.address.trim()) score += 5;
      if (c.city && c.city.trim()) score += 3;
      if (c.phone && c.phone.trim()) score += 4;
      if (c.email && c.email.trim()) score += 2;
      if (c.operating_hours && c.operating_hours.trim()) score += 2;
      if (c.type && c.type.trim()) score += 1;
      return score;
    };

    const normStr = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normDigits = (s?: string | null) => (s || '').replace(/\D/g, '');

    const seen = new Map<string, BloodBank>();
    const result: BloodBank[] = [];

    for (const c of centers) {
      const idKey = c.id ? `id:${c.id}` : null;
      const nameNorm = normStr(c.name);
      const addrNorm = normStr(c.address);
      const phoneNorm = normDigits(c.phone);
      const cityNorm = normStr(c.city);

      // Signature 1: normalized combination of name, full address, phone number
      const sig1 = `nap:${nameNorm}|${addrNorm}|${phoneNorm}`;
      // Signature 2: if phone is >= 7 digits, normalized combination of name + city + phone
      const sig2 = phoneNorm.length >= 7 ? `np:${nameNorm}|${cityNorm}|${phoneNorm}` : null;

      let matchKey: string | null = null;
      if (idKey && seen.has(idKey)) matchKey = idKey;
      else if (seen.has(sig1)) matchKey = sig1;
      else if (sig2 && seen.has(sig2)) matchKey = sig2;

      if (matchKey) {
        const existing = seen.get(matchKey)!;
        // Keep the best / most complete record
        if (getCompletenessScore(c) > getCompletenessScore(existing)) {
          seen.set(matchKey, c);
          if (idKey) seen.set(idKey, c);
          seen.set(sig1, c);
          if (sig2) seen.set(sig2, c);
          const idx = result.indexOf(existing);
          if (idx !== -1) result[idx] = c;
        }
      } else {
        if (idKey) seen.set(idKey, c);
        seen.set(sig1, c);
        if (sig2) seen.set(sig2, c);
        result.push(c);
      }
    }

    return result;
  }, []);

  // Function to load blood banks filtered by city and search query, merging Real DB centers first and Demo centers after
  const loadBloodBanks = useCallback(
    async (cityFilter?: string, searchQuery?: string) => {
      if (!token) return;
      setIsSearchingCenters(true);
      try {
        const res = await fetchBloodBanks(token, {
          city: cityFilter || undefined,
          search: searchQuery?.trim() || undefined
        });
        const rawReal = (res.data.bloodBanks || []).map((b: BloodBank) => ({
          ...b,
          source: 'LIVE' as const
        }));
        const deduplicatedReal = deduplicateDonationCenters(rawReal);

        // Filter demo donation centers by city and search query
        const matchingDemo = DEMO_DONATION_CENTERS.filter((demo) => {
          if (cityFilter && cityFilter.trim()) {
            if (demo.city.toLowerCase() !== cityFilter.trim().toLowerCase()) {
              return false;
            }
          }
          if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const match =
              demo.name.toLowerCase().includes(q) ||
              demo.city.toLowerCase().includes(q) ||
              demo.address.toLowerCase().includes(q);
            if (!match) return false;
          }
          return true;
        });

        // Duplicate protection: ensure no demo center duplicates a real database center
        const normStr = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const realSignatures = new Set<string>();
        for (const r of deduplicatedReal) {
          if (r.id) realSignatures.add(r.id.toLowerCase());
          realSignatures.add(normStr(r.name));
          realSignatures.add(`${normStr(r.name)}|${normStr(r.city)}`);
        }

        const filteredDemo = matchingDemo.filter((d) => {
          if (realSignatures.has(d.id.toLowerCase())) return false;
          if (realSignatures.has(normStr(d.name))) return false;
          if (realSignatures.has(`${normStr(d.name)}|${normStr(d.city)}`)) return false;
          return true;
        });

        // REAL DATABASE FIRST, DEMO RESULTS AFTER
        const unified = [...deduplicatedReal, ...filteredDemo];
        setBloodBanks(unified);

        if (!cityFilter && !searchQuery) {
          setAllBloodBanks(unified);
        }
        if (unified.length > 0) {
          setSelectedBankId((prev) => {
            const exists = unified.some((b) => b.id === prev);
            return exists ? prev : '';
          });
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingCenters(false);
      }
    },
    [token, deduplicateDonationCenters]
  );

  // Load centers whenever token, city filter, or search query changes
  useEffect(() => {
    if (!token) return;
    loadBloodBanks(centerCityFilter || undefined, centerSearchQuery || undefined);
  }, [token, centerCityFilter, centerSearchQuery, loadBloodBanks]);

  // Handler to open Find Donation Centers modal with donor's city preselected and fresh appointments
  const handleOpenFindBloodModal = useCallback(() => {
    setBookingError(null);
    setBookingSuccess(null);
    setShowAllCentersAnyway(false);
    const donorCity = user?.city || 'Chennai';
    setCenterCityFilter(donorCity);
    setCenterSearchQuery('');
    setShowFindBloodModal(true);
    if (token) {
      fetchDonorAppointments(token)
        .then((res) => setAppointments(res.data.appointments))
        .catch(() => {});
    }
  }, [user?.city, token]);

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
      .then((res) => {
        const rawReal = (res.data.bloodBanks || []).map((b: BloodBank) => ({
          ...b,
          source: 'LIVE' as const
        }));
        const deduplicatedReal = deduplicateDonationCenters(rawReal);
        setAllBloodBanks([...deduplicatedReal, ...DEMO_DONATION_CENTERS]);
      })
      .catch(() => {});
  }, [token, deduplicateDonationCenters]);

  // Today in YYYY-MM-DD for min date
  const todayStr = new Date().toISOString().split('T')[0];

  // If donor is in mandatory recovery period, the earliest booking date allowed is nextEligibleDate
  const minBookingDate =
    eligibility && !eligibility.isEligible && eligibility.nextEligibleDate && eligibility.nextEligibleDate > todayStr
      ? eligibility.nextEligibleDate
      : todayStr;

  // Format date helper (safe from UTC timezone shifting)
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'None Recorded';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
    const dt = new Date(dateStr);
    return isNaN(dt.getTime())
      ? dateStr
      : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleBookAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBookingError(null);
    setBookingSuccess(null);
    setCenterSelectionError(false);

    // 1. FRONTEND ELIGIBILITY CHECK:
    // If the donor is NOT eligible, block immediately.
    // Do NOT submit the appointment API request.
    // Show clear message with next eligible date.
    if (eligibility && !eligibility.isEligible) {
      const nextDateFormatted = formatDate(eligibility.nextEligibleDate);
      setBookingError(
        `You're currently not eligible to donate blood. Next eligible date: ${nextDateFormatted}. Please wait until your recovery period is complete.`
      );
      return;
    }

    if (!selectedBankId) {
      setCenterSelectionError(true);
      setSelectionPulse(true);
      setBookingError('Please select a donation center / organization before booking.');
      centerSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setSelectionPulse(false), 2000);
      return;
    }

    // 2. ACTIVE APPOINTMENT CHECK:
    // A donor must NOT be allowed to book another appointment if they already have an active upcoming appointment.
    if (activeAppointment) {
      setBookingError(
        `You already have an upcoming donation appointment scheduled with ${activeAppointment.blood_bank_name || 'a donation center'} on ${formatDate(activeAppointment.appointment_date)} at ${activeAppointment.appointment_time}. A donor cannot have more than one active appointment.`
      );
      return;
    }

    const availableCenters = allBloodBanks.length > 0 ? allBloodBanks : bloodBanks;
    const selectedBank = availableCenters.find((b) => b.id === selectedBankId);

    // 3. DEMO CENTER CHECK:
    if (selectedBank?.source === 'DEMO') {
      setBookingError(
        'This is a demonstration center. To book an appointment with our live partner hospitals, please choose a LIVE center (e.g. Neuro Life Blood Bank, Apex Blood Bank, or SIMS Hospital).'
      );
      return;
    }

    if (!appointmentDate) {
      setBookingError('Please choose an appointment date.');
      return;
    }

    // Rule 10: Ineligible donor cannot book an appointment
    if (eligibility && !eligibility.isEligible) {
      setBookingError(
        eligibility.statusMessage || 'You are currently ineligible to donate blood. Please wait until your recovery period is complete.'
      );
      return;
    }

    // Check 90-day whole blood recovery waiting period against selected date
    if (eligibility && eligibility.nextEligibleDate && appointmentDate < eligibility.nextEligibleDate) {
      const prevDateFormatted = formatDate(eligibility.lastDonationDate);
      const nextDateFormatted = formatDate(eligibility.nextEligibleDate);
      setBookingError(
        `Appointment booking restricted: You cannot schedule an appointment before your next eligible date (${nextDateFormatted}). Your previous donation was completed on ${prevDateFormatted}. Please wait until your recovery period is complete.`
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

      const appointmentData = res.data?.appointment;

      // Refresh appointments and eligibility immediately from the backend database (One source of truth)
      const refreshed = await fetchDonorAppointments(token);
      setAppointments(refreshed.data.appointments);
      fetchEligibilityStatus(token).then((r) => setEligibility(r.data)).catch(() => {});

      setAppointmentNotes('');
      setShowFindBloodModal(false);

      // Store in sessionStorage as backup for direct page reloads
      sessionStorage.setItem('last_booked_appointment', JSON.stringify(appointmentData));

      // Automatically navigate to dedicated Appointment Booked confirmation screen with exact database record
      navigate('/appointment-booked', {
        state: { appointment: appointmentData }
      });
    } catch (err) {
      setBookingError(err instanceof ApiError ? err.message : 'Unable to book appointment. Please try again.');
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

  // Filter active appointments
  const activeAppointments = appointments.filter(
    (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
  );

  // Business rule: An appointment is NOT a donation.
  // Filter ONLY real completed donations for history and counts.
  const completedDonations = donations.filter((d) => d.status === 'COMPLETED');
  const realDonationCount = donations.length > 0 ? completedDonations.length : donationCount;

  // Donor initials & avatar
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

  if (realDonationCount >= 5) {
    tierName = 'Gold Lifesaver';
    tierBadge = '🥇';
    nextMilestone = 10;
    progressPercent = Math.min(100, Math.round((realDonationCount / 10) * 100));
  } else if (realDonationCount >= 3) {
    tierName = 'Silver Lifesaver';
    tierBadge = '🥈';
    nextMilestone = 5;
    progressPercent = Math.round((realDonationCount / 5) * 100);
  } else if (realDonationCount >= 1) {
    tierName = 'Bronze Lifesaver';
    tierBadge = '🥉';
    nextMilestone = 3;
    progressPercent = Math.round((realDonationCount / 3) * 100);
  } else {
    tierName = 'Registered Lifesaver';
    tierBadge = '🌱';
    nextMilestone = 1;
    progressPercent = 0;
  }

  return (
    <div className="donor-dashboard-page-wrapper">
      {/* Sophisticated Clinical Healthcare-Tech Ambient Layer (No red wave) */}
      <div className="donor-tech-bg-layer" aria-hidden="true">
        <div className="donor-tech-grid-overlay" />
        <div className="donor-tech-glow glow-slate-blue" />
        <div className="donor-tech-glow glow-soft-teal" />
      </div>

      <div className="donor-dashboard-container">
        {/* Welcome Hero Credential Passport Banner */}
        <section className="profile-hero-credential-card donor-dashboard-hero-card">
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

              <h1 className="hero-donor-name">
                {greetingPrefix} <span className="welcome-name">{donorName}</span>!
              </h1>
              <p className="hero-donor-subtext">
                Your personal LifeFlow lifesaver hub. Every donation helps emergency and surgical units.
              </p>
            </div>

            {/* Right Action & Blood Group */}
            <div className="hero-action-group">
              {user?.bloodGroup ? (
                <div className="hero-blood-badge">
                  <span className="hero-blood-drop-icon">
                    <Droplet size={18} />
                  </span>
                  <div>
                    <span className="hero-blood-type">{user.bloodGroup}</span>
                    <span className="hero-blood-lbl">Blood Group</span>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="btn-find-blood"
                onClick={handleOpenFindBloodModal}
                id="btn-find-donation-centers"
              >
                <MapPin size={19} className="btn-icon-pin" />
                <span>Find Donation Centers</span>
              </button>
            </div>
          </div>
        </section>

      {/* Upcoming Appointment Notice Banner (Single Source of Truth: Active Database Appointment) */}
      {activeAppointment && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                  Upcoming Donation Appointment
                </h4>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    background: activeAppointment.status === 'CONFIRMED' ? '#dcfce7' : '#fef3c7',
                    color: activeAppointment.status === 'CONFIRMED' ? '#15803d' : '#92400e',
                    border: activeAppointment.status === 'CONFIRMED' ? '1px solid #86efac' : '1px solid #fcd34d'
                  }}
                >
                  {activeAppointment.status}
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#7f1d1d', margin: '0.15rem 0 0' }}>
                <strong>{formatDate(activeAppointment.appointment_date)}</strong> at{' '}
                <strong>{activeAppointment.appointment_time}</strong> &bull;{' '}
                {activeAppointment.blood_bank_name} {activeAppointment.blood_bank_city ? `(${activeAppointment.blood_bank_city})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenFindBloodModal}
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

      {/* 4 High-Impact Metric Cards: Blood Group, Total Donations, Lives Impacted, Next Eligibility */}
      <section className="donor-cards-grid">
        {/* 1. Blood Group Card */}
        <div className="donor-stat-card">
          <div className="donor-card-top">
            <div className="donor-card-icon-wrap icon-droplet">
              <Droplet size={24} />
            </div>
            <div>
              <span className="donor-card-label">Blood Group</span>
              <p className="donor-card-micro-sub">Certified Donor Type</p>
            </div>
          </div>
          <div className="donor-card-body">
            {user?.bloodGroup ? (
              <div className="donor-blood-group-val">
                <span className="blood-group-tag">{user.bloodGroup}</span>
                <div className="donor-blood-meta">
                  <span className="donor-card-helper">Donor Registered</span>
                  <span className="donor-card-subhelper">Compatible for Emergency Drives</span>
                </div>
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

        {/* 2. Total Donations Card (Connected to dynamic backend count of completed donations) */}
        <div className="donor-stat-card">
          <div className="donor-card-top">
            <div className="donor-card-icon-wrap icon-award">
              <Award size={24} />
            </div>
            <div>
              <span className="donor-card-label">Total Donations</span>
              <p className="donor-card-micro-sub">Verified Contributions</p>
            </div>
          </div>
          <div className="donor-card-body">
            <div className="donor-stat-num-row">
              <div className="donor-number-display">{realDonationCount}</div>
              <div className="donor-impact-badge-pill">
                <Heart size={13} className="impact-heart-pulse" />
                <span>{realDonationCount > 0 ? `${realDonationCount} Completed` : 'Target: 1st'}</span>
              </div>
            </div>
            <div className="donor-progress-mini-bar">
              <div
                className="donor-progress-mini-fill"
                style={{ width: `${Math.max(10, progressPercent)}%` }}
              />
            </div>
            <span className="donor-card-helper">
              {realDonationCount === 0
                ? 'Target: 1st donation milestone'
                : `${realDonationCount} of ${nextMilestone} donations to next tier`}
            </span>
          </div>
        </div>

        {/* 3. Lives Impacted Card (Direct calculation: 3 lives per donation) */}
        <div className="donor-stat-card">
          <div className="donor-card-top">
            <div className="donor-card-icon-wrap icon-heart-impact">
              <Heart size={24} />
            </div>
            <div>
              <span className="donor-card-label">Lives Saved</span>
              <p className="donor-card-micro-sub">Clinical Impact</p>
            </div>
          </div>
          <div className="donor-card-body">
            <div className="donor-stat-num-row">
              <div className="donor-number-display">
                {realDonationCount > 0 ? realDonationCount * 3 : 3}
              </div>
              <div
                className="donor-impact-badge-pill"
                style={{ background: '#fdf2f8', color: '#be185d' }}
              >
                <Activity size={13} />
                <span>Up to 3 / unit</span>
              </div>
            </div>
            <div className="donor-last-date" style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
              Trauma & Emergency Care
            </div>
            <span className="donor-card-helper">Whole blood components assist up to 3 patients</span>
          </div>
        </div>

        {/* 4. Next Eligibility & Readiness Card (Connected to live eligibility & dates) */}
        <div className="donor-stat-card">
          <div className="donor-card-top">
            <div className="donor-card-icon-wrap icon-clock-interval">
              <CalendarClock size={24} />
            </div>
            <div>
              <span className="donor-card-label">Readiness</span>
              <p className="donor-card-micro-sub">Eligibility Status</p>
            </div>
          </div>
          <div className="donor-card-body">
            <div className="donor-last-date">
              {eligibility ? (
                eligibility.isEligible ? (
                  <div className="eligibility-tag tag-eligible">
                    <CheckCircle2 size={14} />
                    <span>Eligible to Donate</span>
                  </div>
                ) : (
                  <div
                    className="eligibility-tag tag-recovery"
                    title={eligibility.statusMessage}
                  >
                    <Clock size={14} />
                    <span>{eligibility.daysRemaining}d Rest Period</span>
                  </div>
                )
              ) : (
                <div className="eligibility-tag tag-eligible">
                  <CheckCircle2 size={14} />
                  <span>Eligible to Donate</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 700 }}>
              {eligibility?.lastDonationDate
                ? `Last: ${formatDate(eligibility.lastDonationDate)}`
                : 'No Previous Donations'}
            </div>
            <span className="donor-card-helper">
              {eligibility && !eligibility.isEligible && eligibility.nextEligibleDate
                ? `Next: ${formatDate(eligibility.nextEligibleDate)}`
                : '90-day whole blood interval cycle'}
            </span>
          </div>
        </div>
      </section>

      {/* Balanced 2-Column Lower Grid: Journey Roadmap (Left) & Readiness Guide (Right) */}
      <section className="donor-lower-split-grid">
        {/* Column 1: Your Donation Journey */}
        <div className="donation-journey-card">
          <div className="journey-header">
            <div className="journey-icon-wrap">
              <Heart size={24} />
            </div>
            <div className="journey-title-wrap">
              <h2 className="journey-title">Your Donation Journey</h2>
              <p className="journey-subtitle">Every drop counts toward saving a life across hospitals and trauma care</p>
            </div>
          </div>

          {/* Visual Roadmap Steps */}
          <div className="journey-roadmap-steps">
            <div className="roadmap-step step-complete">
              <div className="roadmap-step-circle">
                <Check size={14} />
              </div>
              <div className="roadmap-step-info">
                <span className="roadmap-step-title">Registered</span>
                <span className="roadmap-step-sub">Profile Active ✅</span>
              </div>
            </div>

            <div className={`roadmap-step ${realDonationCount >= 1 ? 'step-complete' : 'step-current'}`}>
              <div className="roadmap-step-circle">
                {realDonationCount >= 1 ? <Check size={14} /> : '1'}
              </div>
              <div className="roadmap-step-info">
                <span className="roadmap-step-title">1st Donation</span>
                <span className="roadmap-step-sub">
                  {realDonationCount >= 1 ? 'Recorded 🩸' : 'Initial Target'}
                </span>
              </div>
            </div>

            <div className={`roadmap-step ${realDonationCount >= 3 ? 'step-complete' : realDonationCount >= 1 ? 'step-current' : 'step-upcoming'}`}>
              <div className="roadmap-step-circle">
                {realDonationCount >= 3 ? <Check size={14} /> : '3'}
              </div>
              <div className="roadmap-step-info">
                <span className="roadmap-step-title">Silver</span>
                <span className="roadmap-step-sub">3 Donations 🥈</span>
              </div>
            </div>

            <div className={`roadmap-step ${realDonationCount >= 5 ? 'step-complete' : 'step-upcoming'}`}>
              <div className="roadmap-step-circle">
                {realDonationCount >= 5 ? <Check size={14} /> : '5'}
              </div>
              <div className="roadmap-step-info">
                <span className="roadmap-step-title">Gold</span>
                <span className="roadmap-step-sub">5+ Donations 🥇</span>
              </div>
            </div>
          </div>

          <div className="journey-content">
            <div className="journey-quote-box">
              <p>
                &ldquo;A single blood donation can save up to three lives. Your willingness to give
                brings hope to surgical patients, accident victims, and those battling chronic illnesses.&rdquo;
              </p>
            </div>

            <div className="journey-actions">
              <button
                type="button"
                className="btn-journey-history"
                onClick={() => setShowHistoryModal(true)}
                id="btn-view-donation-history"
              >
                <History size={18} />
                <span>View Donation History ({completedDonations.length})</span>
              </button>

              <button
                type="button"
                className="btn-journey-schedule"
                onClick={handleOpenFindBloodModal}
              >
                <MapPin size={17} />
                <span>Schedule Next Donation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Pre-Donation Readiness Guide (Fills space, evaluator-ready) */}
        <div className="donor-readiness-card">
          <div className="readiness-header">
            <div className="readiness-icon-wrap">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="readiness-title">Donation Readiness</h3>
              <p className="readiness-subtitle">Preparation tips for a safe donation</p>
            </div>
          </div>

          <div className="readiness-checklist">
            <div className="readiness-item">
              <div className="readiness-item-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                💧
              </div>
              <div className="readiness-item-content">
                <span className="readiness-item-title">Hydrate Generously</span>
                <span className="readiness-item-desc">Drink 500ml water or fruit juice before your appointment.</span>
              </div>
            </div>

            <div className="readiness-item">
              <div className="readiness-item-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                🥗
              </div>
              <div className="readiness-item-content">
                <span className="readiness-item-title">Iron-Rich Nutrition</span>
                <span className="readiness-item-desc">Eat a nutritious meal with spinach, beans, or lentils 2-3 hours prior.</span>
              </div>
            </div>

            <div className="readiness-item">
              <div className="readiness-item-icon" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                😴
              </div>
              <div className="readiness-item-content">
                <span className="readiness-item-title">Adequate Rest</span>
                <span className="readiness-item-desc">Ensure 7 to 8 hours of solid, restful sleep the night before.</span>
              </div>
            </div>

            <div className="readiness-item">
              <div className="readiness-item-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                🪪
              </div>
              <div className="readiness-item-content">
                <span className="readiness-item-title">Photo ID & Donor Card</span>
                <span className="readiness-item-desc">Carry a valid government ID when visiting the donation center.</span>
              </div>
            </div>
          </div>

          <div className="readiness-footer-notice">
            <Shield size={14} style={{ flexShrink: 0 }} />
            <span>LifeFlow verified protocols protect donor and recipient health.</span>
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

            {activeAppointment && !showAllCentersAnyway ? (
              /* ============================================================ */
              /* DEDICATED VIEW: APPOINTMENT ALREADY BOOKED & FACILITY DETAILS */
              /* ============================================================ */
              <div>
                <div className="modal-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <CheckCircle2 size={28} />
                </div>

                <h3 className="modal-title" style={{ color: '#0f172a' }}>
                  Appointment Already Booked
                </h3>
                <p className="modal-desc" style={{ marginBottom: '1.25rem', color: '#475569' }}>
                  You already have an upcoming blood donation scheduled at this facility. Details of your booked hospital / blood bank:
                </p>

                {/* Booked Facility & Appointment Card */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    marginBottom: '1.25rem',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
                    textAlign: 'left'
                  }}
                >
                  {/* Facility Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '1rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: bookedFacility?.type === 'HOSPITAL' ? '#eff6ff' : '#fff1f2',
                          color: bookedFacility?.type === 'HOSPITAL' ? '#2563eb' : '#e11d48',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {bookedFacility?.type === 'HOSPITAL' ? <Hospital size={26} /> : <Building2 size={26} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {activeAppointment.blood_bank_name || bookedFacility?.name || 'Selected Medical Center'}
                          </h4>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              background: bookedFacility?.type === 'HOSPITAL' ? '#dbeafe' : '#fee2e2',
                              color: bookedFacility?.type === 'HOSPITAL' ? '#1d4ed8' : '#b91c1c'
                            }}
                          >
                            {bookedFacility?.type === 'HOSPITAL' ? '🏥 Hospital Blood Unit' : '🩸 Certified Blood Bank'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Booking Reference:{' '}
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                            #{activeAppointment.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.35rem 0.8rem',
                        borderRadius: '9999px',
                        background: activeAppointment.status === 'CONFIRMED' ? '#dcfce7' : '#fef3c7',
                        color: activeAppointment.status === 'CONFIRMED' ? '#15803d' : '#92400e',
                        border: activeAppointment.status === 'CONFIRMED' ? '1px solid #86efac' : '1px solid #fcd34d'
                      }}
                    >
                      ● {activeAppointment.status === 'CONFIRMED' ? 'Confirmed Appointment' : 'Pending Verification'}
                    </span>
                  </div>

                  {/* Facility Details Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '0.85rem',
                      marginBottom: '1.1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                      <MapPin size={18} style={{ color: '#e11d48', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                          Facility Address
                        </div>
                        <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                          {activeAppointment.blood_bank_address || bookedFacility?.address || 'Address provided upon appointment'}
                          {(activeAppointment.blood_bank_city || bookedFacility?.city)
                            ? `, ${activeAppointment.blood_bank_city || bookedFacility?.city}`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                      <PhoneIcon size={18} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                          Contact Phone
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 700 }}>
                            {activeAppointment.blood_bank_phone || bookedFacility?.phone || 'Available at front desk'}
                          </span>
                          {(activeAppointment.blood_bank_phone || bookedFacility?.phone) && (
                            <a
                              href={`tel:${(activeAppointment.blood_bank_phone || bookedFacility?.phone || '').replace(/\s+/g, '')}`}
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#059669',
                                background: '#dcfce7',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '5px',
                                textDecoration: 'none'
                              }}
                            >
                              Call Facility
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                      <Clock size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                          Operating Hours
                        </div>
                        <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, marginTop: '2px' }}>
                          {bookedFacility?.operating_hours || '08:00 AM - 08:00 PM (All Days)'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                      <Droplet size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                          Donor Blood Group
                        </div>
                        <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 700, marginTop: '2px' }}>
                          {user?.bloodGroup || activeAppointment.blood_group || 'Verified Lifesaver'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Slot Highlights */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1px solid #bbf7d0',
                      borderRadius: '10px',
                      padding: '1rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Your Scheduled Slot
                      </div>
                      <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                        📅 {formatDate(activeAppointment.appointment_date)} &nbsp;&bull;&nbsp; ⏰ {activeAppointment.appointment_time}
                      </div>
                      {activeAppointment.notes && (
                        <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: '0.35rem', fontStyle: 'italic' }}>
                          Note: "{activeAppointment.notes}"
                        </div>
                      )}
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          background: '#ffffff',
                          color: '#15803d',
                          fontWeight: 700,
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #86efac',
                          display: 'inline-block'
                        }}
                      >
                        ✓ Ready for Donation
                      </span>
                    </div>
                  </div>

                  {/* Pre-Visit Checklist */}
                  <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', marginBottom: '0.35rem' }}>
                      💡 Pre-Donation Preparation Guidelines:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span>✓ Drink 500ml of water and stay well hydrated before your slot.</span>
                      <span>✓ Eat a light, nourishing meal 2-3 hours beforehand.</span>
                      <span>✓ Carry your original photo ID (Aadhaar, DL, or Passport).</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFindBloodModal(false);
                        navigate('/appointment-booked', {
                          state: { appointment: activeAppointment }
                        });
                      }}
                      style={{
                        flex: 2,
                        minWidth: '200px',
                        padding: '0.75rem 1.25rem',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <CalendarClock size={18} />
                      <span>View Full Appointment Pass</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this scheduled appointment?')) {
                          handleCancelAppointment(activeAppointment.id);
                        }
                      }}
                      disabled={cancellingId === activeAppointment.id}
                      style={{
                        flex: 1,
                        minWidth: '140px',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        color: '#dc2626',
                        border: '1.5px solid #fca5a5',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: cancellingId === activeAppointment.id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {cancellingId === activeAppointment.id ? 'Cancelling...' : 'Cancel Appointment'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllCentersAnyway(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#475569',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.4rem',
                      textAlign: 'center',
                      textDecoration: 'underline'
                    }}
                  >
                    Browse other donation centers directory &rarr;
                  </button>
                </div>
              </div>
            ) : (
              /* ============================================================ */
              /* DIRECTORY & BOOKING VIEW (STANDARD OR BROWSE ANYWAY)         */
              /* ============================================================ */
              <div>
                <div className="modal-icon-badge modal-icon-red">
                  <MapPin size={28} />
                </div>

                <h3 className="modal-title">Find Donation Centers</h3>
                <p className="modal-desc" style={{ marginBottom: '1.25rem' }}>
                  Locate registered blood banks, hospital donation units, and donation centers in your city. Call directly or choose a center to schedule an appointment.
                </p>

                {/* Back to Booked Details Bar (if viewing directory with active appointment) */}
                {activeAppointment && showAllCentersAnyway && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <CalendarClock size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e40af' }}>
                          Active Appointment: {activeAppointment.blood_bank_name}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: '#3b82f6' }}>
                          📅 {formatDate(activeAppointment.appointment_date)} at {activeAppointment.appointment_time}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllCentersAnyway(false)}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      &larr; Back to My Booked Details
                    </button>
                  </div>
                )}

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
                  value={centerSearchQuery}
                  onChange={(e) => setCenterSearchQuery(e.target.value)}
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
                  onClick={() => {
                    setCenterCityFilter('');
                    setCenterSearchQuery('');
                  }}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid #cbd5e1',
                    background: centerCityFilter === '' && centerSearchQuery === '' ? '#1e293b' : '#f8fafc',
                    color: centerCityFilter === '' && centerSearchQuery === '' ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  All Centers ({allBloodBanks.length || bloodBanks.length})
                </button>
                {user?.city && (
                  <button
                    type="button"
                    onClick={() => {
                      setCenterCityFilter(user.city || '');
                      setCenterSearchQuery('');
                    }}
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
                    onClick={() => {
                      setCenterCityFilter(city);
                      setCenterSearchQuery('');
                    }}
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
                {(centerCityFilter || centerSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCenterCityFilter('');
                      setCenterSearchQuery('');
                    }}
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
                    padding: '2.5rem 1.25rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1.5px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}
                >
                  <AlertCircle size={36} style={{ color: '#94a3b8' }} />
                  <h4 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', margin: 0 }}>
                    No donation centers found
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, maxWidth: '360px', lineHeight: 1.5 }}>
                    {centerCityFilter
                      ? `We couldn't find any registered donation centers in "${centerCityFilter}". Try selecting another city or view all registered centers.`
                      : 'No registered donation centers are available at the moment. Please check back soon.'}
                  </p>
                  {(centerCityFilter || centerSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCenterCityFilter('');
                        setCenterSearchQuery('');
                      }}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.45rem 1.15rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '7px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View All Registered Centers
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {bloodBanks.map((bank) => {
                    const isSelected = selectedBankId === bank.id;
                    const isHospital = bank.type === 'HOSPITAL';
                    const isDonationCenter = bank.type === 'DONATION_CENTER';
                    const isBookedForThisBank = activeAppointment && bank.id === activeAppointment.blood_bank_id;

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
                              <span>{bank.address}{bank.city ? `, ${bank.city}` : ''}</span>
                            </div>
                          </div>

                          {/* Live vs Demo Badge & Center Type Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {bank.source === 'LIVE' ? (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '9999px',
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  border: '1px solid #a7f3d0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                              >
                                <span
                                  style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    display: 'inline-block'
                                  }}
                                />
                                LIVE
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '9999px',
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  border: '1px solid #cbd5e1',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                DEMO
                              </span>
                            )}

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

                          {isBookedForThisBank ? (
                            <button
                              type="button"
                              disabled
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.45rem 1rem',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '7px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'not-allowed',
                                opacity: 0.9
                              }}
                            >
                              <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
                              <span>Appointment Already Booked</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (bank.source === 'DEMO') {
                                  setSelectedBankId(bank.id);
                                  setCenterSelectionError(false);
                                  setSelectionPulse(false);
                                  setBookingError('Note: This is a demonstration center. To book an appointment with our live partner hospitals, please choose a LIVE center (e.g. Neuro Life Blood Bank, Apex Blood Bank, or SIMS Hospital).');
                                  const formEl = document.getElementById('appointment-booking-section');
                                  formEl?.scrollIntoView({ behavior: 'smooth' });
                                  return;
                                }
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
                              <span>
                                {isSelected
                                  ? '✓ Selected for Booking'
                                  : eligibility && !eligibility.isEligible
                                  ? 'Select Center (Booking Restricted)'
                                  : 'Book Appointment'}
                              </span>
                            </button>
                          )}
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
                      <div style={{ fontSize: '0.84rem', color: eligibility.isEligible ? '#166534' : '#78350f', margin: '0.25rem 0 0.65rem' }}>
                        {eligibility.isEligible ? (
                          'You have completed the required recovery period since your previous donation and are fully eligible to donate blood again.'
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong style={{ color: '#b91c1c', fontSize: '0.92rem' }}>
                              You're currently not eligible to donate blood.
                            </strong>
                            <span style={{ color: '#92400e', fontWeight: 700 }}>
                              Next eligible date: {formatDate(eligibility.nextEligibleDate)}
                            </span>
                            <span style={{ color: '#78350f' }}>
                              Please wait until your recovery period is complete. The scheduling UI can still be viewed, but the final booking action must be disabled.
                            </span>
                          </div>
                        )}
                      </div>

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
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', maxWidth: '400px' }}
                          >
                            {(allBloodBanks.length > 0 ? allBloodBanks : bloodBanks).map((bank) => {
                              const isBankBooked = activeAppointment && bank.id === activeAppointment.blood_bank_id;
                              return (
                                <option key={bank.id} value={bank.id} disabled={isBankBooked}>
                                  {bank.name} &bull; {bank.city} {isBankBooked ? '[Already Booked]' : bank.source === 'LIVE' ? '(LIVE)' : '(DEMO)'}
                                </option>
                              );
                            })}
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
                            maxWidth: '440px',
                            margin: '0 auto',
                            borderColor: centerSelectionError ? '#dc2626' : undefined
                          }}
                        >
                          <option value="">-- Choose a Donation Center / Organization --</option>
                          {(allBloodBanks.length > 0 ? allBloodBanks : bloodBanks).map((bank) => {
                            const isBankBooked = activeAppointment && bank.id === activeAppointment.blood_bank_id;
                            return (
                              <option key={bank.id} value={bank.id} disabled={isBankBooked}>
                                {bank.name} &bull; {bank.city} {isBankBooked ? '[Already Booked]' : bank.source === 'LIVE' ? '(LIVE)' : '(DEMO)'}
                              </option>
                            );
                          })}
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

                {(() => {
                  const availableCenters = allBloodBanks.length > 0 ? allBloodBanks : bloodBanks;
                  const selectedBank = availableCenters.find((b) => b.id === selectedBankId);
                  const isHasAnyActiveAppointment = !!activeAppointment;
                  const isSelectedBankDemo = selectedBank?.source === 'DEMO';
                  const isEligibleBlocked = !!(eligibility && !eligibility.isEligible);
                  const isButtonDisabled = isBooking || bloodBanks.length === 0 || isEligibleBlocked || isHasAnyActiveAppointment || isSelectedBankDemo;

                  return (
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isButtonDisabled}
                      style={{
                        marginTop: '0.5rem',
                        width: '100%',
                        backgroundColor: (isEligibleBlocked || isHasAnyActiveAppointment || isSelectedBankDemo) ? '#94a3b8' : undefined,
                        cursor: isButtonDisabled ? 'not-allowed' : undefined,
                        opacity: isButtonDisabled ? 0.75 : undefined
                      }}
                    >
                      {isBooking
                        ? 'Booking...'
                        : isEligibleBlocked
                        ? 'Booking Disabled — Recovery Period Active'
                        : isHasAnyActiveAppointment
                        ? 'You already have an upcoming donation appointment'
                        : isSelectedBankDemo
                        ? 'Select a LIVE Center to Book'
                        : 'Confirm Appointment Booking'}
                    </button>
                  );
                })()}

                {eligibility && !eligibility.isEligible && (
                  <div
                    style={{
                      marginTop: '0.65rem',
                      padding: '0.85rem 1rem',
                      background: '#fff1f2',
                      border: '1.5px solid #fecdd3',
                      borderRadius: '8px',
                      color: '#9f1239',
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}>
                      <AlertCircle size={16} style={{ color: '#e11d48' }} />
                      <span>[Booking Disabled]</span>
                    </div>
                    <span>
                      You can book a new donation appointment after your next eligible date ({formatDate(eligibility.nextEligibleDate)}).
                    </span>
                  </div>
                )}
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
            )}
          </div>
        </div>
      )}

      {/* Modal: "View Donation History" (Shows REAL completed donations only) */}
      {showHistoryModal && (
        <div className="dashboard-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div
            className="dashboard-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px', maxHeight: '88vh', overflowY: 'auto' }}
          >
            <button
              className="modal-close-btn"
              onClick={() => setShowHistoryModal(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="modal-icon-badge modal-icon-red">
              <History size={30} />
            </div>

            <h3 className="modal-title">Donation History</h3>
            <p className="modal-desc" style={{ marginBottom: '0.25rem' }}>
              Official record of your verified completed blood donations.
            </p>

            {completedDonations.length === 0 ? (
              <div
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '14px',
                  padding: '2.5rem 1.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginTop: '0.75rem',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    marginBottom: '0.25rem'
                  }}
                >
                  🩸
                </div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  No donation history yet
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                  You haven&apos;t completed a blood donation yet.
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Book an appointment to make your first donation.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setShowFindBloodModal(true);
                  }}
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.6rem 1.4rem',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Find Donation Centers
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', textAlign: 'left', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Completed Donations ({completedDonations.length})
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                    Verified Records
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {completedDonations.map((don) => {
                    const org =
                      allBloodBanks.find((b) => b.id === don.blood_bank_id) ||
                      bloodBanks.find((b) => b.id === don.blood_bank_id);
                    const orgName = org?.name || don.blood_bank_name || 'Certified Blood Bank';
                    const isHospital = org?.type === 'HOSPITAL' || orgName.toLowerCase().includes('hospital');
                    const orgAddress = org?.address
                      ? (org?.city && !org.address.toLowerCase().includes(org.city.toLowerCase())
                          ? `${org.address}, ${org.city}`
                          : org.address)
                      : (don.blood_bank_city || org?.city || '');

                    return (
                      <div
                        key={don.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1.1rem 1.25rem',
                          boxShadow: '0 2px 5px rgba(15, 23, 42, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.7rem'
                        }}
                      >
                        {/* Header: Blood Group & Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '0.92rem'
                              }}
                            >
                              🩸 {don.blood_group}
                            </span>
                            {don.quantity_ml && (
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                                {don.quantity_ml} ml
                              </span>
                            )}
                          </div>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '0.22rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}
                          >
                            <CheckCircle2 size={13} />
                            Completed
                          </span>
                        </div>

                        {/* Recipient Organization / Donated at */}
                        <div>
                          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                            Donated at
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
                              {orgName}
                            </span>
                            {isHospital ? (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Hospital size={11} /> Hospital
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: '#fee2e2',
                                  color: '#991b1b',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Building2 size={11} /> Blood Bank
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location & Donation Date */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', fontSize: '0.83rem', color: '#475569' }}>
                          {orgAddress && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <MapPin size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                              <span>{orgAddress}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                            <span>Donation Date: <strong>{formatDate(don.donation_date)}</strong></span>
                          </div>
                          {don.id && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                              <span>Ref: #{don.id.substring(0, 8).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="modal-actions-dual" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setShowHistoryModal(false);
                  setShowFindBloodModal(true);
                }}
              >
                Find Donation Centers
              </button>
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
    </div>
  );
};

export default Dashboard;
