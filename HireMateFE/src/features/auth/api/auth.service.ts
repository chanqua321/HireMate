import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { SOLE_ADMIN_EMAIL } from '../../../shared/config/constants';
import { LoginRequest, RegisterRequest, AuthResponseData } from '../types';

const emailFromAuthData = (data: AuthResponseData | any): string => {
  const direct = data?.email || data?.user?.email;
  if (direct) return String(direct);
  const token = data?.token || data?.accessToken;
  if (!token || typeof token !== 'string') return '';
  try {
    const part = token.split('.')[1];
    if (!part) return '';
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return json.email || json['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
  } catch {
    return '';
  }
};

const persistSession = (data: AuthResponseData | any) => {
  const token = data?.token || data?.accessToken;
  const refreshToken = data?.refreshToken;
  if (token) localStorage.setItem('hm_access_token', token);
  if (refreshToken) localStorage.setItem('hm_refresh_token', refreshToken);

  const email = emailFromAuthData(data);
  if (email) localStorage.setItem('hm_user_email', email);

  const avatar = data?.avatarUrl || data?.user?.avatarUrl;
  if (avatar) localStorage.setItem('hm_avatar_url', String(avatar));
  else localStorage.removeItem('hm_avatar_url');

  const roles = data?.roles || data?.user?.roles || [];
  if (Array.isArray(roles) && roles.length > 0) {
    localStorage.setItem('hm_roles', JSON.stringify(roles));
  }
};

export const isSoleAdminSession = (data: AuthResponseData | any): boolean => {
  const email = emailFromAuthData(data);
  const roles = data?.roles || data?.user?.roles || [];
  const hasAdmin = Array.isArray(roles)
    ? roles.some((r: string) => typeof r === 'string' && r.toLowerCase() === 'admin')
    : String(roles).toLowerCase().includes('admin');
  return email.trim().toLowerCase() === SOLE_ADMIN_EMAIL && hasAdmin;
};

export const authService = {
  async login(payload: LoginRequest): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiClient.post<AuthResponseData>('/Auth/login', payload, { skipAuth: true });
    if (res.ok && res.data) persistSession(res.data);
    return res;
  },

  async register(payload: RegisterRequest): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiClient.post<AuthResponseData>('/Auth/register', payload, { skipAuth: true });
    if (res.ok && res.data) persistSession(res.data);
    return res;
  },

  async loginWithGoogle(idToken: string): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiClient.post<AuthResponseData>('/Auth/login-google', { idToken }, { skipAuth: true });
    if (res.ok && res.data) persistSession(res.data);
    return res;
  },

  async refreshToken(): Promise<ApiResponse<AuthResponseData>> {
    const refreshToken = localStorage.getItem('hm_refresh_token') || '';
    const res = await apiClient.post<AuthResponseData>('/Auth/refresh', { refreshToken }, { skipAuth: true });
    if (res.ok && res.data) persistSession(res.data);
    return res;
  },

  async logout(): Promise<ApiResponse<void>> {
    const refreshToken = localStorage.getItem('hm_refresh_token') || '';
    const res = await apiClient.post<void>('/Auth/logout', { refreshToken });
    localStorage.removeItem('hm_access_token');
    localStorage.removeItem('hm_refresh_token');
    localStorage.removeItem('hm_user_email');
    localStorage.removeItem('hm_roles');
    localStorage.removeItem('hm_avatar_url');
    return res;
  },

  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    return apiClient.post('/Auth/forgot-password', { email }, { skipAuth: true });
  },

  async resetPassword(email: string, token: string, newPassword: string): Promise<ApiResponse<any>> {
    return apiClient.post('/Auth/reset-password', { email, token, newPassword }, { skipAuth: true });
  },

  async resendConfirmEmail(email: string): Promise<ApiResponse<any>> {
    return apiClient.post('/Auth/resend-confirm-email', { email }, { skipAuth: true });
  },

  async verifyEmailOtp(email: string, otp: string): Promise<ApiResponse<any>> {
    return apiClient.post('/Auth/verify-otp', { email, otp }, { skipAuth: true });
  },

  async getMe(): Promise<ApiResponse<any>> {
    return apiClient.get('/Auth/me');
  },
};
