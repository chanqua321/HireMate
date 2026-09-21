export interface CreateSessionDto {
  field?: string;
  role?: string;
  industry?: string;
  position?: string;
  mode?: string;
  questionCount?: number;
  jobDescription?: string;
  jobDescriptionId?: string;
  cvDocumentId?: string;
  contextJson?: string;
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

export type EvidenceStatusType =
  | 'Verified'
  | 'StrongEvidence'
  | 'WeakEvidence'
  | 'MissingEvidence'
  | 'NeedsValidation'
  | 'CvInconsistency';

export interface AnswerAnalysis {
  analysisAvailable: boolean;
  relevance?: number | null;
  completeness?: number | null;
  technicalKnowledge?: number | null;
  problemSolving?: number | null;
  communication?: number | null;
  starScore?: number | null;
  starSituation?: boolean | null;
  starTask?: boolean | null;
  starAction?: boolean | null;
  starResult?: boolean | null;
  cvConsistency?: number | null;
  evidenceStatus?: EvidenceStatusType | string | null;
  evidenceJson?: string | null;
  followUpReason?: string | null;
  evidenceGap?: boolean;
  needsFollowUp?: boolean;
}

export interface SubmitAnswerResult {
  answerId?: string;
  orderIndex?: number;
  skipped?: boolean;
  durationSec?: number;
  evidenceGap?: boolean;
  analysisAvailable?: boolean;
  analysis?: AnswerAnalysis | null;
  evidence?: {
    status?: string | null;
    detail?: string | null;
  } | null;
  followUp?: InterviewQuestionItem | null;
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
  voiceStartedAt?: string | null;
  completedAt?: string;
}

export interface InterviewAnswerDetail {
  id?: string;
  orderIndex: number;
  questionId?: string;
  questionText: string;
  answerText?: string;
  skipped: boolean;
  durationSec: number;
  isFollowUp?: boolean;
  questionCategory?: string | null;
  analysisAvailable?: boolean;
  relevanceScore?: number | null;
  completenessScore?: number | null;
  technicalKnowledgeScore?: number | null;
  problemSolvingScore?: number | null;
  communicationScore?: number | null;
  starScore?: number | null;
  cvConsistencyScore?: number | null;
  starHasSituation?: boolean | null;
  starHasTask?: boolean | null;
  starHasAction?: boolean | null;
  starHasResult?: boolean | null;
  evidenceStatus?: string | null;
  evidenceJson?: string | null;
  analysisJson?: string | null;
  followUpReason?: string | null;
  evidenceGap?: boolean;
}

export interface InterviewSessionDetail extends InterviewSessionSummary {
  scoreS?: number | null;
  scoreT?: number | null;
  scoreA?: number | null;
  scoreR?: number | null;
  clarityScore?: number | null;
  feedbackSummary?: string | null;
  structuredFeedback?: StructuredFeedback | null;
  answers: InterviewAnswerDetail[];
}

export interface CategoryScores {
  communication?: number | null;
  star?: number | null;
  technical?: number | null;
  problemSolving?: number | null;
  relevance?: number | null;
  completeness?: number | null;
  cvConsistency?: number | null;
}

export interface FeedbackItem {
  area: string;
  description: string;
  evidence?: string | null;
  relatedAnswerIds?: string[] | null;
}

export interface SkillGapItem {
  area: string;
  description: string;
  score?: number | null;
}

export interface EvidenceGapItem {
  answerId: string;
  orderIndex: number;
  question: string;
  status: string;
  gap: string;
  suggestion?: string | null;
}

export interface AnswerHighlightItem {
  answerId: string;
  orderIndex: number;
  question: string;
  compositeScore?: number | null;
  note?: string | null;
}

export interface AnswerHighlights {
  strong: AnswerHighlightItem[];
  weak: AnswerHighlightItem[];
  needsImprovement: AnswerHighlightItem[];
}

export interface StructuredFeedback {
  sessionId: string;
  overallScore?: number | null;
  summary?: string | null;
  aiSummaryAvailable?: boolean;
  categoryScores?: CategoryScores;
  cvConsistencySummary?: string | null;
  strengths: FeedbackItem[];
  weaknesses: FeedbackItem[];
  skillGaps: SkillGapItem[];
  evidenceGaps: EvidenceGapItem[];
  answerHighlights?: AnswerHighlights;
  improvements: string[];
}
