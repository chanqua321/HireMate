import { apiClient, ApiResponse } from './apiClient';

export interface CvDocument {
  id: string;
  fileName: string;
  fileUrl?: string;
  atsScore?: number;
  uploadedAt: string;
  analysis?: any;
}

export const cvService = {
  async uploadCv(file: File): Promise<ApiResponse<CvDocument>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<CvDocument>('/Cv/upload', formData);
  },

  async listCvs(): Promise<ApiResponse<CvDocument[]>> {
    return apiClient.get<CvDocument[]>('/Cv');
  },

  async getCvDetail(id: string): Promise<ApiResponse<CvDocument>> {
    return apiClient.get<CvDocument>(`/Cv/${id}`);
  },

  async analyzeCv(id: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/Cv/${id}/analyze`);
  },
};
