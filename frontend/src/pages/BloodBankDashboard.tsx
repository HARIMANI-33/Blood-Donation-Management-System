import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Droplet,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Minus,
  Edit3,
  Check,
  Search,
  Inbox,
  Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  getBloodBankProfile,
  updateBloodBankProfile,
  getBloodBankInventory,
  updateBloodBankInventory,
  getBloodBankAppointments,
  approveAppointment,
  rejectAppointment,
  completeDonation,
  getIncomingBloodRequests,
  acceptBloodRequest,
  rejectBloodRequest,
  fulfillBloodRequest
} from '../services/bloodBank.service';
import type {
  BloodBankProfile,
  BloodInventoryItem,
  BloodBankAppointment,
  IncomingHospitalBloodRequest
} from '../types/bloodBank';
import type { BloodGroup } from '../types/auth';

const ALL_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BloodBankDashboard = () => {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'inventory' | 'appointments' | 'requests' | 'profile' | 'search'>('inventory');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'inventory' || tabParam === 'appointments' || tabParam === 'requests' || tabParam === 'hospital-requests' || tabParam === 'profile' || tabParam === 'search') {
      setActiveTab(tabParam === 'hospital-requests' ? 'requests' : (tabParam as 'inventory' | 'appointments' | 'requests' | 'profile' | 'search'));
    }
  }, [searchParams]);

  // Data States
  const [profile, setProfile] = useState<BloodBankProfile | null>(null);
  const [inventory, setInventory] = useState<BloodInventoryItem[]>([]);
  const [appointments, setAppointments] = useState<BloodBankAppointment[]>([]);
  const [hospitalRequests, setHospitalRequests] = useState<IncomingHospitalBloodRequest[]>([]);

  // UI / Action States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Appointment filter
  const [appointmentFilter, setAppointmentFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Hospital Request filter & loading
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'FULFILLED' | 'REJECTED_OR_CANCELLED'>('ALL');
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);

  // Inventory Quick Edit Modal / Popover
  const [editingGroup, setEditingGroup] = useState<BloodGroup | null>(null);
  const [editQuantityVal, setEditQuantityVal] = useState<number>(0);
  const [inventoryUpdating, setInventoryUpdating] = useState<string | null>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileHours, setProfileHours] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Public Search Test Simulator
  const [searchCity, setSearchCity] = useState('Chennai');
  const [searchGroup, setSearchGroup] = useState<BloodGroup>('O+');
  const [searchQty, setSearchQty] = useState<number>(5);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const loadAllData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [profRes, invRes, apptsRes, reqsRes] = await Promise.all([
        getBloodBankProfile(token),
        getBloodBankInventory(token),
        getBloodBankAppointments(token),
        getIncomingBloodRequests(token).catch(() => null)
      ]);

      if (profRes.data?.profile) {
        setProfile(profRes.data.profile);
        setProfileName(profRes.data.profile.organizationName || profRes.data.profile.name);
        setProfilePhone(profRes.data.profile.phone || '');
        setProfileCity(profRes.data.profile.city || '');
        setProfileAddress(profRes.data.profile.fullAddress || profRes.data.profile.address);
        setProfileHours(profRes.data.profile.openingHours || profRes.data.profile.operatingHours || '');
      }

      if (invRes.data?.inventory) {
        setInventory(invRes.data.inventory);
      }

      if (apptsRes.data?.appointments) {
        setAppointments(apptsRes.data.appointments);
      }

      if (reqsRes?.data?.requests) {
        setHospitalRequests(reqsRes.data.requests);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load blood bank data';
      showNotification('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Inventory Controls
  const handleQuantityDelta = async (group: BloodGroup, delta: number) => {
    if (!token) return;
    const current = inventory.find((i) => i.bloodGroup === group)?.quantity ?? 0;
    const nextVal = Math.max(0, current + delta);

    try {
      setInventoryUpdating(group);
      const res = await updateBankInventory(group, nextVal);
      if (res) {
        setInventory((prev) =>
          prev.map((item) => (item.bloodGroup === group ? { ...item, quantity: nextVal } : item))
        );
        showNotification('success', `Stock for ${group} updated to ${nextVal} units`);
      }
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setInventoryUpdating(null);
    }
  };

  const updateBankInventory = async (group: BloodGroup, quantity: number) => {
    if (!token) return null;
    return await updateBloodBankInventory(group, quantity, token);
  };

  const handleSaveModalQuantity = async () => {
    if (!editingGroup || !token) return;
    if (editQuantityVal < 0 || isNaN(editQuantityVal)) {
      showNotification('error', 'Quantity cannot be negative');
      return;
    }

    try {
      setInventoryUpdating(editingGroup);
      await updateBankInventory(editingGroup, editQuantityVal);
      setInventory((prev) =>
        prev.map((item) => (item.bloodGroup === editingGroup ? { ...item, quantity: editQuantityVal } : item))
      );
      showNotification('success', `Stock for ${editingGroup} updated to ${editQuantityVal} units`);
      setEditingGroup(null);
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setInventoryUpdating(null);
    }
  };

  // Appointment Actions
  const handleApprove = async (appointmentId: string) => {
    if (!token) return;
    try {
      setActionLoadingId(appointmentId);
      await approveAppointment(appointmentId, token);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: 'CONFIRMED' } : a))
      );
      showNotification('success', 'Appointment confirmed! Stock will increase once donation is completed.');
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to approve appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (appointmentId: string) => {
    if (!token) return;
    try {
      setActionLoadingId(appointmentId);
      await rejectAppointment(appointmentId, token);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: 'REJECTED' } : a))
      );
      showNotification('success', 'Appointment marked as Rejected.');
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to reject appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteDonation = async (appointmentId: string, donorBloodGroup: BloodGroup | null) => {
    if (!token) return;
    try {
      setActionLoadingId(appointmentId);
      const res = await completeDonation(appointmentId, token, 450, 1);

      // Update appointment status in state
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: 'COMPLETED' } : a))
      );

      // Update inventory in state immediately
      if (donorBloodGroup && res.data?.updatedInventory) {
        setInventory((prev) =>
          prev.map((item) =>
            item.bloodGroup === donorBloodGroup
              ? { ...item, quantity: res.data.updatedInventory.newQuantity }
              : item
          )
        );
        showNotification(
          'success',
          `Donation completed! +1 unit added to ${donorBloodGroup} inventory (Now: ${res.data.updatedInventory.newQuantity} units).`
        );
      } else {
        showNotification('success', 'Donation successfully recorded as COMPLETED.');
        loadAllData();
      }
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to complete donation');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setProfileSaving(true);
      const res = await updateBloodBankProfile(
        {
          organizationName: profileName,
          phone: profilePhone,
          city: profileCity,
          fullAddress: profileAddress,
          openingHours: profileHours
        },
        token
      );

      if (res.data?.profile) {
        setProfile(res.data.profile);
        showNotification('success', 'Organization profile updated successfully.');
      }
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Hospital Request Handlers
  const handleAcceptHospitalRequest = async (requestId: string) => {
    if (!token) return;
    try {
      setRequestActionLoadingId(requestId);
      const res = await acceptBloodRequest(requestId, token);
      if (res.data?.request) {
        setHospitalRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'ACCEPTED' } : r))
        );
        showNotification('success', 'Hospital blood request accepted successfully.');
      }
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleRejectHospitalRequest = async (requestId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to decline this hospital blood request?')) {
      return;
    }
    try {
      setRequestActionLoadingId(requestId);
      const res = await rejectBloodRequest(requestId, token);
      if (res.data?.request) {
        setHospitalRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'REJECTED' } : r))
        );
        showNotification('success', 'Hospital blood request declined.');
      }
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleFulfillHospitalRequest = async (requestId: string, bloodGroup: string, quantity: number) => {
    if (!token) return;
    if (!window.confirm(`Fulfill blood request for ${quantity} units of ${bloodGroup}? This will immediately deduct ${quantity} units from inventory.`)) {
      return;
    }
    try {
      setRequestActionLoadingId(requestId);
      const res = await fulfillBloodRequest(requestId, token);
      if (res.data?.request) {
        setHospitalRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'FULFILLED' } : r))
        );
        // Live reload inventory so numbers decrement on screen immediately
        const invRes = await getBloodBankInventory(token);
        if (invRes.data?.inventory) {
          setInventory(invRes.data.inventory);
        }
        showNotification('success', `Blood request fulfilled! Deducted ${quantity} units of ${bloodGroup} from stock.`);
      }
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to fulfill request');
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  // Computed Totals
  const totalUnits = inventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING');
  const confirmedAppointments = appointments.filter((a) => a.status === 'CONFIRMED');
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');
  const pendingHospitalRequests = hospitalRequests.filter((r) => r.status === 'PENDING');

  // Filtered Appointments
  const displayedAppointments = appointments.filter((a) => {
    if (appointmentFilter === 'ALL') return true;
    return a.status === appointmentFilter;
  });

  // Filtered Hospital Requests
  const displayedHospitalRequests = hospitalRequests.filter((r) => {
    if (requestFilter === 'ALL') return true;
    if (requestFilter === 'PENDING') return r.status === 'PENDING';
    if (requestFilter === 'ACCEPTED') return r.status === 'ACCEPTED';
    if (requestFilter === 'FULFILLED') return r.status === 'FULFILLED';
    if (requestFilter === 'REJECTED_OR_CANCELLED') {
      return r.status === 'REJECTED' || r.status === 'CANCELLED';
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary-600)', margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', color: 'var(--neutral-600)' }}>Loading Blood Bank Portal...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Notification Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{statusMessage.text}</span>
        </div>
      )}

      {/* Header Organization Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 60%, #e11d48 100%)',
          color: 'white',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)',
          marginBottom: '1.75rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}
              >
                CERTIFIED BLOOD BANK FACILITY
              </span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0.2rem 0 0.5rem' }}>
              {profile?.organizationName || profile?.name || user?.name}
            </h1>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.88rem', opacity: 0.95 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={15} /> {profile?.city || user?.city || 'Chennai'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={15} /> {profile?.openingHours || '08:00 AM - 08:00 PM'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={15} /> {profile?.phone || 'Contact Available'}
              </span>
            </div>
          </div>

          <button
            onClick={loadAllData}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              backdropFilter: 'blur(4px)'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div className="feature-card" style={{ padding: '1.25rem 1.5rem', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 600 }}>TOTAL UNITS IN STOCK</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
              <Droplet size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-900)', marginTop: '0.5rem' }}>
            {totalUnits} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--neutral-500)' }}>units</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--success-600)', fontWeight: 500 }}>
            Across all 8 blood groups
          </span>
        </div>

        <div className="feature-card" style={{ padding: '1.25rem 1.5rem', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 600 }}>PENDING REVIEWS</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#fef3c7', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-900)', marginTop: '0.5rem' }}>
            {pendingAppointments.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: pendingAppointments.length > 0 ? '#d97706' : 'var(--neutral-500)', fontWeight: 500 }}>
            {pendingAppointments.length > 0 ? 'Awaiting blood bank approval' : 'No pending reviews'}
          </span>
        </div>

        <div className="feature-card" style={{ padding: '1.25rem 1.5rem', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 600 }}>CONFIRMED VISITS</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#dbeafe', color: '#2563eb' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-900)', marginTop: '0.5rem' }}>
            {confirmedAppointments.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 500 }}>
            Scheduled donor arrivals
          </span>
        </div>

        <div className="feature-card" style={{ padding: '1.25rem 1.5rem', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 600 }}>COMPLETED DONATIONS</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--success-100)', color: 'var(--success-600)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-900)', marginTop: '0.5rem' }}>
            {completedAppointments.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--success-600)', fontWeight: 500 }}>
            Credited directly to stock
          </span>
        </div>

        <div className="feature-card" style={{ padding: '1.25rem 1.5rem', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 600 }}>HOSPITAL REQUESTS</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#ede9fe', color: '#7c3aed' }}>
              <Inbox size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-900)', marginTop: '0.5rem' }}>
            {pendingHospitalRequests.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: pendingHospitalRequests.length > 0 ? '#dc2626' : 'var(--neutral-500)', fontWeight: 500 }}>
            {pendingHospitalRequests.length > 0 ? `${pendingHospitalRequests.length} awaiting response` : 'No pending demands'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--neutral-200)',
          marginBottom: '1.75rem',
          gap: '0.5rem',
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '0.8rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'inventory' ? '3px solid var(--primary-600)' : '3px solid transparent',
            color: activeTab === 'inventory' ? 'var(--primary-600)' : 'var(--neutral-600)',
            fontWeight: activeTab === 'inventory' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.92rem'
          }}
          id="tab-inventory"
        >
          <Droplet size={17} />
          <span>Blood Inventory (8 Groups)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          style={{
            padding: '0.8rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'appointments' ? '3px solid var(--primary-600)' : '3px solid transparent',
            color: activeTab === 'appointments' ? 'var(--primary-600)' : 'var(--neutral-600)',
            fontWeight: activeTab === 'appointments' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.92rem'
          }}
          id="tab-appointments"
        >
          <Calendar size={17} />
          <span>Donor Appointments</span>
          {pendingAppointments.length > 0 && (
            <span
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                borderRadius: '12px',
                padding: '0.1rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {pendingAppointments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '0.8rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'requests' ? '3px solid var(--primary-600)' : '3px solid transparent',
            color: activeTab === 'requests' ? 'var(--primary-600)' : 'var(--neutral-600)',
            fontWeight: activeTab === 'requests' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.92rem'
          }}
          id="tab-hospital-requests"
        >
          <Inbox size={17} />
          <span>Hospital Blood Requests</span>
          {pendingHospitalRequests.length > 0 && (
            <span
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                borderRadius: '12px',
                padding: '0.1rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {pendingHospitalRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '0.8rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '3px solid var(--primary-600)' : '3px solid transparent',
            color: activeTab === 'profile' ? 'var(--primary-600)' : 'var(--neutral-600)',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.92rem'
          }}
          id="tab-profile"
        >
          <Building2 size={17} />
          <span>Organization Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          style={{
            padding: '0.8rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'search' ? '3px solid var(--primary-600)' : '3px solid transparent',
            color: activeTab === 'search' ? 'var(--primary-600)' : 'var(--neutral-600)',
            fontWeight: activeTab === 'search' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.92rem'
          }}
          id="tab-search"
        >
          <Search size={17} />
          <span>Live Availability Search Simulator</span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: BLOOD INVENTORY MANAGEMENT
          ========================================================= */}
      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>
                Real-Time Blood Stock Levels
              </h2>
              <p style={{ color: 'var(--neutral-500)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
                Manage units for each blood group. Stock updates automatically when donation appointments are marked completed.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                Critical (&lt; 5)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#d97706' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                Moderate (5-15)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                Sufficient (&gt; 15)
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {ALL_BLOOD_GROUPS.map((bg) => {
              const item = inventory.find((i) => i.bloodGroup === bg);
              const qty = item?.quantity ?? 0;
              const isUpdating = inventoryUpdating === bg;

              let statusColor = '#16a34a';
              let statusBg = '#dcfce7';
              let statusLabel = 'Sufficient';
              if (qty < 5) {
                statusColor = '#dc2626';
                statusBg = '#fee2e2';
                statusLabel = 'Critical Shortage';
              } else if (qty <= 15) {
                statusColor = '#d97706';
                statusBg = '#fef3c7';
                statusLabel = 'Moderate Stock';
              }

              return (
                <div
                  key={bg}
                  className="feature-card"
                  style={{
                    padding: '1.25rem',
                    margin: 0,
                    border: '1px solid var(--neutral-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-100)',
                          color: 'var(--primary-700)',
                          fontWeight: 800,
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {bg}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>Blood Group {bg}</div>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: statusBg,
                            color: statusColor,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '10px',
                            marginTop: '0.15rem'
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(bg);
                        setEditQuantityVal(qty);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--neutral-500)',
                        padding: '0.2rem'
                      }}
                      title="Direct edit quantity"
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>

                  <div style={{ margin: '1.5rem 0 1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--neutral-900)', lineHeight: 1 }}>
                      {qty}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                      Available Units
                    </span>
                  </div>

                  {/* Inline Quick +/- Increment/Decrement Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={qty <= 0 || isUpdating}
                      onClick={() => handleQuantityDelta(bg, -1)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--neutral-300)',
                        background: 'var(--neutral-100)',
                        color: qty <= 0 ? 'var(--neutral-400)' : 'var(--neutral-800)',
                        cursor: qty <= 0 || isUpdating ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      <Minus size={14} /> 1 Unit
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleQuantityDelta(bg, 1)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--primary-300)',
                        background: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      <Plus size={14} /> 1 Unit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Quantity Modal */}
          {editingGroup && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
              }}
            >
              <div
                className="feature-card"
                style={{
                  maxWidth: '380px',
                  width: '100%',
                  padding: '1.75rem',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-xl)',
                  position: 'relative'
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                  Update Stock: {editingGroup}
                </h3>
                <p style={{ color: 'var(--neutral-600)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  Specify the current physical inventory units for blood group {editingGroup}.
                </p>

                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '1rem' }}>
                  Quantity (Units)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editQuantityVal}
                    onChange={(e) => setEditQuantityVal(parseInt(e.target.value, 10) || 0)}
                    className="form-input"
                    style={{ marginTop: '0.35rem', fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </label>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setEditingGroup(null)}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--neutral-300)',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      fontWeight: 500
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModalQuantity}
                    className="btn-primary"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}
                  >
                    Save Stock
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: DONOR APPOINTMENTS MANAGEMENT
          ========================================================= */}
      {activeTab === 'appointments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>
                Donor Appointments
              </h2>
              <p style={{ color: 'var(--neutral-500)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
                Review incoming donor requests, approve appointments, and record completed donations.
              </p>
            </div>

            {/* Status Filter Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED'] as const).map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setAppointmentFilter(status)}
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.8rem',
                    borderRadius: '20px',
                    border: appointmentFilter === status ? '1px solid var(--primary-600)' : '1px solid var(--neutral-300)',
                    background: appointmentFilter === status ? 'var(--primary-600)' : 'white',
                    color: appointmentFilter === status ? 'white' : 'var(--neutral-700)',
                    fontWeight: appointmentFilter === status ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {status === 'ALL' ? 'All Appointments' : status}
                </button>
              ))}
            </div>
          </div>

          {displayedAppointments.length === 0 ? (
            <div
              className="feature-card"
              style={{ padding: '3rem 1.5rem', textAlign: 'center', margin: 0, color: 'var(--neutral-500)' }}
            >
              <Calendar size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--neutral-700)' }}>
                No appointments found for filter "{appointmentFilter}"
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                When donors schedule donation appointments with your facility, they will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displayedAppointments.map((appt) => {
                const isLoading = actionLoadingId === appt.id;

                let badgeBg = '#fef3c7';
                let badgeColor = '#b45309';
                if (appt.status === 'CONFIRMED') {
                  badgeBg = '#dbeafe';
                  badgeColor = '#1d4ed8';
                } else if (appt.status === 'COMPLETED') {
                  badgeBg = '#dcfce7';
                  badgeColor = '#15803d';
                } else if (appt.status === 'REJECTED' || appt.status === 'CANCELLED') {
                  badgeBg = '#fee2e2';
                  badgeColor = '#b91c1c';
                }

                return (
                  <div
                    key={appt.id}
                    className="feature-card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      margin: 0,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1.25rem',
                      border: '1px solid var(--neutral-200)',
                      borderLeft: `5px solid ${badgeColor}`
                    }}
                  >
                    {/* Donor Details */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-100)',
                          color: 'var(--primary-700)',
                          fontWeight: 800,
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {appt.donorBloodGroup || 'O+'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
                            {appt.donorName}
                          </span>
                          <span
                            style={{
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '12px'
                            }}
                          >
                            {appt.status}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '1rem',
                            flexWrap: 'wrap',
                            fontSize: '0.83rem',
                            color: 'var(--neutral-600)',
                            marginTop: '0.25rem'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={13} /> {appt.appointmentDate}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={13} /> {appt.appointmentTime}
                          </span>
                          {appt.donorCity && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <MapPin size={13} /> {appt.donorCity}
                            </span>
                          )}
                          {appt.donorPhone && (
                            <a
                              href={`tel:${appt.donorPhone}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-600)' }}
                            >
                              <Phone size={13} /> {appt.donorPhone}
                            </a>
                          )}
                        </div>

                        {appt.notes && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                            "{appt.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {appt.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleApprove(appt.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#16a34a',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.83rem',
                              cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            id={`btn-approve-${appt.id}`}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleReject(appt.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              border: '1px solid #fca5a5',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontWeight: 600,
                              fontSize: '0.83rem',
                              cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            id={`btn-reject-${appt.id}`}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}

                      {appt.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleCompleteDonation(appt.id, appt.donorBloodGroup)}
                          className="btn-primary"
                          style={{
                            padding: '0.55rem 1.1rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: 'var(--shadow-md)'
                          }}
                          id={`btn-complete-${appt.id}`}
                        >
                          <Check size={16} />
                          <span>{isLoading ? 'Crediting Stock...' : 'Mark Donation as Completed'}</span>
                        </button>
                      )}

                      {appt.status === 'COMPLETED' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#15803d',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          <CheckCircle2 size={16} /> Credited to Stock
                        </div>
                      )}

                      {appt.status === 'REJECTED' && (
                        <span style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: 500 }}>
                          Declined
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: INCOMING HOSPITAL BLOOD REQUESTS
          ========================================================= */}
      {activeTab === 'requests' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>
                Incoming Hospital Blood Requests
              </h2>
              <p style={{ color: 'var(--neutral-500)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
                Review blood demand orders submitted by registered hospitals, approve requests, and fulfill stock.
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(
                [
                  { key: 'ALL', label: 'All Requests' },
                  { key: 'PENDING', label: 'Pending Approval' },
                  { key: 'ACCEPTED', label: 'Accepted' },
                  { key: 'FULFILLED', label: 'Fulfilled' },
                  { key: 'REJECTED_OR_CANCELLED', label: 'Declined / Cancelled' }
                ] as const
              ).map((f) => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setRequestFilter(f.key)}
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.8rem',
                    borderRadius: '20px',
                    border: requestFilter === f.key ? '1px solid var(--primary-600)' : '1px solid var(--neutral-300)',
                    background: requestFilter === f.key ? 'var(--primary-600)' : 'white',
                    color: requestFilter === f.key ? 'white' : 'var(--neutral-700)',
                    fontWeight: requestFilter === f.key ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {displayedHospitalRequests.length === 0 ? (
            <div
              className="feature-card"
              style={{ padding: '3rem 1.5rem', textAlign: 'center', margin: 0, color: 'var(--neutral-500)' }}
            >
              <Inbox size={44} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--neutral-700)' }}>
                No hospital blood requests found
              </p>
              <p style={{ fontSize: '0.85rem', maxWidth: '460px', margin: '0.4rem auto 0' }}>
                When hospitals in your region search and request blood from your facility, their orders will appear here for review and fulfillment.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {displayedHospitalRequests.map((req) => {
                const isLoading = requestActionLoadingId === req.id;
                const bloodGrp = req.blood_group || req.bloodGroup;
                const availableStock = inventory.find((i) => i.bloodGroup === bloodGrp)?.quantity ?? 0;
                const canFulfillStock = availableStock >= req.quantity;

                // Urgency style
                let urgBg = '#e0f2fe';
                let urgColor = '#0369a1';
                const urgUpper = (req.urgency || '').toUpperCase();
                if (urgUpper === 'CRITICAL' || urgUpper === 'URGENT') {
                  urgBg = '#fee2e2';
                  urgColor = '#b91c1c';
                } else if (urgUpper === 'HIGH') {
                  urgBg = '#ffedd5';
                  urgColor = '#c2410c';
                } else if (urgUpper === 'MEDIUM') {
                  urgBg = '#fef3c7';
                  urgColor = '#b45309';
                }

                // Status style
                let statusBg = '#fef3c7';
                let statusColor = '#b45309';
                let statusBorder = '#d97706';
                if (req.status === 'ACCEPTED') {
                  statusBg = '#dbeafe';
                  statusColor = '#1d4ed8';
                  statusBorder = '#2563eb';
                } else if (req.status === 'FULFILLED') {
                  statusBg = '#dcfce7';
                  statusColor = '#15803d';
                  statusBorder = '#16a34a';
                } else if (req.status === 'REJECTED' || req.status === 'CANCELLED') {
                  statusBg = '#fee2e2';
                  statusColor = '#b91c1c';
                  statusBorder = '#dc2626';
                }

                return (
                  <div
                    key={req.id}
                    className="feature-card"
                    style={{
                      padding: '1.5rem',
                      margin: 0,
                      border: '1px solid var(--neutral-200)',
                      borderLeft: `5px solid ${statusBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                    id={`hospital-request-${req.id}`}
                  >
                    {/* Header: Hospital Name & Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neutral-900)' }}>
                            {req.hospital_name || req.hospitalName || 'Hospital'}
                          </span>
                          <span
                            style={{
                              backgroundColor: urgBg,
                              color: urgColor,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            {(urgUpper === 'CRITICAL' || urgUpper === 'URGENT') && <Activity size={12} />}
                            {req.urgency} PRIORITY
                          </span>
                          <span
                            style={{
                              backgroundColor: statusBg,
                              color: statusColor,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '12px'
                            }}
                          >
                            {req.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.84rem', color: 'var(--neutral-500)', marginTop: '0.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          {(req.hospital_city) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={13} /> {req.hospital_city} {req.hospital_address ? `(${req.hospital_address})` : ''}
                            </span>
                          )}
                          {req.hospital_phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={13} /> {req.hospital_phone}
                            </span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={13} /> {new Date(req.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Stock Check Indicator */}
                      <div
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: canFulfillStock ? '#f0fdf4' : '#fffbeb',
                          border: `1px solid ${canFulfillStock ? '#bbf7d0' : '#fef3c7'}`,
                          fontSize: '0.8rem',
                          textAlign: 'right'
                        }}
                      >
                        <span style={{ color: 'var(--neutral-500)', fontSize: '0.75rem', display: 'block' }}>Current Stock</span>
                        <strong style={{ color: canFulfillStock ? '#15803d' : '#b45309' }}>
                          {availableStock} units of {bloodGrp}
                        </strong>
                      </div>
                    </div>

                    {/* Middle: Blood Requirement & Details */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        background: 'var(--neutral-50)',
                        padding: '1rem 1.25rem',
                        borderRadius: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-100)',
                          color: 'var(--primary-700)',
                          fontWeight: 800,
                          fontSize: '1.3rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {bloodGrp}
                      </div>

                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neutral-900)' }}>
                          {req.quantity} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--neutral-600)' }}>Units Requested</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginTop: '0.15rem' }}>
                          {req.patient_name || req.patientName ? (
                            <span><strong>Patient:</strong> {req.patient_name || req.patientName} &bull; </span>
                          ) : null}
                          {req.required_date || req.requiredDate ? (
                            <span><strong>Required Date:</strong> {new Date(req.required_date || req.requiredDate || '').toLocaleDateString()} &bull; </span>
                          ) : null}
                          <span><strong>Notes:</strong> {req.notes || req.message || 'Standard hospital stock requisition'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleAcceptHospitalRequest(req.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.55rem 1.1rem',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#16a34a',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.86rem',
                              cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            id={`btn-accept-request-${req.id}`}
                          >
                            <CheckCircle2 size={16} /> Accept Request
                          </button>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRejectHospitalRequest(req.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.55rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid #fca5a5',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontWeight: 600,
                              fontSize: '0.86rem',
                              cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            id={`btn-reject-request-${req.id}`}
                          >
                            <XCircle size={16} /> Decline
                          </button>
                        </>
                      )}

                      {req.status === 'ACCEPTED' && (
                        <>
                          <button
                            type="button"
                            disabled={isLoading || !canFulfillStock}
                            onClick={() => handleFulfillHospitalRequest(req.id, bloodGrp, req.quantity)}
                            className="btn-primary"
                            style={{
                              padding: '0.6rem 1.3rem',
                              fontSize: '0.88rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              boxShadow: 'var(--shadow-md)',
                              opacity: !canFulfillStock ? 0.6 : 1,
                              cursor: !canFulfillStock || isLoading ? 'not-allowed' : 'pointer'
                            }}
                            id={`btn-fulfill-request-${req.id}`}
                          >
                            <Check size={17} />
                            <span>
                              {isLoading
                                ? 'Fulfilling...'
                                : canFulfillStock
                                ? `Fulfill Order & Deduct ${req.quantity} Units`
                                : `Insufficient Stock (${availableStock} < ${req.quantity})`}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRejectHospitalRequest(req.id)}
                            style={{
                              padding: '0.6rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid var(--neutral-300)',
                              backgroundColor: 'white',
                              color: 'var(--neutral-600)',
                              fontSize: '0.86rem',
                              fontWeight: 500,
                              cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Cancel / Decline
                          </button>
                        </>
                      )}

                      {req.status === 'FULFILLED' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#15803d',
                            fontSize: '0.9rem',
                            fontWeight: 700
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span>Order Fulfilled & Stock Deducted</span>
                        </div>
                      )}

                      {req.status === 'REJECTED' && (
                        <span style={{ color: '#b91c1c', fontSize: '0.86rem', fontWeight: 600 }}>
                          Declined by Blood Bank
                        </span>
                      )}

                      {req.status === 'CANCELLED' && (
                        <span style={{ color: 'var(--neutral-500)', fontSize: '0.86rem', fontWeight: 500 }}>
                          Cancelled by Hospital
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 4: ORGANIZATION PROFILE
          ========================================================= */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: '680px' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>
              Blood Bank Facility Profile
            </h2>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
              Update facility contact details, address, and operating hours visible to public donors.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="feature-card" style={{ padding: '2rem', margin: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Organization Name
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="form-input"
                  style={{ marginTop: '0.25rem' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  City
                  <input
                    type="text"
                    required
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '0.25rem' }}
                  />
                </label>

                <label style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  Phone Number
                  <input
                    type="tel"
                    required
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '0.25rem' }}
                  />
                </label>
              </div>

              <label style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Complete Address
                <textarea
                  rows={2}
                  required
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="form-input"
                  style={{ marginTop: '0.25rem', resize: 'vertical' }}
                />
              </label>

              <label style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Operating Hours
                <input
                  type="text"
                  required
                  value={profileHours}
                  onChange={(e) => setProfileHours(e.target.value)}
                  className="form-input"
                  style={{ marginTop: '0.25rem' }}
                  placeholder="e.g. 08:00 AM - 08:00 PM"
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                  id="btn-save-profile"
                >
                  {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          TAB 4: PUBLIC DIRECTORY & BLOOD AVAILABILITY SEARCH
          ========================================================= */}
      {activeTab === 'search' && (
        <div style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>
              Public Availability Simulator
            </h2>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
              Preview how your facility appears when donors and partner hospitals search for blood across cities.
            </p>
          </div>

          <div
            className="feature-card"
            style={{
              padding: '1.5rem',
              margin: '0 0 1.5rem',
              backgroundColor: 'white',
              border: '1px solid var(--neutral-200)'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-700)' }}>City</label>
                <input
                  type="text"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="form-input"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-700)' }}>Blood Group</label>
                <select
                  value={searchGroup}
                  onChange={(e) => setSearchGroup(e.target.value as BloodGroup)}
                  className="form-input"
                  style={{ marginTop: '0.25rem' }}
                >
                  {ALL_BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--neutral-700)' }}>Min Required Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={searchQty}
                  onChange={(e) => setSearchQty(parseInt(e.target.value, 10) || 1)}
                  className="form-input"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>
            </div>
          </div>

          <div className="feature-card" style={{ padding: '1.5rem', margin: 0 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Your Facility Listing in Search Results
            </h3>

            <div
              style={{
                border: '1px solid var(--neutral-200)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
                  {profile?.organizationName || profile?.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginTop: '0.2rem' }}>
                  {profile?.fullAddress || profile?.address}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', marginTop: '0.2rem' }}>
                  📞 {profile?.phone || 'Contact provided'} &bull; 🕒 {profile?.openingHours || 'Hours provided'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>AVAILABLE STOCK</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                  {inventory.find((i) => i.bloodGroup === searchGroup)?.quantity ?? 0} units
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-600)' }}>
                  Group {searchGroup}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankDashboard;
