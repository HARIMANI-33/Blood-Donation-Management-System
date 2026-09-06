import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Droplet,
  ArrowLeft,
  Copy,
  Check,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  Phone,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchDonorAppointments } from '../services/donor.service';

interface LocationStateAppointment {
  id?: string;
  organizationId?: string;
  bloodBankId?: string;
  blood_bank_id?: string;
  organizationName?: string;
  bloodBankName?: string;
  blood_bank_name?: string;
  bloodBankAddress?: string;
  blood_bank_address?: string;
  bloodBankCity?: string;
  blood_bank_city?: string;
  bloodBankPhone?: string;
  blood_bank_phone?: string;
  blood_bank_operating_hours?: string | null;
  appointmentDate?: string;
  appointment_date?: string;
  appointmentTime?: string;
  appointment_time?: string;
  bloodGroup?: string | null;
  blood_group?: string | null;
  status?: string;
  notes?: string | null;
}

const AppointmentBookedPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [appointment, setAppointment] = useState<LocationStateAppointment | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    // 1. Check navigation state from direct booking
    const stateApp = (location.state as { appointment?: LocationStateAppointment })?.appointment;
    if (stateApp) {
      setAppointment({
        ...stateApp,
        appointmentDate: stateApp.appointment_date || stateApp.appointmentDate,
        appointmentTime: stateApp.appointment_time || stateApp.appointmentTime,
        bloodBankName: stateApp.blood_bank_name || stateApp.bloodBankName || stateApp.organizationName,
        bloodBankAddress: stateApp.blood_bank_address || stateApp.bloodBankAddress,
        bloodBankCity: stateApp.blood_bank_city || stateApp.bloodBankCity,
        bloodBankPhone: stateApp.blood_bank_phone || stateApp.bloodBankPhone,
        bloodGroup: stateApp.blood_group || stateApp.bloodGroup || user?.bloodGroup
      });
      return;
    }

    // 2. Fetch donor's actual active upcoming appointment from server (One Source of Truth)
    if (token) {
      fetchDonorAppointments(token)
        .then((res) => {
          const apps = res.data?.appointments || [];
          if (apps.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const active =
              apps
                .filter(
                  (a) =>
                    (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
                    (!a.appointment_date || a.appointment_date >= todayStr)
                )
                .sort(
                  (a, b) =>
                    (a.appointment_date || '').localeCompare(b.appointment_date || '') ||
                    (a.appointment_time || '').localeCompare(b.appointment_time || '')
                )[0] || apps[0];

            if (active) {
              setAppointment({
                id: active.id,
                organizationId: active.blood_bank_id,
                bloodBankId: active.blood_bank_id,
                organizationName: active.blood_bank_name,
                bloodBankName: active.blood_bank_name,
                bloodBankAddress: active.blood_bank_address,
                bloodBankCity: active.blood_bank_city,
                bloodBankPhone: active.blood_bank_phone,
                blood_bank_operating_hours: active.blood_bank_operating_hours,
                appointmentDate: active.appointment_date,
                appointmentTime: active.appointment_time,
                bloodGroup: active.blood_group || user?.bloodGroup,
                status: active.status,
                notes: active.notes
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [location.state, token, user?.bloodGroup]);

  // Format date helper: "15 September 2026"
  const formatFriendlyDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Date not specified';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Appointment display ID helper
  const rawId = appointment?.id || '';
  const displayId = rawId
    ? rawId.startsWith('LF-')
      ? rawId
      : `LF-${rawId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
    : 'LF-PENDING';

  const handleCopyId = () => {
    if (displayId) {
      navigator.clipboard.writeText(rawId || displayId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  // Center display info
  const centerName =
    appointment?.organizationName ||
    appointment?.bloodBankName ||
    appointment?.blood_bank_name ||
    'Selected Blood Bank / Donation Center';

  const centerAddress =
    appointment?.bloodBankAddress && appointment?.bloodBankCity
      ? `${appointment.bloodBankAddress}, ${appointment.bloodBankCity}`
      : appointment?.bloodBankAddress ||
        appointment?.blood_bank_address ||
        appointment?.bloodBankCity ||
        appointment?.blood_bank_city ||
        'Address provided upon arrival';

  const centerPhone = appointment?.bloodBankPhone || appointment?.blood_bank_phone;

  const bloodGroup =
    appointment?.bloodGroup ||
    appointment?.blood_group ||
    user?.bloodGroup ||
    'Registered Donor Blood Group';

  const appointmentDateFormatted = formatFriendlyDate(
    appointment?.appointmentDate || appointment?.appointment_date
  );
  const appointmentTimeFormatted =
    appointment?.appointmentTime || appointment?.appointment_time || 'Selected Time Slot';
  const status = appointment?.status || 'PENDING';

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 72px)',
        backgroundColor: '#f8fafc',
        padding: '2.5rem 1rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{ maxWidth: '680px', width: '100%' }}>
        {/* Top return link */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--primary-600)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#64748b')}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* Main Confirmation Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden'
          }}
        >
          {/* Header with Visual Confirmation Animation */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderBottom: '1px solid #bbf7d0',
              padding: '2.5rem 1.5rem 2rem',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            {/* Animated Success Badge Icon */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: '#16a34a',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 10px rgba(22, 163, 74, 0.15), 0 8px 16px rgba(22, 163, 74, 0.25)',
                marginBottom: '1.25rem',
                animation: 'scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <CheckCircle2 size={44} strokeWidth={2.5} />
            </div>

            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#14532d',
                margin: '0 0 0.5rem',
                letterSpacing: '-0.02em'
              }}
            >
              ✓ Appointment Confirmed
            </h1>
            <p
              style={{
                fontSize: '1.02rem',
                color: '#166534',
                margin: 0,
                fontWeight: 500
              }}
            >
              Your blood donation appointment has been booked successfully.
            </p>
          </div>

          {/* Body Section */}
          <div style={{ padding: '2rem 1.75rem' }}>
            {/* Reference ID Strip */}
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '0.9rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '1.75rem'
              }}
            >
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    letterSpacing: '0.5px'
                  }}
                >
                  Appointment Reference ID
                </span>
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '1px'
                  }}
                >
                  {displayId}
                </span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Keep this appointment ID for your reference.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: copiedId ? '#16a34a' : '#ffffff',
                  color: copiedId ? '#ffffff' : '#334155',
                  border: copiedId ? '1px solid #16a34a' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {copiedId ? <Check size={14} /> : <Copy size={14} />}
                {copiedId ? 'Copied' : 'Copy ID'}
              </button>
            </div>

            {/* Appointment Details Card */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.75rem',
                background: '#ffffff'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '0.85rem',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck size={18} style={{ color: 'var(--primary-600)' }} />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Appointment Details
                  </h2>
                </div>

                {/* Real Database Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                      background: status === 'CONFIRMED' ? '#dcfce7' : status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                      color: status === 'CONFIRMED' ? '#15803d' : status === 'REJECTED' ? '#b91c1c' : '#b45309',
                      border: status === 'CONFIRMED' ? '1px solid #86efac' : status === 'REJECTED' ? '1px solid #fca5a5' : '1px solid #fde68a'
                    }}
                  >
                    <Clock size={12} />
                    {status}
                  </span>
                </div>
              </div>

              {/* Grid of details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.25rem'
                }}
              >
                {/* 1. Donation Center */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Donation Center
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <Building2 size={16} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '3px' }} />
                    <strong style={{ fontSize: '0.98rem', color: '#0f172a', lineHeight: 1.3 }}>
                      {centerName}
                    </strong>
                  </div>
                </div>

                {/* 2. Address */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Address
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <MapPin size={16} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.3 }}>
                      {centerAddress}
                    </span>
                  </div>
                  {centerPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.84rem', color: '#16a34a' }}>
                      <Phone size={13} />
                      <span>{centerPhone}</span>
                    </div>
                  )}
                </div>

                {/* 3. Blood Group */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Blood Group
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Droplet size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                    <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                      {bloodGroup}
                    </strong>
                  </div>
                </div>

                {/* 4. Date */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Date
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                    <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                      {appointmentDateFormatted}
                    </strong>
                  </div>
                </div>

                {/* 5. Time */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Time
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                    <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                      {appointmentTimeFormatted}
                    </strong>
                  </div>
                </div>

                {/* 6. Current Status */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Status
                  </span>
                  <strong style={{ fontSize: '0.98rem', color: status === 'CONFIRMED' ? '#15803d' : '#b45309' }}>
                    {status}
                  </strong>
                </div>
              </div>

              {/* Status Explanation Note */}
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  fontSize: '0.84rem',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}
              >
                <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Your appointment is currently <strong>PENDING</strong> review by the donation center. Once verified by their medical team, its status will update to <strong>CONFIRMED</strong>.
                </span>
              </div>
            </div>

            {/* Preparation Tips */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '2rem'
              }}
            >
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', margin: '0 0 0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={16} style={{ color: '#16a34a' }} />
                Donation Day Guidelines
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
                <li>Drink 500ml of water or healthy fluids prior to your appointment.</li>
                <li>Eat a nutritious meal 2 to 3 hours before donation; avoid fatty foods.</li>
                <li>Bring a government-issued photo ID or your LifeFlow donor digital badge.</li>
                <li>Wear comfortable clothing with sleeves that can be easily rolled up.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  background: 'var(--primary-600)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--primary-700)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--primary-600)')}
              >
                <CalendarDays size={18} />
                View My Appointments
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#334155',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                  (e.currentTarget as HTMLElement).style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#ffffff';
                  (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                }}
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBookedPage;
