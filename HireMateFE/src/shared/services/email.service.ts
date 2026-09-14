import { apiClient, ApiResponse } from '../api/apiClient';

export interface EmailGenerateDto {
  type: string;
  position?: string;
  company?: string;
  tone?: string;
}

export interface GeneratedEmailResult {
  subject?: string;
  body?: string;
  emailText?: string;
  email?: string;
  provider?: string;
  usedFallback?: boolean;
  tips?: string[];
}

export const emailService = {
  async generateEmail(dto: EmailGenerateDto): Promise<ApiResponse<GeneratedEmailResult>> {
    return apiClient.post<GeneratedEmailResult>('/Email/generate', dto);
  },
};
