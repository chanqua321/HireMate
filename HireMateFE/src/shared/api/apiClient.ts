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
  _retry?: boolean;
}

export const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  return envUrl ? envUrl.replace(/\/$/, '') : 'https://localhost:7080/api';
};

export const getFileUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const baseUrl = getBaseUrl().replace(/\/api$/, '');
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${baseUrl}${cleanPath}`;
};

const getAuthHeaders = (skipAuth = false): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (!skipAuth) {
    const token = localStorage.getItem('hm_access_token');
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

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const tryRefreshToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('hm_refresh_token');
  if (!refreshToken) return null;

  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/Auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('hm_access_token');
      localStorage.removeItem('hm_refresh_token');
      return null;
    }

    const json = await res.json();
    const newAccessToken = json.data?.token || json.data?.accessToken;
    const newRefreshToken = json.data?.refreshToken;

    if (newAccessToken) {
      localStorage.setItem('hm_access_token', newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem('hm_refresh_token', newRefreshToken);
      }
      return newAccessToken;
    }
    return null;
  } catch (e) {
    localStorage.removeItem('hm_access_token');
    localStorage.removeItem('hm_refresh_token');
    return null;
  }
};

/** Raw authenticated fetch for binary endpoints, with the same access-token refresh behavior as apiClient. */
export const authenticatedFetch = async (endpoint: string, init: RequestInit = {}): Promise<Response> => {
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : buildUrl(endpoint);
  const execute = (token: string | null) => fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let response = await execute(localStorage.getItem('hm_access_token'));
  if (response.status !== 401) return response;
  const refreshed = await tryRefreshToken();
  if (refreshed) response = await execute(refreshed);
  return response;
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

  return {
    data: body.data !== undefined ? body.data : body,
    message: body.message || formatValidationMessage(body.errors) || response.statusText,
    errors: body.errors,
    status: response.status,
    ok: response.ok,
  };
};

/** Flatten ASP.NET ProblemDetails.errors into a short user-facing string. */
function formatValidationMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const parts: string[] = [];
  for (const [key, val] of Object.entries(errors as Record<string, unknown>)) {
    const msgs = Array.isArray(val) ? val.map(String) : [String(val)];
    parts.push(...msgs);
    if (key === 'QuestionCount') {
      return 'Số câu hỏi phải từ 3 đến 15.';
    }
  }
  return parts[0];
}

const requestWithRetry = async <T>(
  execute: () => Promise<Response>,
  retryExecute: () => Promise<ApiResponse<T>>,
  options: RequestOptions
): Promise<ApiResponse<T>> => {
  try {
    const res = await execute();

    if (res.status === 401 && !options.skipAuth && !options._retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await tryRefreshToken();
        isRefreshing = false;
        onRefreshed(newToken);

        if (newToken) {
          options._retry = true;
          return await retryExecute();
        } else {
          return await handleResponse<T>(res);
        }
      } else {
        return new Promise((resolve) => {
          subscribeTokenRefresh(async (newToken) => {
            if (newToken) {
              options._retry = true;
              resolve(await retryExecute());
            } else {
              resolve(await handleResponse<T>(res));
            }
          });
        });
      }
    }

    return await handleResponse<T>(res);
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      message: err?.message || 'Lỗi kết nối mạng đến máy chủ (Network Error)',
    };
  }
};

export const apiClient = {
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);

    const execute = () => {
      const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };
      return fetch(url, {
        method: 'GET',
        headers,
        ...customConfig,
      });
    };

    return requestWithRetry<T>(execute, () => apiClient.get<T>(endpoint, options), options);
  },

  async post<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);

    const execute = () => {
      const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };
      return fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...customConfig,
      });
    };

    return requestWithRetry<T>(execute, () => apiClient.post<T>(endpoint, body, options), options);
  },

  async put<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);

    const execute = () => {
      const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };
      return fetch(url, {
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...customConfig,
      });
    };

    return requestWithRetry<T>(execute, () => apiClient.put<T>(endpoint, body, options), options);
  },

  async patch<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);

    const execute = () => {
      const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };
      return fetch(url, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...customConfig,
      });
    };

    return requestWithRetry<T>(execute, () => apiClient.patch<T>(endpoint, body, options), options);
  },

  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);

    const execute = () => {
      const headers = { ...getAuthHeaders(skipAuth), ...(customConfig.headers as Record<string, string>) };
      return fetch(url, {
        method: 'DELETE',
        headers,
        ...customConfig,
      });
    };

    return requestWithRetry<T>(execute, () => apiClient.delete<T>(endpoint, options), options);
  },

  async upload<T = any>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...customConfig } = options;
    const url = buildUrl(endpoint, params);

    const execute = () => {
      const token = localStorage.getItem('hm_access_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (!skipAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        ...customConfig,
      });
    };

    return requestWithRetry<T>(execute, () => apiClient.upload<T>(endpoint, formData, options), options);
  },
};

