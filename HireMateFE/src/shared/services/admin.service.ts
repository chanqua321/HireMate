import { apiClient } from '../api/apiClient';

export const adminService = {
  async getAnalytics() {
    return apiClient.get<any>('/Admin/analytics');
  },
  async getUsers(search?: string) {
    return apiClient.get<any[]>(`/Admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  },
  async getTickets() {
    return apiClient.get<any[]>('/Admin/tickets');
  },
  async patchUser(id: string, body: any) {
    return apiClient.patch<any>(`/Admin/users/${id}`, body);
  },
};
