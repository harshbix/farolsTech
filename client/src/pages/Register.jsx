import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore } from '../store/index.js';
import SEOHead from '../components/SEOHead.jsx';

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const registerMutation = useMutation({
    mutationFn: () => api.post('/auth/register', form),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success('Account created! Welcome to Farols 🎉');
      navigate(data.user?.role === 'admin' ? '/dashboard' : '/');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Registration failed'),
  });

  return (
    <>
      <SEOHead title="Create Account" description="Join Farols today" />
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-2xl font-display font-bold mb-1">Create your account</h1>
          <p className="text-gray-400 text-sm mb-6">Join Tanzania's digital newsroom</p>

          <form onSubmit={(e) => { e.preventDefault(); registerMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="input"
                placeholder="yourname"
                required
              />
            </div>
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
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
            <button
              id="register-submit"
              type="submit"
              disabled={registerMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {registerMutation.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300">Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
