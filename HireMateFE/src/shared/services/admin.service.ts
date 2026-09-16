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

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  isPremium: boolean;
  onboardingCompleted: boolean;
  lockoutEnd: string | null;
  roles: string[];
}

export interface AdminTicketItem {
  id: string;
  userId?: string;
  email: string;
  subject: string;
  body: string;
  status: string;
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
}

export const adminService = {
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

  // Users management
  async getUsers(q?: string): Promise<ApiResponse<AdminUserItem[]>> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return apiClient.get<AdminUserItem[]>(`/Admin/users${query}`);
  },

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
  async upsertBlog(post: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/blog', post);
  },

  async upsertFaq(item: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/faq', item);
  },

  async upsertResource(item: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/resources', item);
  },

  async upsertPage(page: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/pages', page);
  },

  async upsertPlan(plan: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/plans', plan);
  },

  async upsertPromo(promo: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/Admin/promos', promo);
  },

  // Gamification & Leaderboard
  async getGamificationBadges(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/Gamification/badges');
  },

  async getGamificationLeaderboard(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/Gamification/leaderboard');
  },
};

