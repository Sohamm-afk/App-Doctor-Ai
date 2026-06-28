import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Github, Link, CheckCircle, ArrowRight, Zap, Shield, Cloud, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RepoInput } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { InformationCard } from '@/components/cards/Cards';
import { ROUTES } from '@/constants';

const SCAN_FEATURES = [
  { icon: <Shield size={16} className="text-red-500" />,    label: 'Security Vulnerabilities' },
  { icon: <Zap size={16} className="text-amber-500" />,     label: 'Performance Bottlenecks'  },
  { icon: <Cloud size={16} className="text-blue-500" />,    label: 'Cloud Cost Estimate'      },
  { icon: <TrendingUp size={16} className="text-emerald-500"/>, label: 'Scalability Analysis' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [urlValid, setUrlValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'zip'>('url');

  const handleScan = () => {
    if (!urlValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(ROUTES.WORKSPACE_SCAN);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-5 shadow-card-md">
          <Zap size={30} className="text-white" />
        </div>
        <h1 className="font-heading text-h1 text-text mb-2">Upload your repository</h1>
        <p className="text-subtitle-md text-text-muted">
          Paste your repository URL or upload a zip to get your full AI audit.
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-8 mb-6"
      >
        {/* Tabs */}
        <div className="flex rounded-xl bg-bg-subtle p-1 mb-6">
          {(['url', 'zip'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-body-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-text shadow-card'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'url' ? '🔗 Repository URL' : '📁 Upload ZIP'}
            </button>
          ))}
        </div>

        {activeTab === 'url' ? (
          <div className="space-y-4">
            <RepoInput
              label="Repository URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onValidate={setUrlValid}
              placeholder="https://github.com/your-org/your-repo"
              leftIcon={<Github size={16} />}
            />

            {/* Quick examples */}
            <div className="flex flex-wrap gap-2">
              <span className="text-caption text-text-muted">Try:</span>
              {[
                'github.com/vercel/next.js',
                'github.com/supabase/supabase',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setUrl(`https://${ex}`); setUrlValid(true); }}
                  className="text-caption text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer group">
            <Upload size={36} className="text-text-subtle mx-auto mb-3 group-hover:text-primary-400 transition-colors" />
            <p className="text-body-sm font-medium text-text mb-1">Drop your ZIP file here</p>
            <p className="text-caption text-text-muted mb-4">or click to browse</p>
            <Button variant="outline" size="sm">Browse files</Button>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={activeTab === 'url' && !urlValid}
          onClick={handleScan}
          rightIcon={<ArrowRight size={18} />}
          className="mt-6"
        >
          Start AI Scan
        </Button>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="card p-6"
      >
        <p className="text-body-sm font-semibold text-text mb-4">What we'll analyze:</p>
        <div className="grid grid-cols-2 gap-3">
          {SCAN_FEATURES.map((f) => (
            <div key={f.label} className="flex items-center gap-2.5 text-body-sm text-text">
              {f.icon}
              <span>{f.label}</span>
            </div>
          ))}
        </div>
        <InformationCard
          title="Private repositories"
          description="We analyze your code in a secure, sandboxed environment. We never store your source code."
          variant="info"
          icon={<Shield size={14} className="text-blue-500" />}
          className="mt-4"
        />
      </motion.div>
    </div>
  );
}
