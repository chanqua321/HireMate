import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { HistoryItem, InterviewResult } from '../../../shared/types';
import { CreateSessionDto, SubmitAnswerDto, SuggestedAnswerDto } from '../types';

export const interviewService = {
  async createSession(config: CreateSessionDto): Promise<ApiResponse<any>> {
    return apiClient.post('/Interview/sessions', config);
  },

  async getHistory(): Promise<ApiResponse<HistoryItem[]>> {
    return apiClient.get('/Interview/sessions');
  },

  async getDetail(sessionId: string): Promise<ApiResponse<InterviewResult>> {
    return apiClient.get(`/Interview/sessions/${sessionId}`);
  },

  async getQuestions(sessionId: string): Promise<ApiResponse<string[]>> {
    return apiClient.get(`/Interview/sessions/${sessionId}/questions`);
  },

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto): Promise<ApiResponse<any>> {
    return apiClient.post(`/Interview/sessions/${sessionId}/answers`, dto);
  },

  async completeSession(sessionId: string): Promise<ApiResponse<InterviewResult>> {
    return apiClient.post(`/Interview/sessions/${sessionId}/complete`);
  },

  async uploadVoice(sessionId: string, audioBlob: Blob, filename = 'voice.webm'): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    return apiClient.upload(`/Interview/sessions/${sessionId}/voice`, formData);
  },

  async getSuggestedAnswer(dto: SuggestedAnswerDto): Promise<ApiResponse<string>> {
    return apiClient.post('/Interview/suggested-answer', dto);
  },
};
