import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import {
  CreateSessionDto,
  SubmitAnswerDto,
  SuggestedAnswerDto,
  InterviewQuestionItem,
  InterviewSessionSummary,
  InterviewSessionDetail,
} from '../types';

export const interviewService = {
  async createSession(config: CreateSessionDto): Promise<ApiResponse<InterviewSessionSummary>> {
    const payload = {
      industry: config.industry || config.field || 'Công nghệ thông tin',
      position: config.position || config.role || 'Lập trình viên Frontend',
      difficulty: config.difficulty || 'Trung bình',
      mode: config.mode || 'Text',
      questionCount: config.questionCount || 5,
    };
    return apiClient.post<InterviewSessionSummary>('/Interview/sessions', payload);
  },

  async getHistory(): Promise<ApiResponse<InterviewSessionSummary[]>> {
    return apiClient.get<InterviewSessionSummary[]>('/Interview/sessions');
  },

  async getDetail(sessionId: string): Promise<ApiResponse<InterviewSessionDetail>> {
    return apiClient.get<InterviewSessionDetail>(`/Interview/sessions/${sessionId}`);
  },

  async getQuestions(sessionId: string): Promise<ApiResponse<InterviewQuestionItem[]>> {
    return apiClient.get<InterviewQuestionItem[]>(`/Interview/sessions/${sessionId}/questions`);
  },

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto): Promise<ApiResponse<any>> {
    return apiClient.post(`/Interview/sessions/${sessionId}/answers`, dto);
  },

  async completeSession(sessionId: string): Promise<ApiResponse<InterviewSessionDetail>> {
    return apiClient.post<InterviewSessionDetail>(`/Interview/sessions/${sessionId}/complete`);
  },

  async uploadVoice(sessionId: string, audioBlob: Blob, filename = 'voice.webm'): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    return apiClient.upload(`/Interview/sessions/${sessionId}/voice`, formData);
  },

  async getSuggestedAnswer(dto: SuggestedAnswerDto): Promise<ApiResponse<string>> {
    return apiClient.post('/Interview/suggested-answer', dto);
  },

  async getQuestionBank(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Interview/question-bank', { skipAuth: true });
  },
};

