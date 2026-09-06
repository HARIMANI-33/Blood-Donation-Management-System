export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UserRole = 'donor' | 'hospital' | 'staff' | 'admin' | 'blood_bank';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bloodGroup: BloodGroup | null;
  city?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  bloodGroup?: BloodGroup;
  city: string;
  age?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalDonors: number;
  byBloodGroup: Record<string, number>;
}
