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
};

// ONT API
export const onts = {
  getAll: async (params?: any) => {
    const response = await api.get('/ont/', { params });
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
};