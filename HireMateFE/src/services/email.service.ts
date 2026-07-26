import { apiClient, ApiResponse } from './apiClient';

export interface EmailGenerateDto {
  emailType?: string;
  recipientName?: string;
  companyName?: string;
  roleName?: string;
  context?: string;
  tone?: string;
}

export interface GeneratedEmailResult {
  subject: string;
  body: string;
  tips?: string[];
}

export const emailService = {
  async generateEmail(dto: EmailGenerateDto): Promise<ApiResponse<GeneratedEmailResult>> {
    return apiClient.post<GeneratedEmailResult>('/Email/generate', dto);
  },
};
