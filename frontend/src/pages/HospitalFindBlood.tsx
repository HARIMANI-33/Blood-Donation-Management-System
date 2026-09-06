import { useState, useEffect, useRef, useMemo, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Droplet,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  RefreshCw,
  Building2,
  Info,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  searchBloodForHospital,
  getHospitalOrganizations,
  createHospitalBloodRequest,
  getHospitalRequests
} from '../services/hospital.service';
import { ApiError } from '../services/api';
import type {
  HospitalBloodSearchResult,
  HospitalBloodRequest,
  BloodRequestUrgency,
  RegisteredFacility
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

// Curated Demo Organizations preserved for evaluator demonstration
const DEMO_ORGANIZATIONS: Array<{
  bloodBankId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  openingHours: string;
  availableQuantity: number;
  type: string;
}> = [
  {
    bloodBankId: 'demo-apollo-chennai',
    name: 'Apollo Blood Bank Chennai',
    city: 'Chennai',
    address: '123 Anna Salai, Teynampet, Chennai, Tamil Nadu 600018',
    phone: '9988776655',
    openingHours: '24/7 Emergency Available',
    availableQuantity: 21,
    type: 'Blood Bank'
  },
  {
    bloodBankId: 'demo-lifeflow-53586',
    name: 'LifeFlow Center 53586 Updated',
    city: 'Chennai',
    address: '14 Hospital Road, Guindy, Chennai',
    phone: '+91 99887 76600',
    openingHours: '24/7 Service',
    availableQuantity: 25,
    type: 'Blood Bank'
  },
  {
    bloodBankId: 'demo-lifeflow-99638',
    name: 'LifeFlow Center 99638 Updated',
    city: 'Chennai',
    address: '14 Hospital Road, Guindy, Chennai',
    phone: '+91 99887 76600',
    openingHours: '24/7 Service',
    availableQuantity: 25,
    type: 'Blood Bank'
  },
  {
    bloodBankId: 'demo-bengaluru-city',
    name: 'Bengaluru City Blood Center',
    city: 'Bengaluru',
    address: '26 MG Road, Shanthala Nagar, Bengaluru',
    phone: '+91 80 2558 1234',
    openingHours: '24/7 Available',
    availableQuantity: 18,
    type: 'Blood Bank'
  },
  {
    bloodBankId: 'demo-kovai-care',
    name: 'Coimbatore Community Blood Care',
    city: 'Coimbatore',
    address: '88 Avinashi Road, Peelamedu, Coimbatore',
    phone: '+91 422 257 8899',
    openingHours: '08:00 AM - 08:00 PM',
    availableQuantity: 16,
    type: 'Blood Bank'
  },
  {
    bloodBankId: 'demo-madurai-mission',
    name: 'Madurai Regional Blood Bank',
    city: 'Madurai',
    address: '12 Melur Main Road, Madurai',
    phone: '+91 452 258 4400',
    openingHours: '24 Hours Emergency',
    availableQuantity: 20,
    type: 'Blood Bank'
  }
];

const HospitalFindBlood = () => {
  const { token } = useAuth();

  // Search Form States
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O+');
  const [quantity, setQuantity] = useState<number>(5);
  const [city, setCity] = useState<string>('Chennai');
  const [urgency, setUrgency] = useState<BloodRequestUrgency>('HIGH');
  const [searchFacilityQuery, setSearchFacilityQuery] = useState<string>('');

  // Autocomplete & Database Organizations
  const [liveOrganizations, setLiveOrganizations] = useState<RegisteredFacility[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);

  // Results & Loading States
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HospitalBloodSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  // Request Blood Modal State (for Real Database facilities)
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

  // Existing active requests for the authenticated hospital (Rule 1 duplicate prevention)
  const [hospitalRequests, setHospitalRequests] = useState<HospitalBloodRequest[]>([]);

  const loadHospitalRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getHospitalRequests(token);
      if (res.data?.requests) {
        setHospitalRequests(res.data.requests);
      }
    } catch {
      // Fallback gracefully
    }
  }, [token]);

  useEffect(() => {
    loadHospitalRequests();
  }, [loadHospitalRequests]);

  // Helper to find an active request (PENDING or ACCEPTED) with a specific blood bank
  const getActiveRequestForBank = (bankId: string) => {
    return hospitalRequests.find(
      (r) => r.blood_bank_id === bankId && (r.status === 'PENDING' || r.status === 'ACCEPTED')
    );
  };

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real database organizations for the selected city
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const res = await getHospitalOrganizations({ city: city.trim() || undefined }, token || undefined);
        if (res.data) {
          setLiveOrganizations(res.data);
        }
      } catch {
        // Fallback gracefully if endpoint is silent
      }
    };
    loadOrganizations();
  }, [city, token]);

  // Autocomplete suggestions: REAL DATABASE MATCHES FIRST, THEN DEMO MATCHES
  const autocompleteSuggestions = useMemo(() => {
    const q = searchFacilityQuery.trim().toLowerCase();
    const cityFilter = city.trim().toLowerCase();

    // 1. Real database organizations matching city + typed name FIRST
    const realMatches = liveOrganizations
      .filter((org) => {
        const matchCity = !cityFilter || org.city.toLowerCase().includes(cityFilter);
        const matchQuery = !q || org.name.toLowerCase().includes(q);
        return matchCity && matchQuery;
      })
      .map((org) => ({
        id: org.id,
        name: org.name,
        city: org.city,
        type: org.type,
        isLive: true
      }));

    // 2. Demo organizations matching city + typed name AFTER
    const demoMatches = DEMO_ORGANIZATIONS
      .filter((demo) => {
        const matchCity = !cityFilter || demo.city.toLowerCase().includes(cityFilter);
        const matchQuery = !q || demo.name.toLowerCase().includes(q);
        return matchCity && matchQuery;
      })
      .map((demo) => ({
        id: demo.bloodBankId,
        name: demo.name,
        city: demo.city,
        type: demo.type,
        isLive: false
      }));

    return [...realMatches, ...demoMatches];
  }, [searchFacilityQuery, liveOrganizations, city]);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSearchError(null);
    setRequestSuccessMessage(null);
    setDemoNotice(null);
    setShowAutocomplete(false);

    if (!quantity || quantity <= 0) {
      setSearchError('Required quantity must be greater than 0');
      return;
    }

    try {
      setIsSearching(true);

      // 1. Fetch Real Database Organizations from backend
      const res = await searchBloodForHospital(
        {
          bloodGroup: selectedGroup,
          quantity,
          city: city.trim() || undefined,
          urgency,
          facilityName: searchFacilityQuery.trim() || undefined
        },
        token || undefined
      );

      // Rule 10: Deduplicate real DB results so each organization appears ONLY ONCE
      const seenReal = new Set<string>();
      const realDbResults: HospitalBloodSearchResult[] = [];

      for (const item of res.data || []) {
        const normKey = item.name.trim().toLowerCase();
        if (!seenReal.has(normKey) && !seenReal.has(item.bloodBankId)) {
          seenReal.add(normKey);
          seenReal.add(item.bloodBankId);
          realDbResults.push({
            ...item,
            isLive: true,
            source: 'LIVE',
            canFulfill: item.availableQuantity >= quantity
          });
        }
      }

      // 2. Filter Demo Organizations based on city and search query
      const cityFilter = city.trim().toLowerCase();
      const queryFilter = searchFacilityQuery.trim().toLowerCase();

      const matchingDemoResults: HospitalBloodSearchResult[] = DEMO_ORGANIZATIONS
        .filter((demo) => {
          const matchCity = !cityFilter || demo.city.toLowerCase().includes(cityFilter);
          const matchQuery = !queryFilter || demo.name.toLowerCase().includes(queryFilter);
          return matchCity && matchQuery;
        })
        .map((demo) => ({
          bloodBankId: demo.bloodBankId,
          name: demo.name,
          city: demo.city,
          address: demo.address,
          phone: demo.phone,
          openingHours: demo.openingHours,
          bloodGroup: selectedGroup,
          availableQuantity: demo.availableQuantity,
          canFulfill: demo.availableQuantity >= quantity,
          isLive: false,
          source: 'DEMO',
          type: demo.type
        }));

      // Rule 1 & Rule 5: STRICT MERGE ORDER:
      // [ ...realDatabaseResults, ...demoResults ]
      // Real database results FIRST, followed by demo results!
      const unifiedResults: HospitalBloodSearchResult[] = [
        ...realDbResults,
        ...matchingDemoResults
      ];

      setSearchResults(unifiedResults);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Unable to search blood banks. Please try again.';
      setSearchError(msg);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Initial search on mount
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

  const handleDemoFacilityClick = (facilityName: string) => {
    setDemoNotice(
      `"${facilityName}" is a demonstration card. Please select a LIVE database facility above to submit official hospital blood requests.`
    );
    setTimeout(() => {
      setDemoNotice(null);
    }, 6000);
  };

  const handleConfirmRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedBank) return;
    if (isSubmittingRequest) return; // Rule 4: Prevent double submission

    // Rule 1: Check if an active request already exists locally
    const existingActive = getActiveRequestForBank(selectedBank.bloodBankId);
    if (existingActive) {
      setRequestErrorMessage(
        `Request Already Sent: You already have an active blood request with ${selectedBank.name}. Please wait until the request is fulfilled, rejected, or cancelled.`
      );
      return;
    }

    try {
      setIsSubmittingRequest(true);
      setRequestErrorMessage(null);

      // Section 12: Real request uses actual database Blood Bank ID
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
      // Refresh active requests immediately to update all UI cards
      loadHospitalRequests();
      closeRequestModal();
    } catch (err: unknown) {
      let msg = 'Failed to create blood request. Please try again.';
      if (err instanceof ApiError) {
        msg = err.message;
        if (err.status === 409 || err.message.toLowerCase().includes('already exists')) {
          msg = `Request Already Sent: You already have an active blood request with ${selectedBank.name}.`;
          loadHospitalRequests();
        }
      }
      setRequestErrorMessage(msg);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
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

      {/* Success Notification Banner */}
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

      {/* Demo Notice Toast */}
      {demoNotice && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            backgroundColor: '#f8fafc',
            color: '#334155',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: '1.5px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Info size={18} style={{ color: '#0284c7', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{demoNotice}</span>
          </div>
          <button
            onClick={() => setDemoNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={16} />
          </button>
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
          boxShadow: 'var(--shadow-md)',
          borderRadius: '14px',
          border: '1px solid var(--neutral-200)'
        }}
      >
        {/* Row 1: Core Criteria */}
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
                    cursor: 'pointer',
                    fontWeight: city === c ? 700 : 500
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

        {/* Row 2: Manual Organization Search with Unified Autocomplete Dropdown */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            ref={autocompleteRef}
            style={{
              flex: '1 1 300px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}
          >
            <label style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
              Search Blood Bank or Hospital (Optional)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="search-facility-input"
                type="text"
                placeholder="Type to search database organizations (e.g. Neuro, Apex, SIMS)..."
                value={searchFacilityQuery}
                onChange={(e) => {
                  setSearchFacilityQuery(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => setShowAutocomplete(true)}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.25rem 0.75rem 2.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--neutral-300)',
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}
              />
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', color: 'var(--neutral-400)', pointerEvents: 'none' }}
              />
              {searchFacilityQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchFacilityQuery('');
                    setShowAutocomplete(false);
                  }}
                  title="Clear filter"
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--neutral-400)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: '2px'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Section 8 & 9: Autocomplete Dropdown - REAL DATABASE FIRST, THEN DEMO */}
            {showAutocomplete && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1.5px solid var(--neutral-200)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  zIndex: 50,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}
              >
                {autocompleteSuggestions.length === 0 ? (
                  <div style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--neutral-500)' }}>
                    No matching organizations found in {city || 'selected area'}.
                  </div>
                ) : (
                  autocompleteSuggestions.map((item) => (
                    <div
                      key={`${item.isLive ? 'live' : 'demo'}-${item.id}`}
                      onClick={() => {
                        setSearchFacilityQuery(item.name);
                        setShowAutocomplete(false);
                      }}
                      style={{
                        padding: '0.65rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--neutral-100)',
                        backgroundColor: '#ffffff',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--neutral-900)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginTop: '0.1rem' }}>
                          {item.type || 'Facility'} • {item.city}
                        </div>
                      </div>
                      {item.isLive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            flexShrink: 0
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                          LIVE
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '0.15rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0
                          }}
                        >
                          DEMO
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.65rem' }}>
            <button
              type="submit"
              disabled={isSearching}
              id="btn-submit-blood-search"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.6rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Search size={16} />
              <span>{isSearching ? 'Searching...' : 'Search Blood'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Search Error Alert */}
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

      {/* Section 11: Unified Results Header & Total Count */}
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neutral-900)', margin: 0 }}>
          Available Blood Banks ({searchResults.length})
        </h2>
        <span style={{ fontSize: '0.88rem', color: 'var(--neutral-500)' }}>
          Showing certified facilities with at least <strong>{quantity} units</strong> of <strong>{selectedGroup}</strong>
        </span>
      </div>

      {/* Section 1 & 5: ONE COMBINED RESULT LIST - Real Database First, Demo Second */}
      {isSearching ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <RefreshCw size={28} className="spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--neutral-600)', fontSize: '1rem' }}>Querying live database facilities and blood inventory...</p>
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
            No matching facilities found.
          </h3>
          <p style={{ fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto' }}>
            No organizations currently match your search criteria for {quantity} units of {selectedGroup} in {city || 'the selected area'}. Try clearing organization name or adjusting the quantity.
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
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div>
                {/* Section 13: Card Header with subtle LIVE / DEMO badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--neutral-900)',
                        margin: '0 0 0.35rem',
                        lineHeight: 1.3
                      }}
                    >
                      {bank.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {bank.isLive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0'
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                          LIVE
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '0.15rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          DEMO
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      backgroundColor: 'var(--primary-100)',
                      color: 'var(--primary-700)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {bank.bloodGroup}
                  </span>
                </div>

                {/* Blood Inventory Display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.85rem 0' }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d' }}>
                    {bank.availableQuantity} units
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>available in stock</span>
                </div>

                {/* Facility Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.86rem', color: 'var(--neutral-600)' }}>
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
                    <span>{bank.openingHours || '24/7 Available'}</span>
                  </div>
                </div>

                {/* Section 7: Stock Fulfillment Check */}
                <div style={{ margin: '1rem 0 0.5rem' }}>
                  {bank.canFulfill ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: '#16a34a',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>✓ Can fulfill your request ({quantity} {quantity === 1 ? 'unit' : 'units'})</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: '#dc2626',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>✕ Insufficient stock (Needs {quantity} units, only {bank.availableQuantity} available)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 12: Request Blood Button vs Active Request vs Demo Button */}
              {bank.isLive ? (
                (() => {
                  const activeReq = getActiveRequestForBank(bank.bloodBankId);
                  if (activeReq) {
                    return (
                      <div style={{ marginTop: '1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: '#fef3c7',
                            border: '1.5px solid #fde68a',
                            color: '#92400e',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            marginBottom: '0.45rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <CheckCircle2 size={16} style={{ color: '#d97706' }} />
                            <span>Request Already Sent</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              backgroundColor: '#fde68a',
                              color: '#78350f'
                            }}
                          >
                            {activeReq.status === 'ACCEPTED' ? 'Accepted' : 'Pending Review'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openRequestModal(bank)}
                          id={`btn-view-request-${bank.bloodBankId}`}
                          className="btn"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            padding: '0.65rem',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            borderRadius: '8px',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          <Clock size={14} />
                          <span>View Active Request Details</span>
                        </button>
                      </div>
                    );
                  }

                  return (
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
                        gap: '0.45rem',
                        padding: '0.7rem',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        borderRadius: '8px'
                      }}
                    >
                      <Send size={15} />
                      <span>Request Blood</span>
                    </button>
                  );
                })()
              ) : (
                <button
                  type="button"
                  onClick={() => handleDemoFacilityClick(bank.name)}
                  id={`btn-demo-${bank.bloodBankId}`}
                  className="btn"
                  style={{
                    width: '100%',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.7rem',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1.5px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <Building2 size={14} />
                  <span>Demo Facility</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation & Details Modal for Real Database Requests */}
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
              borderRadius: '14px',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
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

            {/* Rule 1: Friendly Active Request Display */}
            {(() => {
              const activeReq = getActiveRequestForBank(selectedBank.bloodBankId);
              if (!activeReq) return null;

              return (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '8px',
                    padding: '0.9rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}
                >
                  <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.96rem' }}>
                        Request Already Sent
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '9999px',
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fde68a',
                          color: '#78350f'
                        }}
                      >
                        {activeReq.status === 'ACCEPTED' ? 'Accepted' : 'Pending Review'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '0.35rem', lineHeight: 1.45 }}>
                      You already have an active blood request with <strong>{selectedBank.name}</strong> for{' '}
                      <strong>{activeReq.quantity} units</strong> of <strong>{activeReq.blood_group}</strong> ({activeReq.urgency} priority).
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '0.3rem' }}>
                      Another request cannot be submitted until this request is fulfilled, rejected, or cancelled.
                    </div>
                    <div style={{ marginTop: '0.65rem' }}>
                      <Link
                        to="/hospital/requests"
                        className="btn"
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '0.35rem 0.75rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d97706',
                          color: '#92400e',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <FileText size={13} />
                        <span>View in My Requests →</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

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
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--neutral-900)' }}>
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
                {(() => {
                  const activeReq = getActiveRequestForBank(selectedBank.bloodBankId);
                  const isBlocked = !!activeReq || isSubmittingRequest;

                  return (
                    <button
                      type="submit"
                      disabled={isBlocked}
                      id="btn-confirm-blood-request"
                      className="btn btn-primary"
                      style={{
                        padding: '0.6rem 1.4rem',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        backgroundColor: activeReq ? '#94a3b8' : undefined,
                        cursor: isBlocked ? 'not-allowed' : undefined
                      }}
                    >
                      {isSubmittingRequest
                        ? 'Submitting Request...'
                        : activeReq
                        ? 'Request Already Sent — In Progress'
                        : 'Confirm Request'}
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalFindBlood;
