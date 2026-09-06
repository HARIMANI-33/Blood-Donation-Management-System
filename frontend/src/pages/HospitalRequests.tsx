import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  X,
  Eye,
  Ban
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  getHospitalRequests,
  getHospitalRequestById,
  cancelHospitalRequest
} from '../services/hospital.service';
import { ApiError } from '../services/api';
import type { HospitalBloodRequest } from '../types/hospital';

const HospitalRequests = () => {
  const { token } = useAuth();

  const [requests, setRequests] = useState<HospitalBloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'FULFILLED' | 'CANCELLED_OR_REJECTED'>('ALL');

  // Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<HospitalBloodRequest | null>(null);

  // Cancellation State
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const loadRequests = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      setError(null);
      const res = await getHospitalRequests(token);
      if (res.data?.requests) {
        setRequests(res.data.requests);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Unable to load blood requests. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const viewDetails = async (req: HospitalBloodRequest) => {
    setSelectedRequest(req);
    if (!token) return;

    try {
      const res = await getHospitalRequestById(req.id, token);
      if (res.data?.request) {
        setSelectedRequest(res.data.request);
      }
    } catch {
      // Keep existing request info
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to cancel this pending blood request?')) {
      return;
    }

    try {
      setCancellingId(requestId);
      const res = await cancelHospitalRequest(requestId, token);
      if (res.data?.request) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED' } : r))
        );
        if (selectedRequest?.id === requestId) {
          setSelectedRequest({ ...selectedRequest, status: 'CANCELLED' });
        }
        showNotification('success', 'Blood request cancelled successfully.');
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to cancel request.';
      showNotification('error', msg);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') return r.status === 'PENDING';
    if (activeFilter === 'ACCEPTED') return r.status === 'ACCEPTED';
    if (activeFilter === 'FULFILLED') return r.status === 'FULFILLED';
    if (activeFilter === 'CANCELLED_OR_REJECTED') {
      return r.status === 'CANCELLED' || r.status === 'REJECTED';
    }
    return true;
  });

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
            Pending Review
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
            Accepted / Ready
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
            Fulfilled & Delivered
          </span>
        );
      case 'REJECTED':
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
            Rejected by Bank
          </span>
        );
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
              backgroundColor: '#f1f5f9',
              color: '#475569'
            }}
          >
            <Ban size={12} />
            Cancelled
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
          padding: '0.15rem 0.45rem',
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
        <p style={{ color: 'var(--neutral-600)', fontSize: '1.05rem' }}>Loading your requests...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
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
            <FileText size={13} />
            <span>HOSPITAL REQUEST LOGS</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
            Hospital Blood Requests
          </h1>
          <p style={{ color: 'var(--neutral-600)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            Real-time status tracking for hospital blood allocations, blood bank approvals, and delivery fulfillment.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={loadRequests}
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
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/hospital/find-blood"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700
            }}
          >
            <Search size={15} />
            <span>New Blood Request</span>
          </Link>
        </div>
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

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--neutral-200)',
          paddingBottom: '0.75rem'
        }}
      >
        <button
          onClick={() => setActiveFilter('ALL')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.86rem',
            backgroundColor: activeFilter === 'ALL' ? 'var(--primary-600)' : 'var(--neutral-100)',
            color: activeFilter === 'ALL' ? '#ffffff' : 'var(--neutral-700)'
          }}
        >
          All Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveFilter('PENDING')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.86rem',
            backgroundColor: activeFilter === 'PENDING' ? '#f59e0b' : 'var(--neutral-100)',
            color: activeFilter === 'PENDING' ? '#ffffff' : 'var(--neutral-700)'
          }}
        >
          Pending ({requests.filter((r) => r.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveFilter('ACCEPTED')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.86rem',
            backgroundColor: activeFilter === 'ACCEPTED' ? '#2563eb' : 'var(--neutral-100)',
            color: activeFilter === 'ACCEPTED' ? '#ffffff' : 'var(--neutral-700)'
          }}
        >
          Accepted ({requests.filter((r) => r.status === 'ACCEPTED').length})
        </button>
        <button
          onClick={() => setActiveFilter('FULFILLED')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.86rem',
            backgroundColor: activeFilter === 'FULFILLED' ? '#16a34a' : 'var(--neutral-100)',
            color: activeFilter === 'FULFILLED' ? '#ffffff' : 'var(--neutral-700)'
          }}
        >
          Fulfilled ({requests.filter((r) => r.status === 'FULFILLED').length})
        </button>
        <button
          onClick={() => setActiveFilter('CANCELLED_OR_REJECTED')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.86rem',
            backgroundColor: activeFilter === 'CANCELLED_OR_REJECTED' ? '#dc2626' : 'var(--neutral-100)',
            color: activeFilter === 'CANCELLED_OR_REJECTED' ? '#ffffff' : 'var(--neutral-700)'
          }}
        >
          Rejected / Cancelled ({requests.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length})
        </button>
      </div>

      {/* Requests Table / Listing */}
      <div className="feature-card" style={{ padding: '1.5rem' }}>
        {filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--neutral-500)' }}>
            <FileText size={44} style={{ color: 'var(--neutral-300)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--neutral-800)', margin: '0 0 0.4rem' }}>
              No blood requests found.
            </h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
              {activeFilter === 'ALL'
                ? 'You have not created any blood requests yet.'
                : `No requests matching the "${activeFilter}" filter.`}
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
                  <th style={{ padding: '0.75rem 0.5rem' }}>Request ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Blood Bank</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Blood Group</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Quantity</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Urgency</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Requested Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                    <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                      {req.id.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: 'var(--neutral-900)' }}>
                      <div>{req.blood_bank_name || req.bloodBankName || 'Target Blood Bank'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 400 }}>
                        {req.blood_bank_city || req.bloodBankCity || ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: 'var(--primary-700)',
                          backgroundColor: 'var(--primary-50)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        {req.blood_group || req.bloodGroup}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                      {req.quantity} {req.quantity === 1 ? 'unit' : 'units'}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>{getUrgencyBadge(req.urgency)}</td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>{getStatusBadge(req.status)}</td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--neutral-500)', fontSize: '0.85rem' }}>
                      {new Date(req.created_at || req.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => viewDetails(req)}
                          id={`btn-view-request-${req.id}`}
                          className="btn"
                          style={{
                            border: '1px solid var(--neutral-300)',
                            backgroundColor: '#ffffff',
                            color: 'var(--neutral-700)',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: 600
                          }}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        {req.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={cancellingId === req.id}
                            className="btn"
                            style={{
                              border: '1px solid #fecaca',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.8rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontWeight: 600
                            }}
                          >
                            <Ban size={13} />
                            <span>{cancellingId === req.id ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000
          }}
        >
          <div
            className="feature-card"
            style={{
              backgroundColor: '#ffffff',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: '12px',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setSelectedRequest(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--neutral-400)',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
                Blood Request Details
              </h2>
              {getStatusBadge(selectedRequest.status)}
            </div>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.82rem', margin: '0 0 1.25rem', fontFamily: 'monospace' }}>
              Request ID: {selectedRequest.id}
            </p>

            {/* Target Blood Bank Card */}
            <div
              style={{
                backgroundColor: 'var(--neutral-50)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-200)',
                marginBottom: '1.25rem'
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 700 }}>
                TARGET BLOOD BANK FACILITY
              </span>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--neutral-900)', marginTop: '0.2rem' }}>
                {selectedRequest.blood_bank_name || selectedRequest.bloodBankName || 'Selected Blood Bank'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {selectedRequest.blood_bank_address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} style={{ color: 'var(--neutral-400)' }} />
                    <span>{selectedRequest.blood_bank_address}</span>
                  </div>
                )}
                {selectedRequest.blood_bank_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} style={{ color: 'var(--neutral-400)' }} />
                    <span>{selectedRequest.blood_bank_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Specification Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                textAlign: 'center'
              }}
            >
              <div style={{ backgroundColor: 'var(--primary-50)', padding: '0.65rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Blood Group</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-700)' }}>
                  {selectedRequest.blood_group || selectedRequest.bloodGroup}
                </span>
              </div>
              <div style={{ backgroundColor: 'var(--neutral-100)', padding: '0.65rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Quantity</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--neutral-800)' }}>
                  {selectedRequest.quantity} units
                </span>
              </div>
              <div style={{ backgroundColor: '#fff7ed', padding: '0.65rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Priority</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#c2410c' }}>
                  {selectedRequest.urgency}
                </span>
              </div>
            </div>

            {/* Additional Clinical Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: 'var(--neutral-700)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--neutral-500)' }}>Patient Name:</span>
                <span style={{ fontWeight: 600 }}>{selectedRequest.patient_name || selectedRequest.patientName || 'Not specified'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--neutral-500)' }}>Required By Date:</span>
                <span style={{ fontWeight: 600 }}>{selectedRequest.required_date || selectedRequest.requiredDate || 'Immediate'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--neutral-500)' }}>Date Created:</span>
                <span>{new Date(selectedRequest.created_at || selectedRequest.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--neutral-500)' }}>Last Updated:</span>
                <span>{new Date(selectedRequest.updated_at || selectedRequest.updatedAt || Date.now()).toLocaleString()}</span>
              </div>
              {(selectedRequest.message || selectedRequest.notes) && (
                <div style={{ backgroundColor: 'var(--neutral-50)', padding: '0.75rem', borderRadius: '6px', marginTop: '0.25rem' }}>
                  <span style={{ fontWeight: 600, display: 'block', color: 'var(--neutral-700)', marginBottom: '0.2rem' }}>
                    Clinical Notes:
                  </span>
                  <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.85rem' }}>
                    {selectedRequest.message || selectedRequest.notes}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedRequest.status === 'PENDING' ? (
                <button
                  type="button"
                  onClick={() => handleCancelRequest(selectedRequest.id)}
                  disabled={cancellingId === selectedRequest.id}
                  className="btn"
                  style={{
                    border: '1px solid #fecaca',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '0.55rem 1rem',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  {cancellingId === selectedRequest.id ? 'Cancelling...' : 'Cancel Request'}
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="btn"
                style={{
                  border: '1px solid var(--neutral-300)',
                  padding: '0.55rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.88rem'
                }}
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

export default HospitalRequests;
