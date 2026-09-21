import { apiClient, ApiResponse } from '../api/apiClient';
import { Profile } from '../types';

export interface CvExperienceItem {
  title?: string;
  org?: string;
  period?: string;
  description?: string;
}

export interface CvProjectItem {
  name?: string;
  description?: string;
  role?: string;
  technologies?: string[];
  url?: string;
  period?: string;
}

export interface CvCertificationItem {
  name?: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

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
  skills?: string[];
  experiences?: CvExperienceItem[];
  projects?: CvProjectItem[];
  certifications?: CvCertificationItem[];
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
    if (typeof raw.bio === 'string') payload.bio = raw.bio.trim();
    if (Array.isArray(raw.hobbies)) payload.hobbies = raw.hobbies;
    if (Array.isArray(raw.skills)) {
      payload.skills = raw.skills;
      if (!payload.hobbies) payload.hobbies = raw.skills;
    }
    if (Array.isArray(raw.experiences)) payload.experiences = raw.experiences;
    if (Array.isArray(raw.projects)) payload.projects = raw.projects;
    if (Array.isArray(raw.certifications)) payload.certifications = raw.certifications;
    if (Object.keys(payload).length === 0) {
      return { ok: true, status: 200, data: undefined, message: '' };
    }
    return apiClient.put<any>('/Profile', payload);
  },
};
