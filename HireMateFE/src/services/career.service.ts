import { apiClient, ApiResponse } from './apiClient';

export const careerService = {
  async getMemory(): Promise<ApiResponse<any>> {
    return apiClient.get('/Career/memory');
  },

  async getProfileHub(): Promise<ApiResponse<any>> {
    return apiClient.get('/Career/profile');
  },

  async getProgress(): Promise<ApiResponse<any>> {
    return apiClient.get('/Career/progress');
  },

  async getDevelopment(): Promise<ApiResponse<any>> {
    return apiClient.get('/Career/development');
  },

  async getPath(): Promise<ApiResponse<any>> {
    return apiClient.get('/Career/path');
  },

  async getLearning(): Promise<ApiResponse<any>> {
    return apiClient.get('/Career/learning');
  },
};
