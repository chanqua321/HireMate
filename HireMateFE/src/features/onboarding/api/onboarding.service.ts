import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { OnboardingGoalDto, OnboardingPersonalDto } from '../types';

export const onboardingService = {
  async saveGoal(dto: OnboardingGoalDto): Promise<ApiResponse<any>> {
    return apiClient.put('/Onboarding/goal', dto);
  },

  async savePersonal(dto: OnboardingPersonalDto): Promise<ApiResponse<any>> {
    return apiClient.put('/Onboarding/personal', dto);
  },

  async confirm(): Promise<ApiResponse<any>> {
    return apiClient.post('/Onboarding/confirm');
  },
};
