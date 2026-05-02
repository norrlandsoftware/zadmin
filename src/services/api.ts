import axios from 'axios';

// Get API URL from runtime config (Docker) or build-time env var
const getApiUrl = () => {
  if (typeof window !== 'undefined' && (window as any).ENV?.REACT_APP_API_URL) {
    return (window as any).ENV.REACT_APP_API_URL;
  }
  return process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('apiKey');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses by redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear the token
      localStorage.removeItem('apiKey');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const auth = {
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/apikey', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  requestPasswordReset: async (email: string) => {
    const response = await api.post(`/user/reset_password/${encodeURIComponent(email)}`);
    return response.data;
  },
};

export const appInfo = {
  getApiInfo: async () => {
    const response = await api.get('/');
    return response.data;
  },
};

// POP API
export const pops = {
  getAll: async (params?: any) => {
    const response = await api.get('/pop/', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/pop/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/pop/', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/pop/${id}`, data);
    return response.data;
  },
};

// OLT API
export const olts = {
  getAll: async (params?: any) => {
    const response = await api.get('/olt/', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/olt/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/olt/', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/olt/${id}`, data);
    return response.data;
  },
  isReachable: async (id: string) => {
    const response = await api.get(`/olt/${id}/is_reachable`);
    return response.data;
  },
};

export const oltSettings = {
  save: async (oltId: string, data: any) => {
    const response = await api.put(`/olt/${oltId}/settings/`, data);
    return response.data;
  },
  getByOltId: async (oltId: string) => {
    const response = await api.get(`/olt/${oltId}/settings/`);
    return response.data;
  },
};

// ONT API
export const onts = {
  getAll: async (params?: any) => {
    const response = await api.get('/ont/', {
      params,
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data;
  },
  getNotFullyConfigured: async (params?: any) => {
    const response = await api.get('/ont/not_fully_configured', {
      params,
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/ont/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/ont/', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/ont/${id}`, data);
    return response.data;
  },
  getTroubleshoots: async (ontSerialNumber: string) => {
    const response = await api.get(`/ont/troubleshoot`, { 
      params: { q: `serial_number:${ontSerialNumber}` } 
    });
    return response.data;
  },
  startTroubleshoot: async (ontSerialNumber: string) => {
    const response = await api.post(`/ont/troubleshoot/${ontSerialNumber}/`, {});
    return response.data;
  },
};

// User API
export const users = {
  getAll: async (params?: any) => {
    const response = await api.get('/user/', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/user/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/user/', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/user/${id}`, data);
    return response.data;
  },
  updatePassword: async (id: string, data: { password: string; reset_password_token: string }) => {
    const response = await api.post(`/user/update_password/${id}`, data);
    return response.data;
  },
};

// API Config API
export const apiConfigs = {
  getAll: async (params?: any) => {
    const response = await api.get('/api_config/', { params });
    return response.data;
  },
  getByName: async (name: string) => {
    const response = await api.get(`/api_config/${name}/`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api_config/', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/api_config/${id}/`, data);
    return response.data;
  },
};

// Email Template API
export const emailTemplates = {
  getAll: async (params?: any) => {
    const response = await api.get('/email_template/', { params });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/email_template/', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/email_template/${id}/`, data);
    return response.data;
  },
};

const createCrudApi = (path: string) => ({
  getAll: async (params?: any) => {
    const response = await api.get(`${path}/`, { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`${path}/${id}/`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post(`${path}/`, data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`${path}/${id}/`, data);
    return response.data;
  },
});

export const oltModels = createCrudApi('/olt_model');
export const oltLineCardModels = createCrudApi('/olt_line_card_model');
export const oltUplinkCardModels = createCrudApi('/olt_uplink_model');
export const switchModels = createCrudApi('/switch_model');
export const switches = createCrudApi('/switch');
