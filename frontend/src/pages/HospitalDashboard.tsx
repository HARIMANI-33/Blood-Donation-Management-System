import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Hospital,
  Search,
  FileText,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Droplet,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getHospitalProfile, getHospitalRequests } from '../services/hospital.service';
import type { HospitalProfile, HospitalBloodRequest } from '../types/hospital';

const HospitalDashboard = () => {
  const { token, user } = useAuth();

  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [requests, setRequests] = useState<HospitalBloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      setError(null);
      const [profRes, reqsRes] = await Promise.all([
        getHospitalProfile(token).catch(() => null),
        getHospitalRequests(token).catch(() => null)
      ]);

      if (profRes?.data) {
        setProfile(profRes.data);
      }
      if (reqsRes?.data?.requests) {
        setRequests(reqsRes.data.requests);
      }
    } catch (err) {
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real metrics calculated from actual backend requests
  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
  const acceptedRequests = requests.filter((r) => r.status === 'ACCEPTED').length;
  const fulfilledRequests = requests.filter((r) => r.status === 'FULFILLED').length;

  const displayName = profile?.name || user?.name || 'Hospital';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: '#fef3c7',
              color: '#b45309'
            }}
          >
            <Clock size={12} />
            Pending
          </span>
        );
      case 'ACCEPTED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: '#dbeafe',
              color: '#1d4ed8'
            }}
          >
            <CheckCircle2 size={12} />
            Accepted
          </span>
        );
      case 'FULFILLED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: '#dcfce7',
              color: '#15803d'
            }}
          >
            <CheckCircle2 size={12} />
            Fulfilled
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: '#fee2e2',
              color: '#b91c1c'
            }}
          >
            <XCircle size={12} />
            {status}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const isHigh = urgency === 'HIGH' || urgency === 'CRITICAL' || urgency === 'URGENT';
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: isHigh ? '#fee2e2' : '#f1f5f9',
          color: isHigh ? '#dc2626' : '#475569'
        }}
      >
        {urgency}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--primary-600)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--neutral-600)', fontSize: '1.05rem' }}>Loading hospital dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header Banner */}
      <div
        className="feature-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
          border: '1px solid var(--primary-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '0.5rem'
            }}
          >
            <Hospital size={13} />
            <span>HOSPITAL FACILITY PORTAL</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
            Welcome, {displayName}
          </h1>
          <p style={{ color: 'var(--neutral-600)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            {profile?.city ? `${profile.city} • ` : ''}
            {profile?.address ? `${profile.address} • ` : ''}
            Facility ID: {profile?.id || profile?.hospitalId || 'Active'}
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className="btn"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--neutral-300)',
            color: 'var(--neutral-700)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 0.95rem',
            borderRadius: '8px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #fecaca'
          }}
        >
          {error}
        </div>
      )}

      {/* Primary Actions Grid */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--neutral-800)', marginBottom: '1rem' }}>
        Quick Hospital Actions
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        {/* Action 1: Find Blood */}
        <Link
          to="/hospital/find-blood"
          className="feature-card"
          id="btn-action-find-blood"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textDecoration: 'none',
            borderLeft: '4px solid var(--primary-600)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
        >
          <div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-100)',
                color: 'var(--primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}
            >
              <Search size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0 0 0.4rem' }}>
              Find Blood
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', margin: 0, lineHeight: 1.5 }}>
              Search real-time inventory across registered blood banks in your city with availability verification.
            </p>
          </div>
          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--primary-600)',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            <span>Search Blood Banks</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* Action 2: My Requests */}
        <Link
          to="/hospital/requests"
          className="feature-card"
          id="btn-action-my-requests"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textDecoration: 'none',
            borderLeft: '4px solid #2563eb',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
        >
          <div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}
            >
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0 0 0.4rem' }}>
              My Requests
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', margin: 0, lineHeight: 1.5 }}>
              Monitor incoming approvals, accepted blood allocations, and fulfilled delivery logs in real-time.
            </p>
          </div>
          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#2563eb',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            <span>View All Requests ({totalRequests})</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* Action 3: Profile */}
        <Link
          to="/hospital/profile"
          className="feature-card"
          id="btn-action-profile"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textDecoration: 'none',
            borderLeft: '4px solid #059669',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
        >
          <div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#d1fae5',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}
            >
              <User size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0 0 0.4rem' }}>
              Hospital Profile
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', margin: 0, lineHeight: 1.5 }}>
              Review and update hospital address, emergency contact numbers, and official operating hours.
            </p>
          </div>
          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#059669',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            <span>Manage Profile</span>
            <ArrowRight size={16} />
          </div>
        </Link>
      </div>

      {/* Real Summary Metrics from Backend */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--neutral-800)', marginBottom: '1rem' }}>
        Live Blood Request Metrics
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div className="feature-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', fontWeight: 600 }}>
            Total Requests Sent
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-900)', marginTop: '0.35rem' }}>
            {totalRequests}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Lifetime hospital activity</span>
        </div>

        <div className="feature-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>
            Pending Review
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309', marginTop: '0.35rem' }}>
            {pendingRequests}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Awaiting blood bank response</span>
        </div>

        <div className="feature-card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: 600 }}>
            Accepted Allocations
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.35rem' }}>
            {acceptedRequests}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Confirmed, ready for supply</span>
        </div>

        <div className="feature-card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
            Fulfilled Requests
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', marginTop: '0.35rem' }}>
            {fulfilledRequests}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Units safely delivered</span>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="feature-card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
            Recent Blood Requests
          </h2>
          <Link
            to="/hospital/requests"
            style={{
              color: 'var(--primary-600)',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <span>View all</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--neutral-500)' }}>
            <Droplet size={40} style={{ color: 'var(--neutral-300)', margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem', color: 'var(--neutral-700)' }}>
              You have not created any blood requests yet.
            </p>
            <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
              Search real-time inventory from registered blood banks in your city and submit immediate requests.
            </p>
            <Link
              to="/hospital/find-blood"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.9rem',
                padding: '0.6rem 1.2rem'
              }}
            >
              <Search size={16} />
              <span>Search Available Blood</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', textAlign: 'left', color: 'var(--neutral-600)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Blood Bank</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Blood Group</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Quantity</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Urgency</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: 'var(--neutral-900)' }}>
                      {req.blood_bank_name || req.bloodBankName || 'Selected Blood Bank'}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--primary-700)',
                          backgroundColor: 'var(--primary-50)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        {req.blood_group || req.bloodGroup}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>
                      {req.quantity} {req.quantity === 1 ? 'unit' : 'units'}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>{getUrgencyBadge(req.urgency)}</td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>{getStatusBadge(req.status)}</td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--neutral-500)', fontSize: '0.85rem' }}>
                      {new Date(req.created_at || req.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalDashboard;
