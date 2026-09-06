import type { BloodGroup, User } from './auth';

export interface BloodBank {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  operating_hours: string | null;
  type?: 'BLOOD_BANK' | 'HOSPITAL' | 'DONATION_CENTER' | string;
  is_donation_capable?: boolean;
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  donor_id: string;
  blood_bank_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  blood_bank_name?: string;
  blood_bank_address?: string;
  blood_bank_city?: string;
  blood_bank_phone?: string;
}

export interface BookAppointmentInput {
  bloodBankId: string;
  organizationId?: string;
  appointmentDate: string;
  appointmentTime: string;
  bloodGroup?: string;
  notes?: string;
}

export type DonationStatus = 'COMPLETED' | 'REJECTED' | 'TESTING_PENDING';

export interface DonationRecord {
  id: string;
  donor_id: string;
  blood_bank_id: string;
  appointment_id: string | null;
  donation_date: string;
  blood_group: BloodGroup;
  quantity_ml: number;
  status: DonationStatus;
  blood_bank_name?: string;
  blood_bank_city?: string;
}

export interface EligibilityStatus {
  isEligible: boolean;
  nextEligibleDate: string;
  daysRemaining: number;
  statusMessage: string;
  lastDonationDate: string | null;
  hasUpcomingAppointment: boolean;
  upcomingAppointment: Appointment | null;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  bloodGroup?: BloodGroup | null;
  city?: string | null;
}

export interface DonorProfileResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export interface BloodBanksResponse {
  success: boolean;
  data: {
    bloodBanks: BloodBank[];
  };
}

export interface AppointmentsResponse {
  success: boolean;
  data: {
    appointments: Appointment[];
  };
}

export interface BookAppointmentResponse {
  success: boolean;
  message: string;
  data: {
    appointment: Appointment;
  };
}

export interface DonationsResponse {
  success: boolean;
  data: {
    donations: DonationRecord[];
  };
}

export interface DonationCountResponse {
  success: boolean;
  data: {
    totalDonations: number;
  };
}

export interface EligibilityResponse {
  success: boolean;
  data: EligibilityStatus;
}
