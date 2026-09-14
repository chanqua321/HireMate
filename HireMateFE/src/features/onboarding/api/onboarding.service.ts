import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { OnboardingGoalDto, OnboardingPersonalDto } from '../types';

export const onboardingService = {
  async saveGoal(dto: OnboardingGoalDto): Promise<ApiResponse<any>> {
    return apiClient.put('/Onboarding/goal', {
      desiredIndustry: dto.desiredIndustry || 'Công nghệ thông tin',
      desiredPosition: dto.desiredPosition || 'Lập trình viên Backend',
      experienceLevel: dto.experienceLevel || '1 - 3 năm (Mid-level)',
    });
  },

  async savePersonal(dto: OnboardingPersonalDto): Promise<ApiResponse<any>> {
    return apiClient.put('/Onboarding/personal', {
      fullName: dto.fullName || 'Ứng viên',
      university: dto.university || 'Đại học Bách Khoa TP.HCM',
      major: dto.major || 'Công nghệ thông tin',
      graduationYear: dto.graduationYear || new Date().getFullYear(),
      bio: dto.bio || '',
      hobbies: dto.hobbies || [],
    });
  },

  async confirm(): Promise<ApiResponse<any>> {
    return apiClient.post('/Onboarding/confirm');
  },
};

