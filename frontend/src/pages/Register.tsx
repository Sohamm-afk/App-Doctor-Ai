import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { ROUTES } from '@/constants';

const PERKS = [
  'Free for public repositories',
  'Full security & performance scan',
  'AI CTO powered by GPT-4',
  'Cloud cost estimation',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(ROUTES.WORKSPACE_UPLOAD);
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — Value prop */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center mb-6">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="font-heading text-h1 text-text mb-4">
            Start your free<br />
            <span className="gradient-text-primary">AI app audit</span>
          </h1>
          <p className="text-subtitle-md text-text-muted mb-8">
            Join thousands of engineering teams who use AppDoctor AI
            to ship more confidently.
          </p>
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-body-sm text-text">
                <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right — Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="card p-8">
            <h2 className="font-heading text-h3 text-text mb-6">Create your account</h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input label="Full name" type="text" placeholder="John Smith" leftIcon={<User size={16} />} required />
              <Input label="Work email" type="email" placeholder="you@company.com" leftIcon={<Mail size={16} />} required />
              <PasswordInput
                label="Password"
                placeholder="Min. 8 characters"
                hint="Use at least 8 characters with a mix of letters and numbers."
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={<ArrowRight size={16} />}
              >
                Create free account
              </Button>

              <p className="text-caption text-text-muted text-center">
                By creating an account you agree to our{' '}
                <a href="#" className="text-primary-600 hover:underline">Terms</a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>.
              </p>
            </form>

            <p className="text-center text-body-sm text-text-muted mt-6">
              Already have an account?{' '}
              <Link to={ROUTES.LOGIN} className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
