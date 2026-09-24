import { apiClient, ApiResponse, authenticatedFetch } from '../api/apiClient';

export interface CvItemDto {
  id: string;
  fileName: string;
  /** User-facing name; prefer over fileName in UI. */
  displayName?: string;
  fileUrl?: string;
  fileSizeBytes?: number;
  uploadedAt: string;
  rawText?: string;
  analyzedAt?: string;
  overallScore?: number;
  formatScore?: number;
  keywordsScore?: number;
  readabilityScore?: number;
  professionalismScore?: number;
  analysis?: string;
  targetRole?: string;
  targetField?: string;
  isConfirmed?: boolean;
  isActive?: boolean;
  canDownload?: boolean;
  source?: string;
  parseSucceeded?: boolean;
  templateId?: string | null;
  templateName?: string | null;
  templateLayoutKey?: string | null;
  parsedProfile?: {
    fullName?: string;
    desiredPosition?: string;
    experienceYears?: string;
    education?: string;
    skills?: string[];
    bio?: string;
  };
}

export interface CvTemplateDto {
  id: string;
  name: string;
  description?: string | null;
  previewUrl?: string | null;
  templateType?: string | null;
  layoutKey?: string | null;
  isSystemTemplate?: boolean;
  userId?: string | null;
  sourceCvDocumentId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  pdfLayoutCloneSupported?: boolean;
  note?: string | null;
}

export interface CvActivateResult {
  success?: boolean;
  activeCvDocumentId?: string;
  cv?: CvItemDto;
}

export interface CvDeleteResult {
  success?: boolean;
  deletedCvDocumentId?: string;
  activeCvDocumentId?: string | null;
}

export interface CvAnalysisResultDto {
  id: string;
  cvId: string;
  overallScore: number;
  atsScore?: number;
  formatScore?: number;
  keywordsScore?: number;
  readabilityScore?: number;
  professionalismScore?: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  parsedName?: string;
  parsedRole?: string;
  parsedSkills?: string[];
  parsedExp?: string;
  parsedEducation?: string;
  parsedBio?: string;
}

export interface CvWizardPayload {
  fullName: string;
  university: string;
  major: string;
  graduationYear: number;
  desiredIndustry: string;
  desiredPosition: string;
  experienceLevel: string;
  bio?: string;
  careerObjective?: string;
  summary?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  avatarUrl?: string;
  linkedIn?: string;
  gitHub?: string;
  skills?: string[];
  experiences?: Array<{
    title?: string;
    org?: string;
    period?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    role?: string;
    bulletPoints?: string[];
  }>;
  projects?: Array<{ name?: string; description?: string; role?: string; technologies?: string[]; url?: string; period?: string; bulletPoints?: string[] }>;
  certifications?: Array<{ name?: string; issuer?: string; issueDate?: string; expiryDate?: string; credentialId?: string; credentialUrl?: string; description?: string }>;
  activities?: Array<{ title?: string; org?: string; period?: string; description?: string; role?: string; bulletPoints?: string[] }>;
  hobbies?: string[];
  references?: Array<{ name?: string; title?: string; organization?: string; contact?: string; email?: string; phone?: string; description?: string }>;
  educations?: Array<{ institution?: string; major?: string; startDate?: string; endDate?: string; isCurrent?: boolean; graduationYear?: number; gpa?: string; description?: string }>;
  clientRequestId?: string;
  displayName?: string;
  templateId?: string;
}

