import { apiRequest } from './api';
import type { AuthResponse, LoginInput, RegisterInput, DashboardStats } from '../types/auth';

export const registerUser = (input: RegisterInput): Promise<AuthResponse> =>
  apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input });

export const loginUser = (input: LoginInput): Promise<AuthResponse> =>
  apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input });

export const fetchDashboardStats = (token: string): Promise<{ success: boolean; data: DashboardStats }> =>
  apiRequest('/dashboard/stats', { token });
