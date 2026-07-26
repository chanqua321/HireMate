import { apiClient, ApiResponse } from './apiClient';
import { Profile } from '../types';

export const profileService = {
  async getProfile(): Promise<ApiResponse<Profile>> {
    return apiClient.get<Profile>('/Profile');
  },

  async updateProfile(updates: Partial<Profile>): Promise<ApiResponse<Profile>> {
    return apiClient.put<Profile>('/Profile', updates);
  },
};
