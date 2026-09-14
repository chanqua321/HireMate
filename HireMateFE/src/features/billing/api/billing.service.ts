import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { CheckoutDto, PlanDto, InvoiceDto } from '../types';

export const billingService = {
  async getPlans(): Promise<ApiResponse<PlanDto[]>> {
    return apiClient.get('/Billing/plans', { skipAuth: true });
  },

  async checkout(dto: CheckoutDto): Promise<ApiResponse<any>> {
    return apiClient.post('/Billing/checkout', dto);
  },

  async getInvoices(): Promise<ApiResponse<InvoiceDto[]>> {
    return apiClient.get('/Billing/invoices');
  },

  async getInvoiceDetail(id: string): Promise<ApiResponse<InvoiceDto>> {
    return apiClient.get(`/Billing/invoices/${id}`);
  },

  async handleVnPayReturn(queryString: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/Billing/vnpay-return?${queryString}`, { skipAuth: true });
  },
};
