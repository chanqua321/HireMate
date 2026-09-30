import { BlogPost, BlogWrite } from '../types/blog';
import { apiClient, ApiResponse } from '../api/apiClient';

export interface AdminAnalytics {
  registrations: number;
  interviewCompletionRate: number;
  avgSessionScore: number;
  paidInvoices: number;
}

export interface PopularPosition {
  position: string;
  count: number;
  avg: number;
}

export interface AdminInterviewStats {
  total: number;
  avgStar: number;
  avgS: number;
  avgT: number;
  avgA: number;
  avgR: number;
  popularPositions: PopularPosition[];
}

export interface AdminRevenue {
  mrr: number;
  totalRevenue: number;
  arpu: number;
  conversionRate: number;
  premiumUsers: number;
}

export interface RevenueBucket {
  label: string;
  start: string;
  end: string;
  revenue: number;
  invoices: number;
  newUsers: number;
}

export interface AdminInvoiceRow {
  id: string;
  invoiceNumber: string;
  email: string;
  fullName: string;
  planName: string;
  amountVnd: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  paidAt?: string | null;
}

export interface AdminRevenueSeries {
  granularity: 'day' | 'week' | 'month';
  summary: AdminRevenue & {
    previousRevenue: number;
    changePercent: number;
    paidInvoices: number;
    allTimeRevenue: number;
  };
  buckets: RevenueBucket[];
  invoices: AdminInvoiceRow[];
}

export interface AdminDashboardData {
  range: { key: string; from: string; to: string; timezone: string; granularity: string };
  users: { total: number; new: number; previous: number; percentageChange: number | null };
  interviews: { total: number; completed: number; previous: number; percentageChange: number | null; completionRate: number | null; averageScore: number | null };
  cvs: { created: number; analyzed: number; previous: number; percentageChange: number | null };
  jdMatches: { total: number; previous: number; percentageChange: number | null };
  revenue: { totalVnd: number; previousVnd: number; percentageChange: number | null; successfulPayments: number };
  activePaidUsers: number;
  plans: { code: string; count: number }[];
  series: { date: string; newUsers: number; interviews: number; revenueVnd: number; cvsCreated: number; cvsAnalyzed: number }[];
}

export interface AdminUserPage {
  page: number;
  pageSize: number;
  total: number;
  items: AdminUserItem[];
}

export interface AdminUserDetail {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  currentPlanCode: string;
  isPremium: boolean;
  lockoutEnd: string | null;
  emailConfirmed: boolean;
  createdAt: string;
  lastLogin: string | null;
  cvCount: number;
  interviewCount: number;
  completedInterviews: number;
  jdCount: number;
  paidAmountVnd: number;
  paidInvoices: number;
}

export interface AdminPaymentRow {
  id: string;
  invoiceNumber: string;
  email?: string;
  fullName?: string;
  planName?: string;
  amountVnd: number;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  provider?: string;
  paymentStatus?: string | null;
  transactionRef?: string | null;
}

export interface AdminPaymentPage {
  page: number;
  pageSize: number;
  total: number;
  items: AdminPaymentRow[];
}

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  isPremium: boolean;
  onboardingCompleted: boolean;
  lockoutEnd: string | null;
  emailConfirmed: boolean;
  avatarUrl?: string | null;
  currentPlanCode?: string;
  createdAt?: string;
  lastLogin?: string | null;
  roles: string[];
}

