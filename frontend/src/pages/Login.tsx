import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { ROUTES } from '@/constants';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth — navigate to workspace after 1s
    setTimeout(() => {
      setLoading(false);
      navigate(ROUTES.WORKSPACE);
    }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center mx-auto mb-4">
              <Zap size={22} className="text-white" />
            </div>
            <h1 className="font-heading text-h2 text-text mb-1">Welcome back</h1>
            <p className="text-body-sm text-text-muted">Sign in to your AppDoctor AI account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail size={16} />}
              required
              autoComplete="email"
            />
            <PasswordInput
              label="Password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary-500" />
                <span className="text-body-sm text-text-muted">Remember me</span>
              </label>
              <button type="button" className="text-body-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              rightIcon={<ArrowRight size={16} />}
            >
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-bg-card text-caption text-text-muted">or continue with</span>
            </div>
          </div>

          {/* OAuth placeholders */}
          <div className="grid grid-cols-2 gap-3">
            {['GitHub', 'Google'].map((provider) => (
              <button
                key={provider}
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn border border-border bg-bg-card text-body-sm font-medium text-text hover:bg-bg-subtle transition-colors"
              >
                {provider}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-body-sm text-text-muted mt-6">
            Don't have an account?{' '}
            <Link to={ROUTES.REGISTER} className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
