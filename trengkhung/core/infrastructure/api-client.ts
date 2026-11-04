import axios from 'axios';

export const getApiBaseUrl = () => {
  // 1. Explicit environment variable override if provided
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // 2. Local development (pnpm run dev): always connect to backend port 4000
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  // 3. Server-side runtime in production (Next.js Server Components / Route Handlers)
  // Vercel Service Binding injects the internal URL into process.env.TRENGDIEN_URL
  if (typeof window === 'undefined') {
    return process.env.TRENGDIEN_URL || 'http://localhost:4000';
  }
  // 4. In Vercel Production deployment (browser): relative URL ('') so requests to /api/*
  // are routed to service 'trengdien' via top-level vercel.json rewrite
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const currentBase = getApiBaseUrl();
    if (config.baseURL !== currentBase) {
      config.baseURL = currentBase;
    }
    const token = window.localStorage.getItem('ev_rental_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const rawData = error?.response?.data;
    let message: string;

    if (typeof rawData?.message === 'string') {
      message = rawData.message;
    } else if (Array.isArray(rawData?.message)) {
      message = rawData.message.join(', ');
    } else if (typeof rawData?.message === 'object' && rawData?.message !== null) {
      message = rawData.message.message || rawData.message.error || JSON.stringify(rawData.message);
    } else if (typeof rawData?.error === 'string') {
      message = rawData.error;
    } else if (typeof rawData?.error === 'object' && rawData?.error !== null) {
      message = rawData.error.message || rawData.error.code || JSON.stringify(rawData.error);
    } else if (typeof error?.message === 'string' && error.message.trim() !== '') {
      message = error.message;
    } else {
      message = 'Đã xảy ra lỗi kết nối máy chủ';
    }

    return Promise.reject(new Error(message));
  },
);

export const swrFetcher = async (url: string) => {
  const res = await apiClient.get(url);
  return res.data?.data;
};

