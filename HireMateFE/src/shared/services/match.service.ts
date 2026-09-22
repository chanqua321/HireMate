import { apiClient, ApiResponse } from '../api/apiClient';

export interface MatchRequestDto {
  cvDocumentId?: string;
  jobDescriptionId?: string;
  jdText?: string;
  saveJd?: boolean;
  jdTitle?: string;
}

export interface MatchResultDto {
  id: string;
  jobDescriptionId?: string | null;
  jdTitle?: string | null;
  cvDocumentId?: string | null;
  cvFileName?: string | null;
  matchScore?: number;
  overallScore?: number;
  matchedSkills?: string[];
  matchingSkills?: string[];
  missingSkills?: string[];
  experienceGaps?: string[];
  keywordGaps?: string[];
  strengths?: string[];
  recommendations?: string[];
  summary?: string;
  createdAt?: string;
  resultJson?: string;
  aiProvider?: string;
}

export const matchService = {
  async match(dto: MatchRequestDto): Promise<ApiResponse<MatchResultDto>> {
    return apiClient.post<MatchResultDto>('/Match', dto);
  },

  async getHistory(): Promise<ApiResponse<MatchResultDto[]>> {
    return apiClient.get<MatchResultDto[]>('/Match');
  },

  async getMatchDetail(id: string): Promise<ApiResponse<MatchResultDto>> {
    return apiClient.get<MatchResultDto>(`/Match/${id}`);
  },
};
