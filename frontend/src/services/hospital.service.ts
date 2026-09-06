import { apiRequest } from './api';
import type {
  HospitalProfile,
  RegisterHospitalInput,
  UpdateHospitalProfileInput,
  HospitalBloodSearchParams,
  HospitalBloodSearchResult,
  HospitalBloodRequest,
  CreateHospitalBloodRequestInput,
  HospitalAuthResponse,
  RegisteredFacility
} from '../types/hospital';

/**
 * Register a new Hospital organization and account.
 */
export const registerHospital = (input: RegisterHospitalInput) => {
  return apiRequest<HospitalAuthResponse>('/hospital/register', {
    method: 'POST',
    body: {
      hospitalName: input.hospitalName.trim(),
      name: input.hospitalName.trim(),
      officialEmail: input.officialEmail.trim().toLowerCase(),
      email: input.officialEmail.trim().toLowerCase(),
      password: input.password,
      phone: input.phone.trim(),
      city: input.city.trim(),
      fullAddress: input.fullAddress.trim(),
      address: input.fullAddress.trim(),
      openingHours: (input.openingHours?.trim() || '24/7 Available'),
      emergencyContact: input.emergencyContact?.trim() || undefined,
      hospitalType: input.hospitalType?.trim() || 'General Hospital'
    }
  });
};

/**
 * Authenticate hospital account using official credentials.
 */
export const loginHospital = (email: string, password: string) => {
  return apiRequest<HospitalAuthResponse>('/hospital/login', {
    method: 'POST',
    body: {
      email: email.trim().toLowerCase(),
      password
    }
  });
};

/**
 * Retrieve profile of the authenticated hospital.
 */
export const getHospitalProfile = (token: string) => {
  return apiRequest<{ success: boolean; data: HospitalProfile }>('/hospital/profile', {
    method: 'GET',
    token
  });
};

/**
 * Update authenticated hospital's editable profile information.
 */
export const updateHospitalProfile = (input: UpdateHospitalProfileInput, token: string) => {
  return apiRequest<{ success: boolean; message: string; data: HospitalProfile }>(
    '/hospital/profile',
    {
      method: 'PATCH',
      token,
      body: {
        hospitalName: input.hospitalName ?? input.name,
        name: input.hospitalName ?? input.name,
        phone: input.phone,
        city: input.city,
        fullAddress: input.fullAddress ?? input.address,
        address: input.fullAddress ?? input.address,
        openingHours: input.openingHours,
        emergencyContact: input.emergencyContact,
        hospitalType: input.hospitalType
      }
    }
  );
};

/**
 * Search available blood across registered Blood Banks with sufficient inventory.
 */
export const searchBloodForHospital = (params: HospitalBloodSearchParams, token?: string) => {
  const query = new URLSearchParams();

  if (params.bloodGroup) {
    query.set('bloodGroup', params.bloodGroup);
  }
  if (params.quantity !== undefined && params.quantity > 0) {
    query.set('quantity', String(params.quantity));
  }
  if (params.city && params.city.trim()) {
    query.set('city', params.city.trim());
  }
  if (params.urgency) {
    query.set('urgency', params.urgency);
  }
  if (params.facilityName && params.facilityName.trim()) {
    query.set('facilityName', params.facilityName.trim());
  }

  const queryString = query.toString();
  const path = `/hospital/blood/search${queryString ? `?${queryString}` : ''}`;

  return apiRequest<{
    success: boolean;
    count: number;
    data: HospitalBloodSearchResult[];
  }>(path, {
    method: 'GET',
    token
  });
};

/**
 * Retrieve registered Real Database Organizations (Blood Banks and Hospitals)
 * for autocomplete and facility selection.
 */
export const getHospitalOrganizations = (params?: { city?: string; query?: string }, token?: string) => {
  const q = new URLSearchParams();
  if (params?.city?.trim()) q.set('city', params.city.trim());
  if (params?.query?.trim()) q.set('query', params.query.trim());

  const qs = q.toString();
  const path = `/hospital/organizations${qs ? `?${qs}` : ''}`;

  return apiRequest<{
    success: boolean;
    count: number;
    data: RegisteredFacility[];
  }>(path, {
    method: 'GET',
    token
  });
};

/**
 * Submit a 1-to-1 blood request to a selected Blood Bank.
 * IMPORTANT: Does NOT decrease inventory.
 */
export const createHospitalBloodRequest = (
  input: CreateHospitalBloodRequestInput,
  token: string
) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { request: HospitalBloodRequest };
  }>('/hospital/requests', {
    method: 'POST',
    token,
    body: {
      bloodBankId: input.bloodBankId,
      bloodGroup: input.bloodGroup,
      quantity: input.quantity,
      urgency: input.urgency || 'NORMAL',
      message: input.message || input.notes,
      notes: input.notes,
      requiredDate: input.requiredDate,
      patientName: input.patientName
    }
  });
};

/**
 * Retrieve all blood requests submitted by this authenticated hospital.
 */
export const getHospitalRequests = (token: string) => {
  return apiRequest<{
    success: boolean;
    data: { requests: HospitalBloodRequest[] };
  }>('/hospital/requests', {
    method: 'GET',
    token
  });
};

/**
 * Retrieve details of a specific request owned by this hospital.
 */
export const getHospitalRequestById = (requestId: string, token: string) => {
  return apiRequest<{
    success: boolean;
    data: { request: HospitalBloodRequest };
  }>(`/hospital/requests/${requestId}`, {
    method: 'GET',
    token
  });
};

/**
 * Cancel a pending or accepted blood request.
 */
export const cancelHospitalRequest = (requestId: string, token: string) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { request: HospitalBloodRequest };
  }>(`/hospital/requests/${requestId}/cancel`, {
    method: 'PATCH',
    token
  });
};