export interface AdminTicketItem {
  id: string;
  userId?: string;
  email: string;
  subject: string;
  body: string;
  status: string;
  reply?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PatchUserDto {
  lock?: boolean;
  isPremium?: boolean;
  role?: string;
}

export interface PatchTicketDto {
  status: string;
  reply?: string;
}

export interface AdminQuestion {
  id: string;
  content: string;
  language: 'vi' | 'en';
  industry: string | null;
  roleHint: string | null;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  seniority: string | null;
  hint: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export type AdminQuestionInput = Pick<AdminQuestion,
  'content' | 'language' | 'industry' | 'roleHint' | 'category' | 'difficulty' | 'seniority' | 'hint' | 'isActive'>;

export const adminService = {
  async getQuestions(filters: Record<string, string> = {}): Promise<ApiResponse<AdminQuestion[]>> {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
    return apiClient.get<AdminQuestion[]>(`/Admin/questions${query ? `?${query}` : ''}`);
  },
  async getQuestion(id: string): Promise<ApiResponse<AdminQuestion>> {
    return apiClient.get<AdminQuestion>(`/Admin/questions/${id}`);
  },
  async createQuestion(input: AdminQuestionInput): Promise<ApiResponse<AdminQuestion>> {
    return apiClient.post<AdminQuestion>('/Admin/questions', input);
  },
  async updateQuestion(id: string, input: AdminQuestionInput): Promise<ApiResponse<AdminQuestion>> {
    return apiClient.put<AdminQuestion>(`/Admin/questions/${id}`, input);
  },
  async setQuestionActive(id: string, isActive: boolean): Promise<ApiResponse<AdminQuestion>> {
    return apiClient.patch<AdminQuestion>(`/Admin/questions/${id}/status`, { isActive });
  },
  // Analytics
  async getAnalytics(): Promise<ApiResponse<AdminAnalytics>> {
    return apiClient.get<AdminAnalytics>('/Admin/analytics');
  },

  // Interviews stats
  async getInterviews(): Promise<ApiResponse<AdminInterviewStats>> {
    return apiClient.get<AdminInterviewStats>('/Admin/interviews');
  },

  // Revenue metrics
  async getRevenue(): Promise<ApiResponse<AdminRevenue>> {
    return apiClient.get<AdminRevenue>('/Admin/revenue');
  },

  getRevenueSeries: (granularity: 'day' | 'week' | 'month', from?: string, to?: string) =>
    apiClient.get<AdminRevenueSeries>('/Admin/revenue/series', {
      params: { granularity, from: from || undefined, to: to || undefined },
    }),

  // Users management
  getDashboard: (params: { range?: string; from?: string; to?: string; granularity?: string }) =>
    apiClient.get<AdminDashboardData>('/Admin/dashboard', { params }),

  async getUsers(params: { q?: string; role?: string; plan?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<ApiResponse<AdminUserPage>> {
    return apiClient.get<AdminUserPage>('/Admin/users', { params });
  },

  getUser: (id: string) => apiClient.get<AdminUserDetail>(`/Admin/users/${id}`),

  getPayments: (params: { q?: string; status?: string; plan?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) =>
    apiClient.get<AdminPaymentPage>('/Admin/payments', { params }),

  async patchUser(id: string, dto: PatchUserDto): Promise<ApiResponse<any>> {
    return apiClient.patch<any>(`/Admin/users/${id}`, dto);
  },

  // Tickets
  async getTickets(): Promise<ApiResponse<AdminTicketItem[]>> {
    return apiClient.get<AdminTicketItem[]>('/Admin/tickets');
  },

  async patchTicket(id: string, dto: PatchTicketDto): Promise<ApiResponse<any>> {
    return apiClient.patch<any>(`/Admin/tickets/${id}`, dto);
  },

  // Content & Plan Management
  getBlogs: () => apiClient.get<BlogPost[]>('/Admin/blog'),
  getBlog: (id: string) => apiClient.get<BlogPost>(`/Admin/blog/${id}`),
  getBlogCategories: () => apiClient.get<string[]>('/Admin/blog/categories'),
  upsertBlog: (post: BlogWrite, id?: string) => id
    ? apiClient.put<BlogPost>(`/Admin/blog/${id}`, post)
    : apiClient.post<BlogPost>('/Admin/blog', post),
  deleteBlog: (id: string) => apiClient.delete(`/Admin/blog/${id}`),
  uploadBlogCover: (id: string, file: File) => {
    const data = new FormData(); data.append('file', file);
    return apiClient.upload<BlogPost>(`/Admin/blog/${id}/cover`, data);
  },
  removeBlogCover: (id: string) => apiClient.delete<BlogPost>(`/Admin/blog/${id}/cover`),

  getFaqs: () => apiClient.get<any[]>('/Admin/faq'),
  async upsertFaq(item: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/faq', item);
  },
  deleteFaq: (id: string) => apiClient.delete(`/Admin/faq/${id}`),

  getResources: () => apiClient.get<any[]>('/Admin/resources'),
  async upsertResource(item: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/resources', item);
  },
  deleteResource: (id: string) => apiClient.delete(`/Admin/resources/${id}`),

  async upsertPage(page: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/pages', page);
  },

  async upsertPlan(plan: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/plans', plan);
  },

  getPromos: () => apiClient.get<any[]>('/Admin/promos'),
  async upsertPromo(promo: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/promos', promo);
  },
  deletePromo: (id: string) => apiClient.delete(`/Admin/promos/${id}`),

  getSettings: () => apiClient.get<{ key: string; value: string }[]>('/Admin/settings'),
  saveSettings: (items: { key: string; value: string }[]) => apiClient.put('/Admin/settings', items),

  // Gamification & Leaderboard
  async getGamificationBadges(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/Admin/badges');
  },
  upsertBadge: (badge: { code: string; name: string; description: string }) =>
    apiClient.post('/Admin/badges', badge),

  async getGamificationLeaderboard(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/Gamification/leaderboard');
  },
};

