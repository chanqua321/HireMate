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
    const payload: UpdateProfileDto = {
      fullName: (updates as any).fullName || (updates as any).name || 'Ứng viên',
      desiredPosition: (updates as any).desiredPosition || (updates as any).role,
      desiredIndustry: (updates as any).desiredIndustry || (updates as any).field,
      experienceLevel: (updates as any).experienceLevel || (updates as any).exp,
      university: (updates as any).university || (updates as any).education,
      major: (updates as any).major || 'Công nghệ thông tin',
      graduationYear: (updates as any).graduationYear || 2026,
      bio: (updates as any).bio || '',
      hobbies: (updates as any).hobbies || (updates as any).skills || [],
    };
    return apiClient.put<any>('/Profile', payload);
  },
};
