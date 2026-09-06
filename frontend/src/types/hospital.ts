import type { BloodGroup, User } from './auth';

export type BloodRequestUrgency = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type BloodRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';

export interface HospitalProfile {
  id: string;
  hospitalId: string;
  userId?: string | null;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  openingHours?: string | null;
  emergencyContact?: string | null;
  hospitalType?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterHospitalInput {
  hospitalName: string;
  officialEmail: string;
  password: string;
  phone: string;
  city: string;
  fullAddress: string;
  openingHours?: string;
  emergencyContact?: string;
  hospitalType?: string;
}

export interface UpdateHospitalProfileInput {
  hospitalName?: string;
  name?: string;
  phone?: string;
  city?: string;
  fullAddress?: string;
  address?: string;
  openingHours?: string;
  emergencyContact?: string;
  hospitalType?: string;
}

export interface HospitalBloodSearchParams {
  bloodGroup?: BloodGroup | string;
  quantity?: number;
  city?: string;
  urgency?: BloodRequestUrgency | string;
  facilityName?: string;
}

export interface HospitalBloodSearchResult {
  bloodBankId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  openingHours: string;
  bloodGroup: BloodGroup;
  availableQuantity: number;
  canFulfill: boolean;
  isLive?: boolean;
  source?: 'LIVE' | 'DEMO';
  type?: string;
}

export interface RegisteredFacility {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  openingHours?: string;
  type: string;
  isLive: boolean;
}

export interface HospitalBloodRequest {
  id: string;
  requestId?: string;
  hospital_id?: string;
  hospitalId?: string;
  blood_bank_id?: string;
  bloodBankId?: string;
  blood_group: BloodGroup;
  bloodGroup?: BloodGroup;
  quantity: number;
  urgency: BloodRequestUrgency;
  message?: string | null;
  notes?: string | null;
  required_date?: string | null;
  requiredDate?: string | null;
  patient_name?: string | null;
  patientName?: string | null;
  status: BloodRequestStatus;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;

  // Joined details
  blood_bank_name?: string;
  bloodBankName?: string;
  blood_bank_city?: string;
  bloodBankCity?: string;
  blood_bank_phone?: string;
  bloodBankPhone?: string;
  blood_bank_address?: string;
  bloodBankAddress?: string;
}

export interface CreateHospitalBloodRequestInput {
  bloodBankId: string;
  bloodGroup: BloodGroup;
  quantity: number;
  urgency?: BloodRequestUrgency;
  message?: string;
  notes?: string;
  requiredDate?: string;
  patientName?: string;
}

export interface HospitalAuthResponse {
  success: boolean;
  message: string;
  token: string;
  user?: User;
  data: {
    hospital: HospitalProfile;
    user: User;
    token: string;
  };
}
