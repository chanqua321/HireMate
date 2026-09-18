import { apiClient, ApiResponse } from '../api/apiClient';
import { Profile } from '../types';

export interface UpdateProfileDto {
  fullName?: string;
  desiredIndustry?: string;
  desiredPosition?: string;
  experienceLevel?: string;
  university?: string;
  major?: string;
  graduationYear?: number;
  bio?: string;
  hobbies?: string[];
  [key: string]: any;
}

export const profileService = {
  async getProfile(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/Profile');
  },

  async updateProfile(updates: UpdateProfileDto | Partial<Profile>): Promise<ApiResponse<any>> {
    // Chỉ gửi field có giá trị thật — không dùng fallback cứng để tránh ghi đè dữ liệu user
    const raw = updates as any;
    const payload: UpdateProfileDto = {};
    const fullName = raw.fullName?.trim() || raw.name?.trim();
    const placeholderNames = new Set([
      'người dùng google',
      'người dùng',
      'ứng viên',
      'ứng viên hiremate',
    ]);
    if (fullName && !placeholderNames.has(fullName.toLowerCase())) payload.fullName = fullName;
    const desiredPosition = raw.desiredPosition?.trim() || raw.role?.trim();
    if (desiredPosition) payload.desiredPosition = desiredPosition;
    const desiredIndustry = raw.desiredIndustry?.trim() || raw.field?.trim();
    if (desiredIndustry) payload.desiredIndustry = desiredIndustry;
    const experienceLevel = raw.experienceLevel?.trim() || raw.exp?.trim();
    if (experienceLevel) payload.experienceLevel = experienceLevel;
    const university = raw.university?.trim() || raw.education?.trim();
    if (university) payload.university = university;
    if (raw.major?.trim()) payload.major = raw.major.trim();
    if (raw.graduationYear && raw.graduationYear > 0) payload.graduationYear = raw.graduationYear;
    if (raw.bio?.trim()) payload.bio = raw.bio.trim();
    const hobbies = raw.hobbies || raw.skills;
    if (hobbies?.length) payload.hobbies = hobbies;
    if (Object.keys(payload).length === 0) {
      return { ok: true, status: 200, data: undefined, message: '' };
    }
    return apiClient.put<any>('/Profile', payload);
  },
};
