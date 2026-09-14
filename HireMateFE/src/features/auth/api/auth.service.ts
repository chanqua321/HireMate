import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { LoginRequest, RegisterRequest, AuthResponseData } from '../types';

export const authService = {
  async login(payload: LoginRequest): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiClient.post<AuthResponseData>('/Auth/login', payload, { skipAuth: true });
    if (res.ok && res.data?.accessToken) {
      localStorage.setItem('hm_access_token', res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem('hm_refresh_token', res.data.refreshToken);
      }
    }
    return res;
  },

  async register(payload: RegisterRequest): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiClient.post<AuthResponseData>('/Auth/register', payload, { skipAuth: true });
    if (res.ok && res.data?.accessToken) {
      localStorage.setItem('hm_access_token', res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem('hm_refresh_token', res.data.refreshToken);
      }
    }
    return res;
  },

  async loginWithGoogle(idToken: string): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiClient.post<AuthResponseData>('/Auth/login-google', { idToken }, { skipAuth: true });
    if (res.ok && res.data?.accessToken) {
      localStorage.setItem('hm_access_token', res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem('hm_refresh_token', res.data.refreshToken);
      }
    }
    return res;
  },

  async refreshToken(): Promise<ApiResponse<AuthResponseData>> {
    const refreshToken = localStorage.getItem('hm_refresh_token') || '';
    const res = await apiClient.post<AuthResponseData>('/Auth/refresh', { refreshToken }, { skipAuth: true });
    if (res.ok && res.data?.accessToken) {
      localStorage.setItem('hm_access_token', res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem('hm_refresh_token', res.data.refreshToken);
      }
    }
    return res;
  },

  async logout(): Promise<ApiResponse<void>> {
    const refreshToken = localStorage.getItem('hm_refresh_token') || '';
    const res = await apiClient.post<void>('/Auth/logout', { refreshToken });
    localStorage.removeItem('hm_access_token');
    localStorage.removeItem('hm_refresh_token');
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

  async getMe(): Promise<ApiResponse<any>> {
    return apiClient.get('/Auth/me');
  },
};
