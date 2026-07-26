import { apiClient, ApiResponse } from './apiClient';

export interface ApplyReferralDto {
  referralCode: string;
}

export const growthService = {
  async getMyReferral(): Promise<ApiResponse<any>> {
    return apiClient.get('/Referral/me');
  },

  async applyReferralCode(dto: ApplyReferralDto): Promise<ApiResponse<any>> {
    return apiClient.post('/Referral/apply', dto);
  },

  async getBadges(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Gamification/badges');
  },

  async getLeaderboard(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Gamification/leaderboard', { skipAuth: true });
  },

  async getBenchmark(): Promise<ApiResponse<any>> {
    return apiClient.get('/Benchmark');
  },
};
