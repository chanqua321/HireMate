export interface CreateSessionDto {
  field?: string;
  role?: string;
  industry?: string;
  position?: string;
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

export interface SuggestedAnswerDto {
  questionText: string;
  role?: string;
  field?: string;
}

export interface InterviewQuestionItem {
  questionId: string;
  orderIndex: number;
  content: string;
  hint?: string;
  category?: string;
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

export interface InterviewSessionDetail extends InterviewSessionSummary {
  scoreS?: number;
  scoreT?: number;
  scoreA?: number;
  scoreR?: number;
  clarityScore?: number;
  feedbackSummary?: string;
  answers: {
    orderIndex: number;
    questionId?: string;
    questionText: string;
    answerText?: string;
    skipped: boolean;
    durationSec: number;
  }[];
}

