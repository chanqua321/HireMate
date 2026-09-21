export interface Profile {
  name: string;
  role: string;
  field: string;
  bio: string;
  exp: string;
  hobbies: string[];
  skills?: string[];
  education?: string;
  university?: string;
  major?: string;
  graduationYear?: number;
  onboardingCompleted?: boolean;
  email?: string;
  phone?: string;
  desiredPosition?: string;
  desiredIndustry?: string;
  isPremium?: boolean;
  currentPlanCode?: string;
  avatarUrl?: string;
  experiences?: Array<{
    title?: string;
    org?: string;
    period?: string;
    description?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    role?: string;
    technologies?: string[];
    url?: string;
    period?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
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
  feedbacks?: Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number;
  }>;
}

export interface HistoryItem {
  date: string;
  role: string;
  score: number;
}
