import { apiClient, ApiResponse } from '../api/apiClient';

export interface BadgeItemDto {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  unlockedAt?: string;
  progressPercent: number;
}

export interface LeaderboardUserDto {
  rank: number;
  userName: string;
  overallScore: number;
  interviewsCompleted: number;
  badgeCount: number;
}

export interface BenchmarkDto {
  userScore: number;
  averageScore: number;
  top10PercentScore: number;
  percentile: number;
  industry: string;
  role: string;
}

export interface ReferralInfoDto {
  referralCode: string;
  referralLink: string;
  referredCount: number;
  rewardPoints: number;
}

export const growthService = {
  async getBadges(): Promise<ApiResponse<BadgeItemDto[]>> {
    return apiClient.get<BadgeItemDto[]>('/Gamification/badges');
  },

  async getLeaderboard(): Promise<ApiResponse<LeaderboardUserDto[]>> {
    return apiClient.get<LeaderboardUserDto[]>('/Gamification/leaderboard', { skipAuth: true });
  },

  async getBenchmark(): Promise<ApiResponse<BenchmarkDto>> {
    return apiClient.get<BenchmarkDto>('/Benchmark');
  },

  async getReferral(): Promise<ApiResponse<ReferralInfoDto>> {
    return apiClient.get<ReferralInfoDto>('/Referral/me');
  },

  async applyReferral(code: string): Promise<ApiResponse<any>> {
    return apiClient.post('/Referral/apply', { code });
  },
};
