import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore, useUIStore } from '../store/index.js';
import { getErrorMessage } from '../utils/errorFormatter.js';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal } = useUIStore();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showAdmin, setShowAdmin] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => api.post('/auth/login', form),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.username}!`);
      closeLoginModal();
      if (data.user?.role === 'admin') navigate('/dashboard');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Login failed')),
  });

  const oauthMutation = useMutation({
    mutationFn: (provider) => api.post('/auth/oauth', { provider }),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success(`Successfully signed in with ${data.provider}!`);
      closeLoginModal();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'OAuth integration failed')),
  });

  if (!isLoginModalOpen) return null;

  const handleOAuth = (provider) => {
    // Simulating OAuth flow pop-up delay
    toast.loading(`Connecting to ${provider}...`, { id: 'oauth-toast', duration: 1500 });
    setTimeout(() => {
      toast.dismiss('oauth-toast');
      oauthMutation.mutate(provider);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0" onClick={closeLoginModal}></div>
      <div className="relative w-full max-w-[420px] bg-surface-raised border border-surface-border rounded-3xl p-8 sm:p-12 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={closeLoginModal} className="absolute top-4 right-4 p-2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">✕</button>
        
        <h1 className="text-3xl font-display font-semibold mb-2 text-[rgb(var(--text-primary))]">Sign In</h1>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-8 font-medium">Access your Farols account</p>
        
        {!showAdmin ? (
          <div className="space-y-4">
            <button onClick={() => handleOAuth('Apple')} className="w-full flex items-center justify-center gap-3 bg-[rgb(var(--text-primary))] text-[rgb(var(--surface-bg))] py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.88 3.5-.8 1.49.09 2.59.69 3.26 1.7-2.83 1.69-2.28 5.75.5 6.94-1.12 2.68-2.6 3.79-2.34 4.33zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.45-1.92 4.31-3.74 4.25z"/></svg>
              Continue with Apple
            </button>
            <button onClick={() => handleOAuth('Google')} className="w-full flex items-center justify-center gap-3 bg-surface border border-surface-border text-[rgb(var(--text-primary))] py-3.5 rounded-xl font-semibold hover:bg-surface-raised transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button onClick={() => handleOAuth('Facebook')} className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white py-3.5 rounded-xl font-semibold hover:bg-[#1864D9] transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Continue with Facebook
            </button>
            <div className="pt-6 pb-2">
              <button onClick={() => setShowAdmin(true)} className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">Staff / Admin Access</button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in duration-300">
            <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-5 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[rgb(var(--text-secondary))]" htmlFor="modal-email">Email address</label>
                <input
                  id="modal-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input py-3"
                  placeholder="admin@farols.local"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[rgb(var(--text-secondary))]" htmlFor="modal-password">Password</label>
                <input
                  id="modal-password"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input py-3"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="btn-primary w-full justify-center py-3 rounded-xl"
              >
                {loginMutation.isPending ? 'Authenticating...' : 'Sign In as Staff'}
              </button>
              <div className="pt-4 text-center">
                <button type="button" onClick={() => setShowAdmin(false)} className="text-xs font-semibold text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">Return to user login</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}