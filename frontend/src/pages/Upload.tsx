import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Github, ArrowRight, Zap, Shield, Cloud, TrendingUp, Sparkles, FolderCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RepoInput } from '@/components/ui/Input';
import { InformationCard } from '@/components/cards/Cards';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

const SCAN_FEATURES = [
  { icon: <Shield size={16} className="text-red-500" />, label: 'Security Vulnerabilities' },
  { icon: <Zap size={16} className="text-amber-500" />, label: 'Performance Bottlenecks' },
  { icon: <Cloud size={16} className="text-blue-500" />, label: 'Cloud Cost Estimate' },
  { icon: <TrendingUp size={16} className="text-emerald-500" />, label: 'Scalability Analysis' },
];

const SUGGESTED_REPOS = [
  { name: 'facebook/react', url: 'https://github.com/facebook/react', lang: 'TypeScript' },
  { name: 'vercel/next.js', url: 'https://github.com/vercel/next.js', lang: 'JavaScript' },
  { name: 'supabase/supabase', url: 'https://github.com/supabase/supabase', lang: 'TypeScript' },
  { name: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi', lang: 'Python' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [urlValid, setUrlValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'zip'>('url');
  const [isDragging, setIsDragging] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);

  const handleScan = () => {
    if (activeTab === 'url' && !urlValid) return;
    if (activeTab === 'zip' && !zipFile) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(ROUTES.WORKSPACE_SCAN);
    }, 1200);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.zip')) {
      setZipFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setZipFile(files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
          <FolderCode size={26} />
        </div>
        <h1 className="font-heading text-h1 text-text mb-1 tracking-tight">Onboard Your Codebase</h1>
        <p className="text-body-sm text-text-muted">
          Provide a GitHub repository URL or upload a directory zip to begin the AI readiness scan.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            {/* Tabs Selector */}
            <div className="flex rounded-xl bg-bg-subtle p-1 mb-6 border border-border">
              {(['url', 'zip'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-body-sm font-medium transition-all',
                    activeTab === tab
                      ? 'bg-bg-card text-text shadow-sm border border-border'
                      : 'text-text-muted hover:text-text'
                  )}
                >
                  {tab === 'url' ? '🔗 Repository URL' : '📁 Upload ZIP'}
                </button>
              ))}
            </div>

            {activeTab === 'url' ? (
              <div className="space-y-4">
                <RepoInput
                  label="GitHub Repository Link"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onValidate={setUrlValid}
                  placeholder="https://github.com/your-org/your-repo"
                  leftIcon={<Github size={16} />}
                />

                {/* Quick Examples */}
                <div className="pt-2">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-2">Suggested Repositories:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SUGGESTED_REPOS.map((repo) => (
                      <button
                        key={repo.name}
                        type="button"
                        onClick={() => {
                          setUrl(repo.url);
                          setUrlValid(true);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bg-card text-left hover:border-primary-400 hover:bg-primary-50/20 transition-all text-body-sm group"
                      >
                        <span className="font-medium text-text group-hover:text-primary-600 truncate">{repo.name}</span>
                        <span className="text-[10px] font-mono bg-bg-subtle px-1.5 py-0.5 rounded text-text-muted">{repo.lang}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Drag and drop zone with animated states
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer relative group overflow-hidden',
                  isDragging
                    ? 'border-primary-500 bg-primary-50/50 scale-[1.01]'
                    : 'border-border bg-bg-card hover:border-primary-300'
                )}
              >
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <motion.div
                  animate={{ y: isDragging ? -5 : 0 }}
                  className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-500 group-hover:text-white transition-colors"
                >
                  <Upload size={24} />
                </motion.div>
                {zipFile ? (
                  <div>
                    <p className="text-body-sm font-semibold text-text mb-1">{zipFile.name}</p>
                    <p className="text-caption text-emerald-600 font-medium">Ready to analyze ({(zipFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-body-sm font-semibold text-text mb-1">
                      {isDragging ? 'Drop it here!' : 'Drag & drop directory ZIP here'}
                    </p>
                    <p className="text-caption text-text-muted mb-4">or click to browse local files</p>
                    <Button variant="outline" size="sm">Browse files</Button>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={activeTab === 'url' ? !urlValid : !zipFile}
              onClick={handleScan}
              rightIcon={<ArrowRight size={16} />}
              className="mt-6"
            >
              Start AI Scan
            </Button>
          </motion.div>
        </div>

        {/* Right Info Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Beautiful upload scanning graphic animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="card p-6 bg-emerald-950 text-emerald-200 border border-emerald-900 shadow-lg relative overflow-hidden"
          >
            {/* Pulsing scanner overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,#047857_0%,transparent_60%)] opacity-35" />
            <motion.div
              animate={{ y: [-40, 180, -40] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent blur-sm z-10"
            />

            <h4 className="text-body-sm font-bold text-white mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" />
              Secure Scan Sandbox
            </h4>
            <p className="text-caption text-emerald-300 leading-relaxed mb-4">
              All repository codes are audited in an ephemeral isolated sandbox runtime. The scanner parses file AST trees and structure schemas without copying source content.
            </p>
            <div className="border border-emerald-900 bg-emerald-950/50 rounded-lg p-3 font-mono text-[10px] text-emerald-400 space-y-1">
              <p>{"{"}</p>
              <p className="pl-4">"isolation": "gvisor-sandbox",</p>
              <p className="pl-4">"encryption": "aes-256-gcm",</p>
              <p className="pl-4">"autoCleanup": true</p>
              <p>{"}"}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <p className="text-body-sm font-semibold text-text mb-4">Comprehensive Audit Checks:</p>
            <div className="space-y-3.5">
              {SCAN_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-3 text-body-sm text-text">
                  <div className="p-1.5 rounded-lg bg-bg-subtle border border-border">
                    {f.icon}
                  </div>
                  <span className="font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
