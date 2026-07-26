import { apiClient, ApiResponse } from './apiClient';

export const b2bService = {
  async getUniversityDashboard(): Promise<ApiResponse<any>> {
    return apiClient.get('/University/dashboard');
  },

  async getUniversityStudents(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/University/students');
  },

  async getEnterpriseInsights(): Promise<ApiResponse<any>> {
    return apiClient.get('/Enterprise/insights');
  },
};
