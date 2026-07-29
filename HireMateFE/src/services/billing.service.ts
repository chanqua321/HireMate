import { apiClient, ApiResponse } from './apiClient';

export interface CheckoutDto {
  planCode: string;
  promoCode?: string;
  /** Mock (local) | VNPay (sandbox) | PayOS */
  paymentMethod?: string;
}

/** Map UI plan keys → BE SubscriptionPlans.Code (DbSeeder). */
export const PLAN_CODE_MAP: Record<string, string> = {
  free: 'free',
  basic: 'premium',
  premium: 'premium',
  pro: 'combo',
  combo: 'combo',
};

/** UI key for pricing cards */
export type UiPlanKey = 'free' | 'basic' | 'pro';

export const PLAN_LABEL: Record<string, string> = {
  free: 'Miễn phí',
  basic: 'Tiêu chuẩn',
  premium: 'Tiêu chuẩn',
  pro: 'Cao cấp',
  combo: 'Cao cấp',
};

export function toPlanCode(planKey: string): string {
  return PLAN_CODE_MAP[planKey] || planKey || 'premium';
}

/** free=0, Tiêu chuẩn=1, Cao cấp=2 */
export function planTier(codeOrUiKey: string | null | undefined): number {
  const k = (codeOrUiKey || 'free').toLowerCase();
  if (k === 'combo' || k === 'pro') return 2;
  if (k === 'premium' || k === 'basic') return 1;
  return 0;
}

export function toUiPlanKey(beCode: string | null | undefined): UiPlanKey {
  const n = (beCode || 'free').toLowerCase();
  if (n === 'combo' || n === 'pro') return 'pro';
  if (n === 'premium' || n === 'basic') return 'basic';
  return 'free';
}

export function planLabel(codeOrUiKey: string | null | undefined): string {
  const ui = toUiPlanKey(codeOrUiKey);
  return PLAN_LABEL[ui] || 'Miễn phí';
}

export function persistPlanCode(beCode: string) {
  const n = (beCode || 'free').toLowerCase();
  const code = n === 'combo' || n === 'pro' ? 'combo' : n === 'premium' || n === 'basic' ? 'premium' : 'free';
  sessionStorage.setItem('hm_plan_code', code);
  sessionStorage.setItem('hm_is_premium', code === 'free' ? '0' : '1');
}

export function readStoredPlanCode(): string {
  return sessionStorage.getItem('hm_plan_code') || 'free';
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

  /** Resolve current plan from /Auth/me or latest Paid invoice. */
  async getCurrentPlanCode(): Promise<string> {
    try {
      const me = await apiClient.get<any>('/Auth/me');
      if (me.ok && me.data) {
        const code = me.data.currentPlanCode || me.data.CurrentPlanCode;
        if (code) {
          persistPlanCode(code);
          return PlanNormalize(code);
        }
        if (me.data.isPremium || me.data.IsPremium) {
          persistPlanCode('premium');
          return 'premium';
        }
      }
    } catch { /* ignore */ }

    try {
      const inv = await billingService.getInvoices();
      if (inv.ok && Array.isArray(inv.data)) {
        const paid = inv.data.find((i: any) => i.status === 'Paid' || i.Status === 'Paid');
        const code = paid?.plan?.code || paid?.Plan?.code || paid?.planCode;
        if (code) {
          persistPlanCode(code);
          return PlanNormalize(code);
        }
      }
    } catch { /* ignore */ }

    return readStoredPlanCode();
  },
};

function PlanNormalize(code: string): string {
  const n = code.toLowerCase();
  if (n === 'combo' || n === 'pro') return 'combo';
  if (n === 'premium' || n === 'basic') return 'premium';
  return 'free';
}
