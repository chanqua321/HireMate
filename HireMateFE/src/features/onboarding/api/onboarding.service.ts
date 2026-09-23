import { apiClient, ApiResponse } from '../../../shared/api/apiClient';
import { cvService } from '../../../shared/services/cv.service';
import { OnboardingGoalDto, OnboardingPersonalDto } from '../types';

export type InterviewReadyResult =
  | { ok: true }
  | { ok: false; reason: 'need_cv' | 'need_plan' | 'error'; message: string };

/**
 * Chỉ confirm + plan — KHÔNG analyze lúc vào phỏng vấn.
 * Analyze/gợi ý sửa phải xong ngay khi tạo/upload CV trên Dashboard.
 * Không ghi đè hm_active_cv_id bằng latest/first CV — Active = ConfirmedCvDocumentId.
 */
export async function ensureInterviewReady(cvId?: string | null): Promise<InterviewReadyResult> {
  let statusRes = await onboardingService.getStatus();
  if (!statusRes.ok && !statusRes.data) {
    return { ok: false, reason: 'error', message: statusRes.message || 'Không đọc được trạng thái hồ sơ.' };
  }

  let next = statusRes.data?.nextStep || statusRes.data?.NextStep || '';

  // Active CV must be confirmed by the server. An explicit non-active id cannot become active here.
  let hasCvId: string | null = null;
  if (!hasCvId) {
    const list = await cvService.listCvs().catch(() => null);
    const cvs = Array.isArray(list?.data) ? list!.data! : [];
    const confirmed = cvs.find((c: any) => c.isActive) || null;
    hasCvId = confirmed?.id || null;
  }

  if (next === 'upload_cv' || !hasCvId) {
    return {
      ok: false,
      reason: 'need_cv',
      message: 'Tạo hoặc tải CV, sau đó bấm “Chọn làm CV phỏng vấn” trong Kho CV.',
    };
  }

  if (next === 'analyze') {
    return {
      ok: false,
      reason: 'need_cv',
      message:
        'CV chưa phân tích thành công. Mở Kho CV → xem gợi ý → chỉnh hồ sơ/tải lại CV rồi phân tích lại trước khi phỏng vấn.',
    };
  }

  if (next === 'select_plan') {
    return {
      ok: false,
      reason: 'need_plan',
      message: 'Chọn gói (Miễn phí cũng được) trước khi vào phỏng vấn.',
    };
  }

  const completed = !!(
    statusRes.data?.onboardingCompleted ||
    statusRes.data?.OnboardingCompleted
  );

  if (next === 'review_confirm' || !completed) {
    const confirmRes = await onboardingService.confirm();
    if (!confirmRes.ok) {
      const msg = confirmRes.message || 'Chưa xác nhận được hồ sơ.';
      if (/gói|plan|chọn gói/i.test(msg)) {
        return { ok: false, reason: 'need_plan', message: msg };
      }
      if (/CV|phân tích/i.test(msg)) {
        return {
          ok: false,
          reason: 'need_cv',
          message: msg,
        };
      }
      return { ok: false, reason: 'error', message: msg };
    }
  }

  sessionStorage.setItem('hm_onboarding_done', '1');
  // Do not write hasCvId into hm_active_cv_id — Active CV must come from ConfirmedCvDocumentId / activate API.
  return { ok: true };
}

export const onboardingService = {
  async getStatus(): Promise<ApiResponse<any>> {
    return apiClient.get('/Onboarding/status');
  },

  async saveGoal(dto: OnboardingGoalDto): Promise<ApiResponse<any>> {
    // Chỉ gửi field có giá trị thật — không dùng fallback hardcode để tránh ghi đè dữ liệu user
    const payload: Record<string, any> = {};
    if (dto.desiredIndustry) payload.desiredIndustry = dto.desiredIndustry;
    if (dto.desiredPosition) payload.desiredPosition = dto.desiredPosition;
    if (dto.experienceLevel) payload.experienceLevel = dto.experienceLevel;
    return apiClient.put('/Onboarding/goal', payload);
  },

  async savePersonal(dto: OnboardingPersonalDto): Promise<ApiResponse<any>> {
    // Chỉ gửi field có giá trị thật — tránh ghi đè fullName thành 'Ứng viên' khi form rỗng
    const payload: Record<string, any> = {};
    if (dto.fullName?.trim()) payload.fullName = dto.fullName.trim();
    if (dto.university) payload.university = dto.university;
    if (dto.major) payload.major = dto.major;
    if (dto.graduationYear) payload.graduationYear = dto.graduationYear;
    if (dto.bio) payload.bio = dto.bio;
    if (dto.hobbies?.length) payload.hobbies = dto.hobbies;
    return apiClient.put('/Onboarding/personal', payload);
  },

  async confirm(): Promise<ApiResponse<any>> {
    return apiClient.post('/Onboarding/confirm');
  },
};

