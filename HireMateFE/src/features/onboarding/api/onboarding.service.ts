import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { OnboardingGoalDto, OnboardingPersonalDto } from '../types';

export const onboardingService = {
  async saveGoal(dto: OnboardingGoalDto): Promise<ApiResponse<any>> {
    // Chỉ gửi field có giá trị thật — không dùng fallback hardcode để tránh ghi đè dữ liệu user
    const payload: Record<string, any> = {};
    if (dto.desiredIndustry) payload.desiredIndustry = dto.desiredIndustry;
    if (dto.desiredPosition) payload.desiredPosition = dto.desiredPosition;
    if (dto.experienceLevel) payload.experienceLevel = dto.experienceLevel;
    return apiClient.put('/Onboarding/goal', payload);
  },

  async savePersonal(dto: OnboardingPersonalDto): Promise<ApiResponse<any>> {
    // Chỉ gửi field có giá trị thật — tránh ghi đè fullName thành 'Ứng viên' khi form rỗng
    const payload: Record<string, any> = {};
    if (dto.fullName?.trim()) payload.fullName = dto.fullName.trim();
    if (dto.university) payload.university = dto.university;
    if (dto.major) payload.major = dto.major;
    if (dto.graduationYear) payload.graduationYear = dto.graduationYear;
    if (dto.bio) payload.bio = dto.bio;
    if (dto.hobbies?.length) payload.hobbies = dto.hobbies;
    return apiClient.put('/Onboarding/personal', payload);
  },

  async confirm(): Promise<ApiResponse<any>> {
    return apiClient.post('/Onboarding/confirm');
  },
};

