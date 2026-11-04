'use client';

import { create } from 'zustand';
import type { User } from '../domain/types';
import { apiClient } from '../infrastructure/api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  initialized: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  initialized: false,

  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ev_rental_token', token);
      window.localStorage.setItem('ev_rental_user', JSON.stringify(user));
    }
    set({ user, token, initialized: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ev_rental_token');
      window.localStorage.removeItem('ev_rental_user');
    }
    set({ user: null, token: null, initialized: true });
  },

  hydrate: async () => {
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem('ev_rental_token');
    const cachedUser = window.localStorage.getItem('ev_rental_user');
    if (!token) {
      set({ user: null, token: null, initialized: true });
      return;
    }

    if (cachedUser) {
      try {
        set({ user: JSON.parse(cachedUser), token, initialized: true });
      } catch {
        // ignore parse error
      }
    }

    try {
      const res = await apiClient.get('/api/auth/me');
      if (res.data?.data?.user) {
        window.localStorage.setItem('ev_rental_user', JSON.stringify(res.data.data.user));
        set({ user: res.data.data.user, token, initialized: true });
      }
    } catch {
      window.localStorage.removeItem('ev_rental_token');
      window.localStorage.removeItem('ev_rental_user');
      set({ user: null, token: null, initialized: true });
    }
  },
}));

