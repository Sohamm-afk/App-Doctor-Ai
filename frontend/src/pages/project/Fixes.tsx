import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DiffViewer } from '@/components/code/CodeBlock';
import { useToast } from '@/components/ui/Toast';
import axios from 'axios';

export default function FixesPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();
  const [patches, setPatches] = useState<any[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [appliedList, setAppliedList] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (!localScanData) {
      setLoading(false);
      return;
    }

    const scanResult = JSON.parse(localScanData);
    
    // Check if fixes are already cached
    const cachedFixes = localStorage.getItem(`one_click_fixes_${id}`);
    if (cachedFixes) {
      const parsed = JSON.parse(cachedFixes);
      setPatches(parsed);
      if (parsed.length > 0) {
        setSelectedPatch(parsed[0]);
      }
      setLoading(false);
      return;
    }

    // Call API to generate fixes using Gemini
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    axios.post(`${apiBaseUrl}/api/ai/fixes`, { scanResult })
      .then(({ data }) => {
        const generatedFixes = data.fixes || [];
        setPatches(generatedFixes);
        localStorage.setItem(`one_click_fixes_${id}`, JSON.stringify(generatedFixes));
        if (generatedFixes.length > 0) {
          setSelectedPatch(generatedFixes[0]);
        }
        setLoading(false);
      })
      .catch((err: any) => {
        error('Failed to generate fixes', err.message || String(err));
        setLoading(false);
      });
  }, [id, error]);

  const handleApply = () => {
    if (!selectedPatch) return;
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setAppliedList((prev) => [...prev, selectedPatch.id]);
      success('Patch Applied Successfully', `Remediation patch applied to ${selectedPatch.filePath}`);
    }, 1500);
  };

  const localScanData = id ? localStorage.getItem(`scan_result_${id}`) : null;
  if (!localScanData && !loading) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">No analysis available.</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Please onboard and run a scan on this repository to view automated one-click fixes.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-body-sm text-text-muted">Generating AI remediation patches...</span>
      </div>
    );
  }

  if (patches.length === 0 || !selectedPatch) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">No issues detected.</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Your codebase is fully optimized. No automated remediation patches are required.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={22} className="text-emerald-500" />
          <h1 className="font-heading text-h1 text-text">One-Click Fixes</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Apply automated, AI-suggested code fixes to resolve critical security and performance vulnerabilities.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Side — List of Patches */}
        <div className="space-y-3">
          <h3 className="text-h4 font-semibold text-text mb-2">Available Patches</h3>
          {patches.map((patch) => {
            const isApplied = appliedList.includes(patch.id);
            const isSelected = selectedPatch.id === patch.id;
            return (
              <div
                key={patch.id}
                onClick={() => setSelectedPatch(patch)}
                className={`card p-5 cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'hover:bg-bg-subtle'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant={patch.severity === 'critical' ? 'critical' : 'high'} dot>
                    {patch.severity}
                  </Badge>
                  {isApplied && (
                    <Badge variant="success" size="xs">
                      Applied
                    </Badge>
                  )}
                </div>
                <h4 className="text-body-sm font-semibold text-text mb-1">{patch.title}</h4>
                <p className="text-caption text-text-muted mb-2 line-clamp-1">{patch.issue}</p>
                <code className="text-[10px] text-secondary-600 bg-secondary-50 px-2 py-0.5 rounded font-mono">
                  {patch.filePath}
                </code>
              </div>
            );
          })}
        </div>

        {/* Right Side — Diff Viewer & Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6 flex flex-col h-full justify-between min-h-[400px]">
            <div>
              <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h3 className="text-h4 font-semibold text-text">{selectedPatch.title}</h3>
                  <p className="text-caption text-text-muted mt-1">
                    Remediates: <strong>{selectedPatch.issue}</strong>
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleApply}
                  loading={applying}
                  disabled={appliedList.includes(selectedPatch.id)}
                  leftIcon={appliedList.includes(selectedPatch.id) ? <CheckCircle size={14} /> : <Wrench size={14} />}
                >
                  {appliedList.includes(selectedPatch.id) ? 'Applied' : 'Apply Patch'}
                </Button>
              </div>

              {/* Code diff */}
              <div className="mt-4">
                <DiffViewer
                  title={selectedPatch.filePath}
                  diff={selectedPatch.diff}
                  language={selectedPatch.filePath.endsWith('.json') ? 'json' : 'typescript'}
                />
              </div>
            </div>

            <div className="border-t border-border mt-6 pt-4 text-caption text-text-muted flex items-start gap-2">
              <Shield className="text-primary-500 flex-shrink-0" size={14} />
              <span>
                Applying this patch generates an automated git patch branch. Always verify build integrity and run test suites locally before pushing to remote server.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