export const cvService = {
  async uploadCv(
    file: File,
    displayName?: string,
    templateId?: string
  ): Promise<ApiResponse<CvItemDto>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (displayName?.trim()) formData.append('displayName', displayName.trim());
    if (templateId) formData.append('templateId', templateId);
    return apiClient.upload<CvItemDto>('/Cv/upload', formData);
  },

  /** Tạo CV từ form (BE: POST /Cv/wizard — tự analyze AI). */
  async createFromWizard(dto: CvWizardPayload): Promise<ApiResponse<CvItemDto | CvAnalysisResultDto>> {
    return apiClient.post<CvItemDto | CvAnalysisResultDto>('/Cv/wizard', {
      fullName: dto.fullName,
      university: dto.university,
      major: dto.major,
      graduationYear: dto.graduationYear,
      desiredIndustry: dto.desiredIndustry,
      desiredPosition: dto.desiredPosition,
      experienceLevel: dto.experienceLevel,
      bio: dto.bio ?? '',
      careerObjective: dto.careerObjective ?? '',
      summary: dto.summary ?? '',
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      address: dto.address,
      avatarUrl: dto.avatarUrl,
      linkedIn: dto.linkedIn,
      gitHub: dto.gitHub,
      skills: dto.skills ?? [],
      experiences: dto.experiences ?? [],
      projects: dto.projects ?? [],
      certifications: dto.certifications ?? [],
      activities: dto.activities ?? [],
      references: dto.references ?? [],
      educations: dto.educations ?? [],
      clientRequestId: dto.clientRequestId,
      ...(dto.displayName?.trim() ? { displayName: dto.displayName.trim() } : {}),
      ...(dto.templateId ? { templateId: dto.templateId } : {}),
    });
  },

  async listCvs(): Promise<ApiResponse<CvItemDto[]>> {
    return apiClient.get<CvItemDto[]>('/Cv');
  },

  async getCv(id: string): Promise<ApiResponse<CvItemDto>> {
    return apiClient.get<CvItemDto>(`/Cv/${id}`);
  },

  async getCvForEdit(id: string): Promise<ApiResponse<{ id: string; displayName: string; templateId: string | null; content: CvWizardPayload }>> {
    return apiClient.get(`/Cv/${id}/edit`);
  },

  async updateCv(id: string, dto: CvWizardPayload): Promise<ApiResponse<CvItemDto>> {
    return apiClient.put<CvItemDto>(`/Cv/${id}`, dto);
  },

  /** Đổi DisplayName only (BE: PUT /Cv/{id}/name). */
  async renameCv(id: string, displayName: string): Promise<ApiResponse<CvItemDto>> {
    return apiClient.put<CvItemDto>(`/Cv/${id}/name`, { displayName });
  },

  /** Đổi template layout (BE: PUT /Cv/{id}/template). */
  async changeCvTemplate(id: string, templateId: string): Promise<ApiResponse<CvItemDto>> {
    return apiClient.put<CvItemDto>(`/Cv/${id}/template`, { templateId });
  },

  async analyzeCv(id: string): Promise<ApiResponse<CvAnalysisResultDto>> {
    return apiClient.post<CvAnalysisResultDto>(`/Cv/${id}/analyze`);
  },

  /** Kích hoạt CV làm Active (BE: CareerProfile.ConfirmedCvDocumentId). */
  async activateCv(id: string): Promise<ApiResponse<CvActivateResult>> {
    return apiClient.post<CvActivateResult>(`/Cv/${id}/activate`);
  },

  /** Xóa CV thuộc user; nếu đang Active BE sẽ fallback hoặc clear. */
  async deleteCv(id: string): Promise<ApiResponse<CvDeleteResult>> {
    return apiClient.delete<CvDeleteResult>(`/Cv/${id}`);
  },

  /** Tải file CV (PDF wizard hoặc file upload gốc). Không mở URL API trên tab — dùng blob. */
  async downloadCv(id: string, fallbackName = 'HireMate-CV.pdf'): Promise<void> {
    const res = await authenticatedFetch(`/Cv/${id}/download`);
    if (!res.ok) {
      let msg = res.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tải CV.'
        : `Không tải được CV (HTTP ${res.status}).`;
      try {
        const j = await res.json();
        msg = j.message || j.Message || msg;
      } catch {}
      throw new Error(msg);
    }
    const raw = await res.blob();
    if (!raw.size) throw new Error('File CV trên máy chủ đang trống.');
    const type = raw.type || res.headers.get('Content-Type') || 'application/pdf';
    const blob = type.includes('pdf') || fallbackName.endsWith('.pdf')
      ? new Blob([raw], { type: 'application/pdf' })
      : raw;
    const cd = res.headers.get('Content-Disposition') || '';
    const encodedName = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(cd)?.[1];
    const plainName = /(?:^|;)\s*filename\s*=\s*"?([^";]+)/i.exec(cd)?.[1];
    let fileName = fallbackName;
    if (encodedName) {
      try { fileName = decodeURIComponent(encodedName.trim()); } catch { fileName = plainName?.trim() || fallbackName; }
    } else if (plainName) fileName = plainName.trim();
    if (!fileName.toLowerCase().endsWith('.pdf') && type.includes('pdf')) {
      fileName = fileName.replace(/\.[^.]+$/, '') + '.pdf';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  },

  async previewDraft(dto: CvWizardPayload): Promise<ApiResponse<{ html: string; pdfBase64?: string; templateId: string; templateName: string; layoutKey: string }>> {
    return apiClient.post('/Cv/preview-draft', dto);
  },

  async improveDraftContent(dto: CvWizardPayload): Promise<ApiResponse<{
    templateId: string;
    templateName?: string;
    templateChanged: false;
    content: CvWizardPayload;
    provider?: string;
  }>> {
    return apiClient.post('/Cv/optimize-content', {
      draft: dto,
      templateId: dto.templateId,
    });
  },

  /** Xem đúng binary/renderer của CV; dùng cùng service source với download. */
  async previewCv(id: string): Promise<void> {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) previewWindow.opener = null;
    try {
      const res = await authenticatedFetch(`/Cv/${id}/preview`);
      if (!res.ok) throw new Error('Không xem trước được CV');
      const url = URL.createObjectURL(await res.blob());
      if (previewWindow) previewWindow.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow?.close();
      throw error;
    }
  },
};

export const cvTemplateService = {
  async listTemplates(): Promise<ApiResponse<CvTemplateDto[]>> {
    return apiClient.get<CvTemplateDto[]>('/CvTemplate');
  },

  async createFromCv(
    cvDocumentId: string,
    dto?: { name?: string; description?: string }
  ): Promise<ApiResponse<CvTemplateDto>> {
    return apiClient.post<CvTemplateDto>(`/CvTemplate/from-cv/${cvDocumentId}`, dto ?? {});
  },

  async deleteTemplate(id: string): Promise<ApiResponse<{ id: string; detachedCvCount?: number }>> {
    return apiClient.delete(`/CvTemplate/${id}`);
  },
};
