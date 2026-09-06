import { apiRequest } from './api';
import type { AuthResponse, LoginInput, RegisterInput, DashboardStats } from '../types/auth';

export const registerUser = (input: RegisterInput): Promise<AuthResponse> =>
  apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input });

export const loginUser = (input: LoginInput): Promise<AuthResponse> =>
  apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input });

export const fetchDashboardStats = (token: string): Promise<{ success: boolean; data: DashboardStats }> =>
  apiRequest('/dashboard/stats', { token });

export const googleAuthUser = (payload: {
  token?: string;
  credential?: string;
  accessToken?: string;
  access_token?: string;
}): Promise<AuthResponse> =>
  apiRequest<AuthResponse>('/auth/google', { method: 'POST', body: payload });

export const changeUserPassword = (
  input: { currentPassword?: string; newPassword: string },
  token: string
): Promise<{ success: boolean; message: string }> =>
  apiRequest<{ success: boolean; message: string }>('/auth/change-password', {
    method: 'POST',
    body: input,
    token
  });
