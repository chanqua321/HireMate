import { apiClient, ApiResponse } from '../api/apiClient';

export interface MatchRequestDto {
  cvDocumentId?: string;
  jdText: string;
  cvId?: string;
  cvText?: string;
  jobTitle?: string;
  jobDescription?: string;
}

export interface MatchResultDto {
  id: string;
  matchScore?: number;
  overallScore?: number;
  atsCompatibility?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
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

  async getMatchDetail(id: string): Promise<ApiResponse<MatchResultDto>> {
    return apiClient.get<MatchResultDto>(`/Match/${id}`);
  },
};
