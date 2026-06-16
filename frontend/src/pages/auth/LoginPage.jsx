import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';
import { login } from '../../api/auth.api';
import { Calendar, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldError(errs);
    setError('');
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.access, { name: data.name, role: data.role, email });
      localStorage.setItem('refresh_token', data.refresh);
      toast.success('Welcome back to LeaveDesk!');

      const routes = {
        employee: '/employee/dashboard',
        manager: '/manager/dashboard',
        hr_admin: '/hr/dashboard',
      };
      navigate(routes[data.role] || '/employee/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* bg pattern: subtle grid */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} 
        />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">LeaveDesk</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage leave<br />the smart way.
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            From applications to approvals — streamlined, transparent, and effortless.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 space-y-3">
          {['Role-based access control', 'Real-time approvals', 'Automated balance tracking'].map(f => (
            <div key={f} className="flex items-center gap-3 text-slate-300 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-sm">
          
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-800 text-lg font-bold tracking-tight">LeaveDesk</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 mb-1 tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
          </div>

          {/* ERROR — centered alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Sign in failed</p>
                <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow ${fieldError.email ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'}`} 
              />
              {fieldError.email && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldError.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
              </div>
              <div className="relative">
                <input 
                  type={showPass ? 'text' : 'password'} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow ${fieldError.password ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'}`} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldError.password && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldError.password}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl py-2.5 text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
