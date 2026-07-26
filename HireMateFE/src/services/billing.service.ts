import { apiClient, ApiResponse } from './apiClient';

export interface CheckoutDto {
  planId: string;
  period?: string;
  paymentMethod?: string;
  returnUrl?: string;
}

export const billingService = {
  async getPlans(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Billing/plans', { skipAuth: true });
  },

  async checkout(dto: CheckoutDto): Promise<ApiResponse<any>> {
    return apiClient.post('/Billing/checkout', dto);
  },

  async getInvoices(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/Billing/invoices');
  },

  async getInvoiceDetail(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/Billing/invoices/${id}`);
  },

  async handleVnPayReturn(queryString: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/Billing/vnpay-return?${queryString}`, { skipAuth: true });
  },
};
