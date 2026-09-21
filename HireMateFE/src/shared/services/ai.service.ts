import { apiClient, ApiResponse } from '../api/apiClient';

export type AiAssistMode = 'polish' | 'expand' | 'shorten' | 'translate';

export interface AiAssistRequest {
  text: string;
  mode: AiAssistMode;
  targetLang?: 'vi' | 'en';
  field?: string;
  context?: string;
}

export interface AiAssistResult {
  text: string;
  originalContent?: string;
  proposedContent?: string;
  changed?: boolean;
  mode: string;
  targetLang?: string;
  provider?: string;
}

export interface FeatureQuota {
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
}

export interface QuotaUsage {
  planCode?: string;
  period?: string;
  interview?: FeatureQuota;
  cvAnalysis?: FeatureQuota;
  jdMatch?: FeatureQuota;
  cvEmailGeneration?: FeatureQuota;
}

export const aiService = {
  async assist(dto: AiAssistRequest): Promise<ApiResponse<AiAssistResult>> {
    return apiClient.post<AiAssistResult>('/Ai/assist', {
      text: dto.text,
      mode: dto.mode,
      targetLang: dto.targetLang,
      field: dto.field ?? 'bio',
      context: dto.context,
    });
  },

  async getUsage(): Promise<ApiResponse<QuotaUsage>> {
    return apiClient.get<QuotaUsage>('/Ai/usage');
  },
};
