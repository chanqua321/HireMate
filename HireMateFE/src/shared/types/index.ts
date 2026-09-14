export interface Profile {
  name: string;
  role: string;
  field: string;
  bio: string;
  exp: string;
  hobbies: string[];
}

export interface Question {
  cat: string;
  q: string;
  hint: string;
}

export type IndustryRoles = Record<string, string[]>;

export interface InterviewConfig {
  field: string;
  role: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  mode: 'Text' | 'Voice' | 'Văn bản' | 'Giọng nói';
}

export interface STARBreakdown {
  S: number;
  T: number;
  A: number;
  R: number;
}

export interface InterviewResult {
  overall: number;
  role: string;
  clarity: number;
  subs: STARBreakdown;
  date: string;
}

export interface HistoryItem {
  date: string;
  role: string;
  score: number;
}
