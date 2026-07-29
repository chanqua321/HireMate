import { apiClient, ApiResponse } from './apiClient';
import { InterviewResult, HistoryItem } from '../types';

export interface CreateSessionDto {
  industry: string;
  position: string;
  difficulty?: string;
  mode?: string;
  questionCount?: number;
}

export interface SubmitAnswerDto {
  orderIndex: number;
  questionId?: string;
  questionText?: string;
  answerText?: string;
  skipped?: boolean;
  durationSec?: number;
}

export interface InterviewQuestionDto {
  questionId: string;
  orderIndex: number;
  content: string;
  hint?: string;
  category: string;
}

export interface InterviewSessionSummary {
  id: string;
  industry: string;
  position: string;
  difficulty: string;
  mode: string;
  status: string;
  overallScore?: number;
  startedAt: string;
  completedAt?: string;
}

export const SESSION_STORAGE_KEY = 'hm_interview_session_id';

export function mapDifficultyToApi(d: string): string {
  if (d === 'Dễ' || d.toLowerCase() === 'easy') return 'Easy';
  if (d === 'Khó' || d.toLowerCase() === 'hard') return 'Hard';
  return 'Medium';
}

export function mapDetailToResult(detail: any): InterviewResult {
  const answers = detail?.answers || [];
  const overall = detail?.overallScore ?? 0;
  return {
    overall,
    role: detail?.position || '',
    clarity: detail?.clarityScore ?? overall,
    subs: {
      S: detail?.scoreS ?? overall,
      T: detail?.scoreT ?? overall,
      A: detail?.scoreA ?? overall,
      R: detail?.scoreR ?? overall,
    },
    date: (detail?.completedAt || detail?.startedAt || new Date().toISOString()).slice(0, 10),
    feedbacks: answers.map((a: any) => ({
      question: a.questionText || '',
      answer: a.skipped ? '(Bỏ qua)' : a.answerText || '',
      feedback: detail?.feedbackSummary || '',
      score: overall,
    })),
  };
}

export function mapSummaryToHistory(items: InterviewSessionSummary[]): HistoryItem[] {
  return (items || [])
    .filter((s) => s.status === 'Completed' || s.overallScore != null)
    .map((s) => ({
      date: (s.completedAt || s.startedAt || '').slice(0, 10),
      role: s.position,
      score: s.overallScore ?? 0,
    }));
}

export const interviewService = {
  async createSession(config: CreateSessionDto): Promise<ApiResponse<InterviewSessionSummary>> {
    return apiClient.post('/Interview/sessions', {
      industry: config.industry,
      position: config.position,
      difficulty: config.difficulty || 'Medium',
      mode: config.mode || 'Text',
      questionCount: config.questionCount ?? 5,
    });
  },

  async getHistory(): Promise<ApiResponse<InterviewSessionSummary[]>> {
    return apiClient.get('/Interview/sessions');
  },

  async getDetail(sessionId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/Interview/sessions/${sessionId}`);
  },

  async getQuestions(sessionId: string): Promise<ApiResponse<InterviewQuestionDto[]>> {
    return apiClient.get(`/Interview/sessions/${sessionId}/questions`);
  },

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto): Promise<ApiResponse<any>> {
    return apiClient.post(`/Interview/sessions/${sessionId}/answers`, dto);
  },

  async completeSession(sessionId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/Interview/sessions/${sessionId}/complete`);
  },

  async uploadVoice(sessionId: string, audioBlob: Blob, filename = 'voice.webm'): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    return apiClient.upload(`/Interview/sessions/${sessionId}/voice`, formData);
  },

  async getSuggestedAnswer(dto: {
    questionText: string;
    userAnswer?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/Interview/suggested-answer', dto);
  },

  async getQuestionBank(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Interview/question-bank', { skipAuth: true });
  },
};
