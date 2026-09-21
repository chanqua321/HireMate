import { apiClient, ApiResponse } from '../api/apiClient';

export interface JobDescriptionSummary {
  id: string;
  title: string;
  companyName?: string | null;
  position?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  contentLength: number;
  latestMatchScore?: number | null;
}

export interface JobDescriptionDetail extends JobDescriptionSummary {
  content: string;
  sourceUrl?: string | null;
}

export interface CreateJobDescriptionDto {
  title: string;
  companyName?: string;
  position?: string;
  content: string;
  sourceUrl?: string;
}

export interface UpdateJobDescriptionDto extends CreateJobDescriptionDto {}

export const jdService = {
  async list(includeArchived = false): Promise<ApiResponse<JobDescriptionSummary[]>> {
    return apiClient.get<JobDescriptionSummary[]>(`/Jd?includeArchived=${includeArchived}`);
  },

  async get(id: string): Promise<ApiResponse<JobDescriptionDetail>> {
    return apiClient.get<JobDescriptionDetail>(`/Jd/${id}`);
  },

  async create(dto: CreateJobDescriptionDto): Promise<ApiResponse<JobDescriptionDetail>> {
    return apiClient.post<JobDescriptionDetail>('/Jd', dto);
  },

  async update(id: string, dto: UpdateJobDescriptionDto): Promise<ApiResponse<JobDescriptionDetail>> {
    return apiClient.put<JobDescriptionDetail>(`/Jd/${id}`, dto);
  },

  async archive(id: string): Promise<ApiResponse<JobDescriptionSummary>> {
    return apiClient.delete<JobDescriptionSummary>(`/Jd/${id}`);
  },

  async listMatches(id: string): Promise<ApiResponse<import('./match.service').MatchResultDto[]>> {
    return apiClient.get(`/Jd/${id}/matches`);
  },
};
