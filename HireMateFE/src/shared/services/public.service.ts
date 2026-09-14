import { apiClient, ApiResponse } from '../api/apiClient';

export interface WaitlistDto {
  email: string;
  fullName?: string;
  university?: string;
}

export interface ContactDto {
  fullName: string;
  email: string;
  subject: string;
  body: string;
}

export interface CreateTicketDto {
  email: string;
  subject: string;
  body: string;
}

export const publicService = {
  async joinWaitlist(dto: WaitlistDto): Promise<ApiResponse<any>> {
    return apiClient.post('/Waitlist', dto, { skipAuth: true });
  },

  async sendContact(dto: ContactDto): Promise<ApiResponse<any>> {
    return apiClient.post('/Contact', dto, { skipAuth: true });
  },

  async createTicket(dto: CreateTicketDto): Promise<ApiResponse<any>> {
    return apiClient.post('/Contact/ticket', dto, { skipAuth: true });
  },

  async getPageContent(slug: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/Content/pages/${slug}`, { skipAuth: true });
  },

  async getBlogList(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Blog', { skipAuth: true });
  },

  async getBlogDetail(slug: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/Blog/${slug}`, { skipAuth: true });
  },

  async getFaqs(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Faq', { skipAuth: true });
  },

  async getResources(category?: string): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Resources', { params: { category }, skipAuth: true });
  },

  async getResourceDetail(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/Resources/${id}`, { skipAuth: true });
  },
};
