'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Zap, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { apiClient } from '@/core/infrastructure/api-client';
import { useAuthStore } from '@/core/application/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/api/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });
      const { user, token } = res.data.data;
      setAuth(user, token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || (err as Error).message || 'Đăng nhập không thành công',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4 py-12 antialiased">
      {/* Dynamic Animated Ambient Background Glows */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.7, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/25 mb-4"
          >
            <Zap className="h-8 w-8" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Ruby EV Rent
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Hệ thống quản lý vận hành & dòng tiền cho thuê xe điện
          </p>
        </div>

        <motion.div
          whileHover={{ borderColor: 'rgba(52, 211, 153, 0.25)' }}
          className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-colors"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  required
                  autoComplete="username"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                  className="w-full h-12 pl-11 pr-11 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
