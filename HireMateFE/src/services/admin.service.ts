import { apiClient, ApiResponse } from './apiClient';

export interface PatchUserDto {
  role?: string;
  isActive?: boolean;
}

export interface PatchTicketDto {
  status?: string;
  response?: string;
}

export const adminService = {
  async getAnalytics(): Promise<ApiResponse<any>> {
    return apiClient.get('/Admin/analytics');
  },

  async getInterviewsStats(): Promise<ApiResponse<any>> {
    return apiClient.get('/Admin/interviews');
  },

  async getUsers(searchQuery?: string): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Admin/users', { params: { q: searchQuery } });
  },

  async patchUser(id: string, dto: PatchUserDto): Promise<ApiResponse<any>> {
    return apiClient.patch(`/Admin/users/${id}`, dto);
  },

  async getRevenue(): Promise<ApiResponse<any>> {
    return apiClient.get('/Admin/revenue');
  },

  async getTickets(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Admin/tickets');
  },

  async patchTicket(id: string, dto: PatchTicketDto): Promise<ApiResponse<any>> {
    return apiClient.patch(`/Admin/tickets/${id}`, dto);
  },

  async upsertBlog(post: any): Promise<ApiResponse<any>> {
    return apiClient.post('/Admin/blog', post);
  },

  async upsertFaq(item: any): Promise<ApiResponse<any>> {
    return apiClient.post('/Admin/faq', item);
  },

  async upsertResource(item: any): Promise<ApiResponse<any>> {
    return apiClient.post('/Admin/resources', item);
  },

  async upsertPage(page: any): Promise<ApiResponse<any>> {
    return apiClient.post('/Admin/pages', page);
  },

  async upsertPlan(plan: any): Promise<ApiResponse<any>> {
    return apiClient.post('/Admin/plans', plan);
  },

  async upsertPromo(promo: any): Promise<ApiResponse<any>> {
    return apiClient.post('/Admin/promos', promo);
  },
};
