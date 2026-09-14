import { Profile, InterviewConfig } from '../types';

export const STORAGE_KEYS = {
  PROFILE: 'hm_profile',
  INTERVIEW_CONFIG: 'hm_interview_config',
  HISTORY: 'hm_history',
  LAST_RESULT: 'hm_last_result',
  THEME: 'hm_theme',
} as const;

export const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '880378565694-upeoqhh7hnn1souk68uargs9q7fnjoji.apps.googleusercontent.com';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  role: 'Lập trình viên Frontend',
  field: 'Công nghệ thông tin',
  bio: '',
  exp: '1-3 năm',
  hobbies: [],
};

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  field: 'Công nghệ thông tin',
  role: 'Lập trình viên Frontend',
  difficulty: 'Trung bình',
  mode: 'Text',
};
