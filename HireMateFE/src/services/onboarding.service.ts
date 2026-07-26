import { apiClient, ApiResponse } from './apiClient';

export interface OnboardingGoalDto {
  targetRole?: string;
  targetField?: string;
  targetLevel?: string;
}

export interface OnboardingPersonalDto {
  fullName?: string;
  bio?: string;
  experienceYears?: string;
  skills?: string[];
}

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
