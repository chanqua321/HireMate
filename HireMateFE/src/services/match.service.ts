import { apiClient, ApiResponse } from './apiClient';

export interface MatchRequestDto {
  cvId?: string;
  jdText?: string;
  jdUrl?: string;
}

export interface MatchResultData {
  id: string;
  matchScore: number;
  summary: string;
  missingSkills?: string[];
  strengths?: string[];
  recommendations?: string[];
}

export const matchService = {
  async matchCvWithJd(dto: MatchRequestDto): Promise<ApiResponse<MatchResultData>> {
    return apiClient.post<MatchResultData>('/Match', dto);
  },

  async getMatchDetail(id: string): Promise<ApiResponse<MatchResultData>> {
    return apiClient.get<MatchResultData>(`/Match/${id}`);
  },
};
