export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role?: string;
}

export interface AuthResponseData {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  fullName?: string;
  roles?: string[];
  onboardingCompleted?: boolean;
  isPremium?: boolean;
  avatarUrl?: string;
  otpDev?: string;
  verifyOtp?: boolean;
  user?: AuthUser;
}
