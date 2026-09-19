import { apiClient, ApiResponse } from '../api/apiClient';

export interface CvItemDto {
  id: string;
  fileName: string;
  fileUrl?: string;
  fileSizeBytes?: number;
  uploadedAt: string;
  rawText?: string;
  analyzedAt?: string;
  overallScore?: number;
  formatScore?: number;
  keywordsScore?: number;
  readabilityScore?: number;
  professionalismScore?: number;
  analysis?: string;
  targetRole?: string;
  isConfirmed?: boolean;
  IsConfirmed?: boolean;
  readinessScore?: number;
  parsedProfile?: {
    fullName?: string;
    desiredPosition?: string;
    experienceYears?: string;
    education?: string;
    skills?: string[];
    bio?: string;
  };
}


export interface CvAnalysisResultDto {
  id: string;
  cvId: string;
  overallScore: number;
  atsScore?: number;
  formatScore?: number;
  keywordsScore?: number;
  readabilityScore?: number;
  professionalismScore?: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  parsedName?: string;
  parsedRole?: string;
  parsedSkills?: string[];
  parsedExp?: string;
  parsedEducation?: string;
  parsedBio?: string;
}

export interface CvExperienceDto {
  title?: string;
  org?: string;
  period?: string;
  description?: string;
}

export interface CvWizardDto {
  fullName: string;
  university: string;
  major: string;
  graduationYear: number;
  desiredIndustry: string;
  desiredPosition: string;
  experienceLevel: string;
  bio?: string;
  skills: string[];
  experiences: CvExperienceDto[];
}

export const cvService = {
  async uploadCv(file: File): Promise<ApiResponse<CvItemDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return apiClient.upload<CvItemDto>('/Cv/upload', formData);
  },

  async createCvFromWizard(dto: CvWizardDto): Promise<ApiResponse<CvItemDto>> {
    return apiClient.post<CvItemDto>('/Cv/wizard', dto);
  },

  async listCvs(): Promise<ApiResponse<CvItemDto[]>> {
    return apiClient.get<CvItemDto[]>('/Cv');
  },

  async getCv(id: string): Promise<ApiResponse<CvItemDto>> {
    return apiClient.get<CvItemDto>(`/Cv/${id}`);
  },

  async analyzeCv(id: string): Promise<ApiResponse<CvAnalysisResultDto>> {
    return apiClient.post<CvAnalysisResultDto>(`/Cv/${id}/analyze`);
  },
};

