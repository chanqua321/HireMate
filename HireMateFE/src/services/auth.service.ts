import { apiClient, ApiResponse } from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

/** Normalized shape used by FE after mapping BE AuthResponseDto. */
export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  confirmLinkDev?: string;
  user: {
    id?: string;
    email: string;
    fullName: string;
    role?: string;
  };
  onboardingCompleted?: boolean;
  isPremium?: boolean;
}

/** BE returns: token, refreshToken, email, fullName, roles, ... */
function normalizeAuthPayload(raw: any): AuthResponseData | null {
  if (!raw) return null;
  const accessToken = raw.accessToken || raw.token;
  if (!accessToken) return null;
  const roles: string[] = raw.roles || raw.user?.roles || [];
  return {
    accessToken,
    refreshToken: raw.refreshToken || '',
    confirmLinkDev: raw.confirmLinkDev,
    user: {
      id: raw.user?.id || raw.userId,
      email: raw.user?.email || raw.email || '',
      fullName: raw.user?.fullName || raw.fullName || '',
      role: raw.user?.role || roles[0],
    },
    onboardingCompleted: raw.onboardingCompleted,
    isPremium: raw.isPremium,
  };
}

function persistTokens(data: AuthResponseData) {
  localStorage.removeItem('hm_access_token');
  localStorage.removeItem('hm_refresh_token');
  sessionStorage.setItem('hm_access_token', data.accessToken);
  if (data.refreshToken) {
    sessionStorage.setItem('hm_refresh_token', data.refreshToken);
  }
  sessionStorage.setItem('hm_is_premium', data.isPremium ? '1' : '0');
}

async function postAuth(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<ApiResponse<AuthResponseData>> {
  const res = await apiClient.post<any>(endpoint, payload, { skipAuth: true });
  const normalized = normalizeAuthPayload(res.data);
  if (res.ok && normalized) {
    persistTokens(normalized);
    return { ...res, data: normalized };
  }
  return { ...res, data: normalized || undefined };
}

export const authService = {
  async login(payload: LoginRequest): Promise<ApiResponse<AuthResponseData>> {
    return postAuth('/Auth/login', payload as unknown as Record<string, unknown>);
  },

  async register(payload: RegisterRequest): Promise<ApiResponse<AuthResponseData>> {
    return postAuth('/Auth/register', payload as unknown as Record<string, unknown>);
  },

  async loginWithGoogle(idToken: string): Promise<ApiResponse<AuthResponseData>> {
    return postAuth('/Auth/login-google', { idToken });
  },

  async refreshToken(): Promise<ApiResponse<AuthResponseData>> {
    const refreshToken =
      sessionStorage.getItem('hm_refresh_token') || localStorage.getItem('hm_refresh_token') || '';
    return postAuth('/Auth/refresh', { refreshToken });
  },

  async logout(): Promise<ApiResponse<void>> {
    const refreshToken =
      sessionStorage.getItem('hm_refresh_token') || localStorage.getItem('hm_refresh_token') || '';
    const res = await apiClient.post<void>('/Auth/logout', { refreshToken });
    sessionStorage.removeItem('hm_access_token');
    sessionStorage.removeItem('hm_refresh_token');
    sessionStorage.removeItem('hm_is_premium');
    sessionStorage.removeItem('hm_plan_code');
    sessionStorage.removeItem('hm_onboarding_done');
    sessionStorage.removeItem('hm_post_onboarding');
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
    const res = await apiClient.get<any>('/Auth/me');
    if (res.ok && res.data) {
      const premium = !!(res.data.isPremium ?? res.data.IsPremium);
      sessionStorage.setItem('hm_is_premium', premium ? '1' : '0');
      res.data.isPremium = premium;
      const onboarded = !!(res.data.onboardingCompleted ?? res.data.OnboardingCompleted);
      res.data.onboardingCompleted = onboarded;
      sessionStorage.setItem('hm_onboarding_done', onboarded ? '1' : '0');
      const planCode = res.data.currentPlanCode || res.data.CurrentPlanCode;
      if (planCode) {
        const n = String(planCode).toLowerCase();
        const code = n === 'combo' || n === 'pro' ? 'combo' : n === 'premium' || n === 'basic' ? 'premium' : 'free';
        sessionStorage.setItem('hm_plan_code', code);
      } else if (premium) {
        sessionStorage.setItem('hm_plan_code', 'premium');
      } else {
        sessionStorage.setItem('hm_plan_code', 'free');
      }
    }
    return res;
  },
};
