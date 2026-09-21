export interface DashboardStatsData {
  interviewScore?: number | null;
  sessionsCount: number;
  sessionsThisMonth: number;
  recentSession?: any;
  weeklyScores: any[];
  competencySummary?: any;
  remainingFreeSessionsThisMonth: number;
  isPremium: boolean;
  cvReadinessScore?: number | null;
  cvFitT1Score?: number | null;
  confirmedCvId?: string | null;
  // Legacy / fallback fields
  totalInterviews?: number;
  averageScore?: number;
  completedInterviews?: number;
  recentSessions?: any[];
  chartData?: any;
}

