import { apiRequest } from './api';
import type {
  DonorProfileResponse,
  UpdateProfileInput,
  BloodBanksResponse,
  AppointmentsResponse,
  BookAppointmentInput,
  BookAppointmentResponse,
  DonationsResponse,
  DonationCountResponse,
  EligibilityResponse,
  Appointment
} from '../types/donor';

/**
 * Fetch the authenticated donor's own profile.
 */
export const fetchDonorProfile = (token: string): Promise<DonorProfileResponse> =>
  apiRequest<DonorProfileResponse>('/donor/profile', { token });

/**
 * Update the authenticated donor's profile fields.
 */
export const updateDonorProfile = (token: string, input: UpdateProfileInput): Promise<DonorProfileResponse> =>
  apiRequest<DonorProfileResponse>('/donor/profile', { method: 'PUT', token, body: input });

/**
 * Fetch certified blood banks / donation centers, optionally filtered by city and/or search keyword.
 */
export const fetchBloodBanks = (
  token: string,
  filter?: string | { city?: string; search?: string }
): Promise<BloodBanksResponse> => {
  let query = '';
  if (typeof filter === 'string' && filter.trim()) {
    query = `?city=${encodeURIComponent(filter.trim())}`;
  } else if (filter && typeof filter === 'object') {
    const params = new URLSearchParams();
    if (filter.city && filter.city.trim()) params.append('city', filter.city.trim());
    if (filter.search && filter.search.trim()) params.append('search', filter.search.trim());
    const str = params.toString();
    if (str) query = `?${str}`;
  }
  return apiRequest<BloodBanksResponse>(`/donor/blood-banks${query}`, { token });
};

/**
 * Book a new donation appointment.
 */
export const bookAppointment = (token: string, input: BookAppointmentInput): Promise<BookAppointmentResponse> =>
  apiRequest<BookAppointmentResponse>('/donor/appointments', {
    method: 'POST',
    token,
    body: {
      ...input,
      organizationId: input.organizationId || input.bloodBankId,
      bloodBankId: input.bloodBankId || input.organizationId
    }
  });

/**
 * Fetch all appointments booked by the donor.
 */
export const fetchDonorAppointments = (token: string): Promise<AppointmentsResponse> =>
  apiRequest<AppointmentsResponse>('/donor/appointments', { token });

/**
 * Fetch the donor's single active upcoming appointment (one source of truth).
 */
export const fetchUpcomingAppointment = (token: string): Promise<{ success: boolean; data: { upcomingAppointment: Appointment | null } }> =>
  apiRequest('/donor/appointments/upcoming', { token });

/**
 * Fetch a single appointment details by ID.
 */
export const fetchAppointmentDetails = (token: string, id: string): Promise<{ success: boolean; data: { appointment: Appointment } }> =>
  apiRequest(`/donor/appointments/${id}`, { token });

/**
 * Cancel an upcoming appointment.
 */
export const cancelAppointment = (token: string, id: string): Promise<{ success: boolean; message: string; data: { appointment: Appointment } }> =>
  apiRequest(`/donor/appointments/${id}/cancel`, { method: 'PATCH', token });

/**
 * Fetch historical donation records for the donor.
 */
export const fetchDonorDonations = (token: string): Promise<DonationsResponse> =>
  apiRequest<DonationsResponse>('/donor/donations', { token });

/**
 * Fetch total completed donation count (dynamically calculated).
 */
export const fetchDonationCount = (token: string): Promise<DonationCountResponse> =>
  apiRequest<DonationCountResponse>('/donor/donations/count', { token });

/**
 * Fetch donor's live eligibility and readiness status.
 */
export const fetchEligibilityStatus = (token: string): Promise<EligibilityResponse> =>
  apiRequest<EligibilityResponse>('/donor/eligibility', { token });
