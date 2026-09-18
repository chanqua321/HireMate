import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { CheckoutDto, PlanDto, InvoiceDto, CheckoutResultDto } from '../types';

export const billingService = {
  async getPlans(): Promise<ApiResponse<PlanDto[]>> {
    return apiClient.get<PlanDto[]>('/Billing/plans', { skipAuth: true });
  },

  async checkout(dto: CheckoutDto): Promise<ApiResponse<CheckoutResultDto>> {
    return apiClient.post<CheckoutResultDto>('/Billing/checkout', dto);
  },

  async getInvoices(): Promise<ApiResponse<InvoiceDto[]>> {
    return apiClient.get<InvoiceDto[]>('/Billing/invoices');
  },

  async getInvoiceDetail(id: string): Promise<ApiResponse<InvoiceDto>> {
    return apiClient.get<InvoiceDto>(`/Billing/invoices/${id}`);
  },

  async handleVnPayReturn(queryString: string): Promise<ApiResponse<any>> {
    const cleanQuery = queryString.startsWith('?') ? queryString.substring(1) : queryString;
    return apiClient.get(`/Billing/vnpay-return?${cleanQuery}`, { skipAuth: true });
  },

  async confirmPayOs(payload: {
    orderCode?: string;
    status?: string;
    code?: string;
    cancel?: boolean;
    invoiceId?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/Billing/payos-confirm', payload, { skipAuth: true });
  },
};

