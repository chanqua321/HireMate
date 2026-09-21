import { apiClient, ApiResponse, getBaseUrl } from '../api/apiClient';

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
  skills?: string[];
  experiences?: Array<{
    title?: string;
    org?: string;
    period?: string;
    description?: string;
  }>;
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
      skills: dto.skills ?? [],
      experiences: dto.experiences ?? [],
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
    const base = getBaseUrl();
    const token = localStorage.getItem('hm_access_token');
    const res = await fetch(`${base}/Cv/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let msg = 'Không tải được CV';
      try {
        const j = await res.json();
        msg = j.message || j.Message || msg;
      } catch {}
      throw new Error(msg);
    }
    const raw = await res.blob();
    const type = raw.type || res.headers.get('Content-Type') || 'application/pdf';
    const blob = type.includes('pdf') || fallbackName.endsWith('.pdf')
      ? new Blob([raw], { type: 'application/pdf' })
      : raw;
    const cd = res.headers.get('Content-Disposition') || '';
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
    let fileName = match ? decodeURIComponent(match[1].replace(/"/g, '').trim()) : fallbackName;
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
    URL.revokeObjectURL(url);
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
