import { HistoryItem, InterviewResult } from '../types';

export const SAMPLE_HISTORY: HistoryItem[] = [
  { date: '2026-07-20', role: 'Lập trình viên Frontend', score: 85 },
  { date: '2026-07-22', role: 'Lập trình viên Frontend', score: 78 },
  { date: '2026-07-24', role: 'Lập trình viên React', score: 92 },
];

export const SAMPLE_LAST_RESULT: InterviewResult = {
  overall: 85,
  role: 'Lập trình viên Frontend',
  clarity: 82,
  subs: {
    S: 88,
    T: 85,
    A: 80,
    R: 87,
  },
  date: '2026-07-26',
};
