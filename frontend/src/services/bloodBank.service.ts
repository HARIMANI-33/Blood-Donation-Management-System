import { apiRequest } from './api';
import type {
  BloodBankProfile,
  BloodInventoryItem,
  BloodBankAppointment,
  RegisterBloodBankInput,
  UpdateBloodBankProfileInput,
  PublicBloodBank,
  BloodAvailabilityResult,
  IncomingHospitalBloodRequest
} from '../types/bloodBank';
import type { User } from '../types/auth';

export interface BloodBankAuthResponse {
  success: boolean;
  message: string;
  data: {
    bloodBank: {
      id: string;
      name: string;
      email: string;
      phone: string;
      city: string;
      address: string;
      operatingHours: string;
      role: string;
      createdAt: string;
    };
    token: string;
    user?: User;
  };
}

/**
 * Register a new Blood Bank organization.
 */
export const registerBloodBank = (input: RegisterBloodBankInput) => {
  return apiRequest<BloodBankAuthResponse>('/blood-banks/register', {
    method: 'POST',
    body: {
      name: input.organizationName?.trim(),
      organizationName: input.organizationName?.trim(),
      email: input.email?.trim().toLowerCase(),
      password: input.password,
      phone: input.phone?.trim(),
      city: input.city?.trim(),
      address: input.fullAddress?.trim(),
      fullAddress: input.fullAddress?.trim(),
      operatingHours: (input.openingHours?.trim() || '08:00 AM - 08:00 PM'),
      openingHours: (input.openingHours?.trim() || '08:00 AM - 08:00 PM'),
      role: 'blood_bank'
    }
  });
};

/**
 * Retrieve profile of authenticated Blood Bank.
 */
export const getBloodBankProfile = (token: string) => {
  return apiRequest<{ success: boolean; data: { profile: BloodBankProfile } }>(
    '/blood-banks/me/profile',
    { method: 'GET', token }
  );
};

/**
 * Update authenticated Blood Bank profile.
 */
export const updateBloodBankProfile = (input: UpdateBloodBankProfileInput, token: string) => {
  return apiRequest<{ success: boolean; message: string; data: { profile: BloodBankProfile } }>(
    '/blood-banks/me/profile',
    { method: 'PUT', body: input, token }
  );
};

/**
 * Get complete 8-group inventory for authenticated Blood Bank.
 */
export const getBloodBankInventory = (token: string) => {
  return apiRequest<{
    success: boolean;
    data: {
      bloodBankId: string;
      bloodBankName: string;
      inventory: BloodInventoryItem[];
    };
  }>('/blood-banks/me/inventory', { method: 'GET', token });
};

/**
 * Update quantity for a specific blood group.
 */
export const updateBloodBankInventory = (bloodGroup: string, quantity: number, token: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { item: BloodInventoryItem };
  }>(`/blood-banks/me/inventory/${encodeURIComponent(bloodGroup)}`, {
    method: 'PUT',
    body: { quantity },
    token
  });
};

/**
 * Retrieve donor appointments for authenticated Blood Bank.
 */
export const getBloodBankAppointments = (token: string, status?: string) => {
  const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<{
    success: boolean;
    data: { appointments: BloodBankAppointment[] };
  }>(`/blood-banks/me/appointments${query}`, { method: 'GET', token });
};

/**
 * Approve a donor appointment (transitions from PENDING to CONFIRMED).
 * Note: Does not change blood inventory.
 */
export const approveAppointment = (appointmentId: string, token: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { appointment: unknown };
  }>(`/blood-banks/me/appointments/${appointmentId}/approve`, {
    method: 'PATCH',
    token
  });
};

/**
 * Reject a donor appointment.
 */
export const rejectAppointment = (appointmentId: string, token: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { appointment: unknown };
  }>(`/blood-banks/me/appointments/${appointmentId}/reject`, {
    method: 'PATCH',
    token
  });
};

/**
 * Mark appointment as COMPLETED, record donation, and atomically increment blood inventory.
 */
export const completeDonation = (
  appointmentId: string,
  token: string,
  quantityMl: number = 450,
  unitsToAdd: number = 1
) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: {
      donation: unknown;
      appointment: unknown;
      updatedInventory: {
        bloodGroup: string;
        newQuantity: number;
        updatedAt: string;
      };
    };
  }>(`/blood-banks/me/appointments/${appointmentId}/complete`, {
    method: 'POST',
    body: { quantityMl, unitsToAdd },
    token
  });
};

/**
 * Public search for registered blood banks, optionally filtered by city.
 */
export const getPublicBloodBanks = (city?: string) => {
  const query = city && city.trim() ? `?city=${encodeURIComponent(city.trim())}` : '';
  return apiRequest<{
    success: boolean;
    data: { bloodBanks: PublicBloodBank[] };
  }>(`/blood-banks${query}`, { method: 'GET' });
};

/**
 * Search blood availability matching city, blood group, and required quantity.
 */
export const searchBloodAvailability = (city?: string, bloodGroup?: string, quantity?: number) => {
  const params = new URLSearchParams();
  if (city && city.trim()) params.append('city', city.trim());
  if (bloodGroup && bloodGroup.trim()) params.append('bloodGroup', bloodGroup.trim());
  if (quantity && quantity > 0) params.append('quantity', String(quantity));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{
    success: boolean;
    data: { count: number; results: BloodAvailabilityResult[] };
  }>(`/blood-banks/search${qs}`, { method: 'GET' });
};

/**
 * Retrieve incoming hospital blood requests for the authenticated blood bank.
 */
export const getIncomingBloodRequests = (token: string) => {
  return apiRequest<{
    success: boolean;
    data: { requests: IncomingHospitalBloodRequest[] };
  }>('/blood-banks/me/requests', {
    method: 'GET',
    token
  });
};

/**
 * Accept an incoming hospital blood request.
 */
export const acceptBloodRequest = (requestId: string, token: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { request: IncomingHospitalBloodRequest };
  }>(`/blood-banks/me/requests/${requestId}/accept`, {
    method: 'PATCH',
    token
  });
};

/**
 * Reject an incoming hospital blood request.
 */
export const rejectBloodRequest = (requestId: string, token: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { request: IncomingHospitalBloodRequest };
  }>(`/blood-banks/me/requests/${requestId}/reject`, {
    method: 'PATCH',
    token
  });
};

/**
 * Safely fulfill an incoming hospital blood request and atomically deduct inventory.
 */
export const fulfillBloodRequest = (requestId: string, token: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: {
      request: IncomingHospitalBloodRequest;
      remainingInventory: number;
    };
  }>(`/blood-banks/me/requests/${requestId}/fulfill`, {
    method: 'PATCH',
    token
  });
};

