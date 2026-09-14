export interface CheckoutDto {
  planId: string;
  period?: string;
  paymentMethod?: string;
  returnUrl?: string;
}

export interface PlanDto {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface InvoiceDto {
  id: string;
  amount: number;
  date: string;
  status: string;
  planId: string;
}
