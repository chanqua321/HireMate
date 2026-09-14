import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { DashboardStatsData } from '../types';

export const dashboardService = {
  async getDashboardStats(): Promise<ApiResponse<DashboardStatsData>> {
    return apiClient.get<DashboardStatsData>('/Dashboard');
  },
};
