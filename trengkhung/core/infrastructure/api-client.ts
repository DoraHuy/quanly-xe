import axios from 'axios';

export const getApiBaseUrl = () => {
  // 1. Explicit environment variable override if provided
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // 2. Server-side runtime (Next.js Server Components / Route Handlers)
  // Vercel Service Binding injects the internal URL into process.env.TRENGDIEN_URL
  if (typeof window === 'undefined') {
    return process.env.TRENGDIEN_URL || 'http://localhost:4000';
  }
  // 3. Client-side browser:
  // Local development fallback when frontend runs on localhost:3000 and backend on 4000
  if (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port === '3000'
  ) {
    return 'http://localhost:4000';
  }
  // 4. In Vercel Production deployment: relative URL ('') so requests to /api/*
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
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Đã xảy ra lỗi kết nối máy chủ';
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  },
);

export const swrFetcher = async (url: string) => {
  const res = await apiClient.get(url);
  return res.data?.data;
};

