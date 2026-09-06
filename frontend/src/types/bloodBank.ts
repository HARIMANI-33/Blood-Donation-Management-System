import type { BloodGroup, UserRole } from './auth';

export type { BloodGroup };

export interface BloodBankProfile {
  id: string;
  organizationName: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  fullAddress: string;
  address: string;
  openingHours: string | null;
  operatingHours: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface BloodInventoryItem {
  id: string;
  bloodBankId?: string;
  bloodGroup: BloodGroup;
  quantity: number;
  updatedAt?: string;
}

export interface BloodBankAppointment {
  id: string;
  appointmentId: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string | null;
  donorBloodGroup: BloodGroup | null;
  donorCity: string | null;
  appointmentDate: string;
  appointmentTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterBloodBankInput {
  organizationName: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  fullAddress: string;
  openingHours: string;
}

export interface UpdateBloodBankProfileInput {
  organizationName?: string;
  name?: string;
  phone?: string;
  city?: string;
  fullAddress?: string;
  address?: string;
  openingHours?: string;
  operatingHours?: string;
}

export interface PublicBloodBank {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  operating_hours: string | null;
  type?: string;
  inventory: Array<{
    bloodGroup: BloodGroup;
    quantity: number;
    updatedAt?: string;
  }>;
}

export interface BloodAvailabilityResult {
  bloodBankId: string;
  bloodBankName: string;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  operatingHours: string | null;
  bloodGroup: BloodGroup;
  availableQuantity: number;
  updatedAt: string;
}

export type BloodRequestUrgency = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type BloodRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';

export interface IncomingHospitalBloodRequest {
  id: string;
  hospital_id: string;
  hospitalId?: string;
  blood_bank_id: string;
  bloodBankId?: string;
  hospital_name: string;
  hospitalName?: string;
  hospital_city?: string;
  hospital_phone?: string;
  hospital_address?: string;
  blood_group: BloodGroup;
  bloodGroup?: BloodGroup;
  quantity: number;
  urgency: BloodRequestUrgency;
  status: BloodRequestStatus;
  message?: string | null;
  notes?: string | null;
  required_date?: string | null;
  requiredDate?: string | null;
  patient_name?: string | null;
  patientName?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

