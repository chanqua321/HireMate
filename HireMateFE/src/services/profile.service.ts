import { apiClient, ApiResponse } from './apiClient';
import { Profile } from '../types';

/** Map BE ProfileDto → FE Profile */
export function mapProfileFromApi(data: any): Profile {
  return {
    name: data?.fullName || data?.name || '',
    role: data?.desiredPosition || data?.role || '',
    field: data?.desiredIndustry || data?.field || '',
    bio: data?.bio || '',
    exp: data?.experienceLevel || data?.exp || '',
    hobbies: Array.isArray(data?.hobbies) ? data.hobbies : [],
    isPremium: !!data?.isPremium,
    onboardingCompleted: !!data?.onboardingCompleted,
  };
}

/** Map FE Profile updates → BE UpdateProfileDto */
export function mapProfileToApi(updates: Partial<Profile> & Record<string, any>) {
  const body: Record<string, unknown> = {};
  if (updates.name !== undefined || updates.fullName !== undefined) {
    body.fullName = updates.fullName ?? updates.name;
  }
  if (updates.field !== undefined || updates.desiredIndustry !== undefined) {
    body.desiredIndustry = updates.desiredIndustry ?? updates.field;
  }
  if (updates.role !== undefined || updates.desiredPosition !== undefined) {
    body.desiredPosition = updates.desiredPosition ?? updates.role;
  }
  if (updates.exp !== undefined || updates.experienceLevel !== undefined) {
    body.experienceLevel = updates.experienceLevel ?? updates.exp;
  }
  if (updates.bio !== undefined) body.bio = updates.bio;
  if (updates.hobbies !== undefined) body.hobbies = updates.hobbies;
  if (updates.university !== undefined) body.university = updates.university;
  if (updates.major !== undefined) body.major = updates.major;
  if (updates.graduationYear !== undefined) body.graduationYear = updates.graduationYear;
  return body;
}

export const profileService = {
  async getProfile(): Promise<ApiResponse<Profile>> {
    const res = await apiClient.get<any>('/Profile');
    if (res.ok && res.data) {
      return { ...res, data: mapProfileFromApi(res.data) };
    }
    return res as ApiResponse<Profile>;
  },

  async updateProfile(updates: Partial<Profile> & Record<string, any>): Promise<ApiResponse<Profile>> {
    // BE requires FullName — fill from current session profile if missing
    const body = mapProfileToApi(updates);
    if (!body.fullName) {
      const current = await profileService.getProfile();
      body.fullName = current.data?.name || 'Người dùng HireMate';
      if (body.desiredIndustry === undefined && current.data?.field) {
        body.desiredIndustry = current.data.field;
      }
      if (body.desiredPosition === undefined && current.data?.role) {
        body.desiredPosition = current.data.role;
      }
      if (body.experienceLevel === undefined && current.data?.exp) {
        body.experienceLevel = current.data.exp;
      }
      if (body.bio === undefined && current.data?.bio) body.bio = current.data.bio;
      if (body.hobbies === undefined && current.data?.hobbies) body.hobbies = current.data.hobbies;
    }
    const res = await apiClient.put<any>('/Profile', body);
    if (res.ok && res.data) {
      return { ...res, data: mapProfileFromApi(res.data) };
    }
    return res as ApiResponse<Profile>;
  },
};
