import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import {
  CreateSessionDto,
  SubmitAnswerDto,
  SuggestedAnswerDto,
  InterviewQuestionItem,
  InterviewSessionSummary,
  InterviewSessionDetail,
  StructuredFeedback,
} from '../types';

export const interviewService = {
  async buildContext(payload: {
    position: string;
    industry?: string;
    jobDescription?: string;
    jobDescriptionId?: string;
    cvDocumentId?: string;
    language?: 'vi' | 'en';
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/Interview/build-context', payload);
  },

  async createSession(config: CreateSessionDto): Promise<ApiResponse<InterviewSessionSummary>> {
    const payload = {
      industry: config.industry || config.field || 'Công nghệ thông tin',
      position: config.position || config.role || 'Ứng viên',
      mode: config.mode || 'Text',
      questionCount: config.questionCount || undefined,
      jobDescription: config.jobDescription || undefined,
      jobDescriptionId: config.jobDescriptionId || undefined,
      cvDocumentId: config.cvDocumentId || undefined,
      contextJson: config.contextJson || undefined,
      language: config.language || undefined,
    };
    return apiClient.post<InterviewSessionSummary>('/Interview/sessions', payload);
  },

  async getHistory(): Promise<ApiResponse<InterviewSessionSummary[]>> {
    return apiClient.get<InterviewSessionSummary[]>('/Interview/sessions');
  },

  async getDetail(sessionId: string): Promise<ApiResponse<InterviewSessionDetail>> {
    return apiClient.get<InterviewSessionDetail>(`/Interview/sessions/${sessionId}`);
  },

  async getFeedback(sessionId: string): Promise<ApiResponse<StructuredFeedback>> {
    return apiClient.get<StructuredFeedback>(`/Interview/sessions/${sessionId}/feedback`);
  },

  async getQuestions(sessionId: string): Promise<ApiResponse<InterviewQuestionItem[]>> {
    return apiClient.get<InterviewQuestionItem[]>(`/Interview/sessions/${sessionId}/questions`);
  },

  async getLanguage(sessionId: string): Promise<ApiResponse<{ language: 'vi' | 'en'; locale: string }>> {
    return apiClient.get(`/Interview/sessions/${sessionId}/language`);
  },

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto): Promise<ApiResponse<import('../types').SubmitAnswerResult>> {
    return apiClient.post(`/Interview/sessions/${sessionId}/answers`, dto);
  },

  async completeSession(sessionId: string): Promise<ApiResponse<InterviewSessionDetail>> {
    return apiClient.post<InterviewSessionDetail>(`/Interview/sessions/${sessionId}/complete`);
  },

  /** Consume 1 Interview quota — call when user actually starts Voice. */
  async startVoice(sessionId: string): Promise<ApiResponse<{
    voiceStartedAt?: string;
    voiceExpiresAt?: string;
    maxMinutes?: number;
    idempotent?: boolean;
    errorCode?: string;
  }>> {
    return apiClient.post(`/Interview/sessions/${sessionId}/voice/start`);
  },

  async uploadVoice(
    sessionId: string,
    audioBlob: Blob,
    meta: {
      orderIndex: number;
      questionId?: string;
      questionText?: string;
      durationSec?: number;
      filename?: string;
    }
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', audioBlob, meta.filename || 'voice.webm');
    formData.append('orderIndex', String(meta.orderIndex));
    if (meta.questionId) formData.append('questionId', meta.questionId);
    if (meta.questionText) formData.append('questionText', meta.questionText);
    formData.append('durationSec', String(meta.durationSec ?? 0));
    return apiClient.upload(`/Interview/sessions/${sessionId}/voice`, formData);
  },

  async getSuggestedAnswer(dto: SuggestedAnswerDto): Promise<ApiResponse<string>> {
    return apiClient.post('/Interview/suggested-answer', dto);
  },

};
