import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Droplet,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  X,
  Send,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { searchBloodForHospital, createHospitalBloodRequest } from '../services/hospital.service';
import { ApiError } from '../services/api';
import type {
  HospitalBloodSearchResult,
  BloodRequestUrgency
} from '../types/hospital';
import type { BloodGroup } from '../types/auth';

const ALL_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS: { label: string; value: BloodRequestUrgency; color: string }[] = [
  { label: 'Normal Priority', value: 'NORMAL', color: '#64748b' },
  { label: 'Medium Priority', value: 'MEDIUM', color: '#0284c7' },
  { label: 'High Priority', value: 'HIGH', color: '#ea580c' },
  { label: 'Urgent Allocation', value: 'URGENT', color: '#dc2626' },
  { label: 'Critical Emergency', value: 'CRITICAL', color: '#991b1b' }
];

const QUICK_CITIES = ['Chennai', 'Bengaluru', 'Coimbatore', 'Madurai'];

const HospitalFindBlood = () => {
  const { token } = useAuth();

  // Search Form States
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O+');
  const [quantity, setQuantity] = useState<number>(5);
  const [city, setCity] = useState<string>('Chennai');
  const [urgency, setUrgency] = useState<BloodRequestUrgency>('HIGH');

  // Results & Loading States
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HospitalBloodSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Request Blood Modal State
  const [selectedBank, setSelectedBank] = useState<HospitalBloodSearchResult | null>(null);
  const [patientName, setPatientName] = useState('');
  const [requiredDate, setRequiredDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(null);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSearchError(null);
    setRequestSuccessMessage(null);

    if (!quantity || quantity <= 0) {
      setSearchError('Required quantity must be greater than 0');
      return;
    }

    try {
      setIsSearching(true);
      const res = await searchBloodForHospital(
        {
          bloodGroup: selectedGroup,
          quantity,
          city: city.trim() || undefined,
          urgency
        },
        token || undefined
      );

      setSearchResults(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Unable to search blood banks. Please try again.';
      setSearchError(msg);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Perform initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  const openRequestModal = (bank: HospitalBloodSearchResult) => {
    setSelectedBank(bank);
    setRequestErrorMessage(null);
  };

  const closeRequestModal = () => {
    setSelectedBank(null);
    setRequestErrorMessage(null);
  };

  const handleConfirmRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedBank) return;

    try {
      setIsSubmittingRequest(true);
      setRequestErrorMessage(null);

      await createHospitalBloodRequest(
        {
          bloodBankId: selectedBank.bloodBankId,
          bloodGroup: selectedGroup,
          quantity,
          urgency,
          requiredDate: requiredDate || undefined,
          patientName: patientName.trim() || undefined,
          notes: requestNotes.trim() || undefined
        },
        token
      );

      setRequestSuccessMessage(
        `Blood request for ${quantity} units of ${selectedGroup} sent successfully to ${selectedBank.name}!`
      );
      closeRequestModal();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create blood request. Please try again.';
      setRequestErrorMessage(msg);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
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
          <Search size={13} />
          <span>REAL-TIME INVENTORY DISCOVERY</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
          Find Available Blood
        </h1>
        <p style={{ color: 'var(--neutral-600)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
          Query registered blood bank inventories and send targeted blood allocation requests directly to facilities with sufficient stock.
        </p>
      </div>

      {requestSuccessMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 600 }}>{requestSuccessMessage}</span>
          </div>
          <Link
            to="/hospital/requests"
            className="btn"
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              padding: '0.45rem 0.9rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            Track in My Requests
          </Link>
        </div>
      )}

      {/* Search Criteria Form */}
      <form
        onSubmit={handleSearch}
        className="feature-card"
        style={{
          padding: '1.75rem',
          marginBottom: '2rem',
          backgroundColor: '#ffffff',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.25rem'
          }}
        >
          {/* Blood Group */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
              Required Blood Group <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="search-blood-group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value as BloodGroup)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-300)',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--neutral-800)',
                cursor: 'pointer'
              }}
            >
              {ALL_BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg} Blood Type
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
              Quantity Needed (Units) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="search-quantity"
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-300)',
                fontSize: '0.95rem',
                fontWeight: 600
              }}
              required
            />
          </div>

          {/* City */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
              City / Location
            </label>
            <input
              id="search-city"
              type="text"
              placeholder="e.g. Chennai"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-300)',
                fontSize: '0.95rem'
              }}
            />
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              {QUICK_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  style={{
                    border: '1px solid var(--neutral-300)',
                    background: city === c ? 'var(--primary-100)' : '#ffffff',
                    color: city === c ? 'var(--primary-700)' : 'var(--neutral-600)',
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
              Urgency / Priority
            </label>
            <select
              id="search-urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as BloodRequestUrgency)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-300)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {URGENCY_LEVELS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={isSearching}
            id="btn-submit-blood-search"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: isSearching ? 'not-allowed' : 'pointer'
            }}
          >
            <Search size={18} />
            <span>{isSearching ? 'Searching Available Blood Banks...' : 'Search Blood'}</span>
          </button>
        </div>
      </form>

      {/* Error Alert */}
      {searchError && (
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
          {searchError}
        </div>
      )}

      {/* Results Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
          Available Blood Banks ({searchResults.length})
        </h2>
        <span style={{ fontSize: '0.88rem', color: 'var(--neutral-500)' }}>
          Showing certified facilities with at least <strong>{quantity} units</strong> of <strong>{selectedGroup}</strong>
        </span>
      </div>

      {/* Results Listing */}
      {isSearching ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <RefreshCw size={28} className="spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--neutral-600)', fontSize: '1rem' }}>Searching available blood banks...</p>
        </div>
      ) : searchResults.length === 0 ? (
        <div
          className="feature-card"
          style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            color: 'var(--neutral-500)'
          }}
        >
          <Droplet size={44} style={{ color: 'var(--neutral-300)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--neutral-800)', margin: '0 0 0.5rem' }}>
            No suitable blood banks found.
          </h3>
          <p style={{ fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto' }}>
            No registered blood banks currently have at least {quantity} units of {selectedGroup} in {city || 'the selected area'}. Try adjusting quantity or searching without city filters.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {searchResults.map((bank) => (
            <div
              key={bank.bloodBankId}
              className="feature-card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--neutral-200)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--neutral-900)',
                      margin: '0 0 0.35rem',
                      lineHeight: 1.3
                    }}
                  >
                    {bank.name}
                  </h3>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      backgroundColor: 'var(--primary-100)',
                      color: 'var(--primary-700)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {bank.bloodGroup}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.75rem 0' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>
                    {bank.availableQuantity} units
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>available in stock</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.86rem', color: 'var(--neutral-600)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                    <MapPin size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--neutral-400)' }} />
                    <span>{bank.address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Phone size={15} style={{ flexShrink: 0, color: 'var(--neutral-400)' }} />
                    <span>{bank.phone || 'Contact on file'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Clock size={15} style={{ flexShrink: 0, color: 'var(--neutral-400)' }} />
                    <span>{bank.openingHours || '08:00 AM - 08:00 PM'}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#16a34a',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    margin: '1rem 0 0.5rem'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>✓ Can fulfill your request ({quantity} {quantity === 1 ? 'unit' : 'units'})</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openRequestModal(bank)}
                id={`btn-request-blood-${bank.bloodBankId}`}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem',
                  fontWeight: 600,
                  fontSize: '0.92rem'
                }}
              >
                <Send size={15} />
                <span>Request Blood</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation & Details Modal */}
      {selectedBank && (
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
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: '12px',
              position: 'relative'
            }}
          >
            <button
              onClick={closeRequestModal}
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

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--neutral-900)', margin: '0 0 0.5rem' }}>
              Confirm Blood Request
            </h2>
            <p style={{ color: 'var(--neutral-600)', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
              Submitting this request alerts the target Blood Bank. Inventory will be allocated and deducted upon official fulfillment.
            </p>

            {requestErrorMessage && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              >
                {requestErrorMessage}
              </div>
            )}

            {/* Target Facility Summary */}
            <div
              style={{
                backgroundColor: 'var(--neutral-50)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--neutral-200)',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Target Blood Bank</span>
                <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700 }}>In Stock: {selectedBank.availableQuantity} units</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--neutral-900)' }}>
                {selectedBank.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.2rem' }}>
                {selectedBank.address} • {selectedBank.phone}
              </div>
            </div>

            {/* Request Summary Badges */}
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
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-700)' }}>{selectedGroup}</span>
              </div>
              <div style={{ backgroundColor: 'var(--neutral-100)', padding: '0.65rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Quantity</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--neutral-800)' }}>{quantity} units</span>
              </div>
              <div style={{ backgroundColor: '#fff7ed', padding: '0.65rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Urgency</span>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#c2410c' }}>{urgency}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmRequest}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neutral-700)' }}>
                  Patient Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neutral-700)' }}>
                  Required By Date
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neutral-700)' }}>
                  Clinical Notes / Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Emergency surgery requirement, trauma case, etc."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--neutral-300)',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeRequestModal}
                  disabled={isSubmittingRequest}
                  className="btn"
                  style={{
                    border: '1px solid var(--neutral-300)',
                    padding: '0.6rem 1rem',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  id="btn-confirm-blood-request"
                  className="btn btn-primary"
                  style={{
                    padding: '0.6rem 1.4rem',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  {isSubmittingRequest ? 'Submitting Request...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalFindBlood;
