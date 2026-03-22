import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore } from '../store/index.js';
import SEOHead from '../components/SEOHead.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const loginMutation = useMutation({
    mutationFn: () => api.post('/auth/login', form),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate('/dashboard');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Login failed'),
  });

  return (
    <>
      <SEOHead title="Login" description="Login to Farols" />
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-2xl font-display font-bold mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to your Farols account</p>

          <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300">Register</Link>
          </p>
        </div>
      </div>
    </>
  );
}
