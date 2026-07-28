export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  errors?: any;
  status: number;
  ok: boolean;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  return envUrl ? envUrl.replace(/\/$/, '') : 'https://localhost:7080/api';
};

const getAuthHeaders = (skipAuth = false): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (!skipAuth) {
    const token = sessionStorage.getItem('hm_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean | undefined>): string => {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let fullUrl = `${baseUrl}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  return fullUrl;
};

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  let body: any = {};
  const contentType = response.headers.get('content-type');

  try {
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else {
      const text = await response.text();
      body = { message: text };
    }
  } catch (e) {
    body = { message: response.statusText };
  }

  if (response.status === 401) {
    // Optionally clear invalid access token
    sessionStorage.removeItem('hm_access_token');
    localStorage.removeItem('hm_access_token');
  }

  return {
    data: body.data !== undefined ? body.data : body,
    message: body.message || response.statusText,
    errors: body.errors,
    status: response.status,
    ok: response.ok,
  };
};

export const apiClient = {
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);
    const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        ...customConfig,
      });
      return await handleResponse<T>(res);
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'Lỗi kết nối mạng đến máy chủ (Network Error)',
      };
    }
  },

  async post<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);
    const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...customConfig,
      });
      return await handleResponse<T>(res);
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'Lỗi kết nối mạng đến máy chủ (Network Error)',
      };
    }
  },

  async put<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);
    const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...customConfig,
      });
      return await handleResponse<T>(res);
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'Lỗi kết nối mạng đến máy chủ (Network Error)',
      };
    }
  },

  async patch<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);
    const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...customConfig,
      });
      return await handleResponse<T>(res);
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'Lỗi kết nối mạng đến máy chủ (Network Error)',
      };
    }
  },

  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);
    const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
        ...customConfig,
      });
      return await handleResponse<T>(res);
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'Lỗi kết nối mạng đến máy chủ (Network Error)',
      };
    }
  },

  async upload<T = any>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);
    
    // Do NOT set Content-Type header when uploading FormData so browser sets multipart/form-data boundary
    const token = sessionStorage.getItem('hm_access_token');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (!skipAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        ...customConfig,
      });
      return await handleResponse<T>(res);
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'Lỗi kết nối mạng đến máy chủ (Network Error)',
      };
    }
  },
};
