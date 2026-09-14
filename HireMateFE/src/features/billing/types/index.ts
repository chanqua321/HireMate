export interface CheckoutDto {
  planCode: string;
  promoCode?: string;
  paymentMethod?: string;
}

export interface PlanDto {
  id: string;
  code: string;
  name: string;
  priceVnd: number;
  durationDays: number;
  description?: string;
  isActive?: boolean;
}

export interface InvoiceDto {
  id: string;
  userId?: string;
  planId: string;
  plan?: PlanDto;
  invoiceNumber?: string;
  amountVnd: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  paidAt?: string;
  orderCode?: string;
}

export interface CheckoutResultDto {
  invoiceId?: string;
  invoiceNumber?: string;
  paymentUrl?: string;
  redirectUrl?: string;
  orderCode?: string;
  status?: string;
  message?: string;
  amountVnd?: number;
}

