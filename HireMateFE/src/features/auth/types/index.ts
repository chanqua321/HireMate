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
  accessToken: string;
  refreshToken: string;
  confirmLinkDev?: string;
  user: AuthUser;
}
