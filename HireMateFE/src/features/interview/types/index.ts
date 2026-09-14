export interface CreateSessionDto {
  field: string;
  role: string;
  difficulty: string;
  mode: string;
  cvId?: string;
}

export interface SubmitAnswerDto {
  questionIndex: number;
  questionText: string;
  answerText: string;
}

export interface SuggestedAnswerDto {
  questionText: string;
  role?: string;
  field?: string;
}
