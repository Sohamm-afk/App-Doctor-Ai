import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { TerminalDemo } from '@/components/terminal/Terminal';
import { Button } from '@/components/ui/Button';
import { HorizontalTimeline } from '@/components/timeline/Timeline';
import { ROUTES } from '@/constants';
import type { TimelineItem } from '@/components/timeline/Timeline';

const SCAN_STEPS: TimelineItem[] = [
  { id: 's1', title: 'Clone Repo',       status: 'complete', date: '0.8s'  },
  { id: 's2', title: 'Security Scan',    status: 'complete', date: '12.4s' },
  { id: 's3', title: 'Perf Analysis',    status: 'complete', date: '8.2s'  },
  { id: 's4', title: 'Cloud Estimation', status: 'complete', date: '4.1s'  },
  { id: 's5', title: 'AI Processing',    status: 'complete', date: '14.6s' },
  { id: 's6', title: 'Report Ready',     status: 'active',   date: 'Now'   },
];

export default function ScanningPage() {
  const navigate = useNavigate();
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setComplete(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-heading text-h1 text-text mb-2">Scanning your repository…</h1>
        <p className="text-body-sm text-text-muted">AppDoctor AI is analyzing your codebase</p>
      </div>

      {/* Progress steps */}
      <div className="card p-6 mb-6">
        <HorizontalTimeline items={SCAN_STEPS} />
      </div>

      {/* Terminal */}
      <div className="mb-6">
        <TerminalDemo />
      </div>

      {/* Complete banner */}
      {complete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 border-primary-100 bg-primary-50 text-center"
        >
          <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="font-heading text-h3 text-text mb-1">Scan complete!</h2>
          <p className="text-body-sm text-text-muted mb-4">
            Your report is ready. Launch Score: <strong className="text-amber-600">74/100</strong>
          </p>
          <Button
            variant="primary"
            size="md"
            rightIcon={<ArrowRight size={16} />}
            onClick={() => navigate(ROUTES.PROJECT_OVERVIEW('proj-001'))}
          >
            View Full Report
          </Button>
        </motion.div>
      )}
    </div>
  );
}
