import { apiClient, ApiResponse } from './apiClient';

export interface DashboardStatsData {
  totalInterviews: number;
  averageScore: number;
  completedInterviews: number;
  recentSessions?: any[];
  chartData?: any;
}

export const dashboardService = {
  async getDashboardStats(): Promise<ApiResponse<DashboardStatsData>> {
    return apiClient.get<DashboardStatsData>('/Dashboard');
  },
};
