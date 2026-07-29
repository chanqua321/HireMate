import { apiClient, ApiResponse } from './apiClient';

export interface OnboardingGoalDto {
  desiredIndustry: string;
  desiredPosition: string;
  experienceLevel: string;
}

export interface OnboardingPersonalDto {
  fullName: string;
  university: string;
  major: string;
  graduationYear: number;
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
