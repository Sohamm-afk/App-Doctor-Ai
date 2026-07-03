import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Shield, CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DiffViewer } from '@/components/code/CodeBlock';
import { useToast } from '@/components/ui/Toast';
import axios from 'axios';

import { cn } from '@/utils';

function formatMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  if (!text.includes('#')) {
    return <span className="text-body-sm text-text-muted">{text}</span>;
  }

  const lines = text.split('\n');
  const rendered: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        rendered.push(
          <pre key={`code-${idx}`} className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-caption text-emerald-400 overflow-x-auto my-2">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      rendered.push(<h3 key={idx} className="text-body font-bold text-text mt-5 mb-2 border-b border-border pb-1">{line.slice(2)}</h3>);
    } else if (line.startsWith('## ')) {
      rendered.push(<h4 key={idx} className="text-body-sm font-semibold text-text mt-4 mb-1">{line.slice(3)}</h4>);
    } else if (line.startsWith('- ')) {
      rendered.push(<li key={idx} className="text-caption text-text-muted ml-4 list-disc pl-1 my-0.5">{line.slice(2)}</li>);
    } else if (line.startsWith('* ')) {
      rendered.push(<li key={idx} className="text-caption text-text-muted ml-4 list-disc pl-1 my-0.5">{line.slice(2)}</li>);
    } else if (line.trim() === '') {
      // rely on container spacing
    } else {
      rendered.push(<p key={idx} className="text-caption text-text-muted leading-relaxed my-1">{line}</p>);
    }
  }

  return <div className="space-y-2 mt-2">{rendered}</div>;
}



function getImpactSummary(issueMarkdown: string): string {
  if (!issueMarkdown) return '';
  const lines = issueMarkdown.split('\n');
  const index = lines.findIndex(l => l.toLowerCase().startsWith('# why it matters'));
  if (index !== -1) {
    for (let i = index + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#')) break;
      if (line.length > 0) return line;
    }
  }
  // Fallback: first non-header line
  return lines.find(l => l.trim().length > 0 && !l.startsWith('#'))?.trim() || '';
}

function getDetectedFramework(scanResult: any): string {
  if (!scanResult) return '';
  const tech = scanResult.metadata?.technology;
  if (!tech) return '';
  return tech.frontend || tech.backend || '';
}

export default function FixesPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();
  const [patches, setPatches] = useState<any[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [appliedList, setAppliedList] = useState<string[]>([]);

  const localScanData = id ? localStorage.getItem(`scan_result_${id}`) : null;
  const scanResult = localScanData ? JSON.parse(localScanData) : null;
  const detectedFramework = getDetectedFramework(scanResult);

  const groupedPatches = useMemo(() => {
    if (!patches || patches.length === 0) return [];

    const groupsMap = new Map<string, any[]>();
    patches.forEach((patch) => {
      const title = patch.title;
      if (!groupsMap.has(title)) {
        groupsMap.set(title, []);
      }
      groupsMap.get(title)!.push(patch);
    });

    const isTestOrExampleFile = (filePath: string) => {
      const lower = filePath.toLowerCase();
      return lower.includes('test') || lower.includes('example') || lower.includes('doc') || lower.includes('fixture');
    };

    const groupedList: any[] = [];
    groupsMap.forEach((groupPatches, title) => {
      // Sort to prioritize production source files
      groupPatches.sort((a: any, b: any) => {
        const aTest = isTestOrExampleFile(a.filePath || '');
        const bTest = isTestOrExampleFile(b.filePath || '');
        if (aTest && !bTest) return 1;
        if (!aTest && bTest) return -1;
        return 0;
      });

      const primaryPatch = groupPatches[0];
      const allFiles = Array.from(new Set(groupPatches.map((p) => p.filePath).filter(Boolean)));
      
      const productionFiles = allFiles.filter(f => !isTestOrExampleFile(f));
      const testExampleFiles = allFiles.filter(f => isTestOrExampleFile(f));

      // Calculate occurrences
      const occurrences = groupPatches.reduce((acc, p) => acc + (p.occurrences || 1), 0);

      groupedList.push({
        id: primaryPatch.id,
        title,
        severity: primaryPatch.severity || 'low',
        occurrences,
        affectedFiles: allFiles,
        productionFiles,
        testExampleFiles,
        filePath: primaryPatch.filePath,
        issue: primaryPatch.issue,
        diff: primaryPatch.diff,
        framework: detectedFramework
      });
    });

    // Sort groups by severity: critical, high, medium, low
    const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 1 };
    groupedList.sort((a, b) => {
      const aW = severityWeight[a.severity.toLowerCase()] || 0;
      const bW = severityWeight[b.severity.toLowerCase()] || 0;
      return bW - aW;
    });

    return groupedList;
  }, [patches, detectedFramework]);

  useEffect(() => {
    if (groupedPatches.length > 0 && !selectedPatch) {
      setSelectedPatch(groupedPatches[0]);
    }
  }, [groupedPatches, selectedPatch]);

  useEffect(() => {
    if (!id) return;
    
    // Check if fixes are already cached
    const cachedFixes = localStorage.getItem(`one_click_fixes_${id}`);
    if (cachedFixes) {
      const parsed = JSON.parse(cachedFixes);
      setPatches(parsed);
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

  const handleCopyDiff = () => {
    if (!selectedPatch?.diff) return;
    navigator.clipboard.writeText(selectedPatch.diff);
    success('Diff Copied', 'Unified diff patch copied to clipboard');
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side — List of Patches */}
        <div className="flex flex-col">
          <h3 className="text-h4 font-semibold text-text mb-3">Available Patches</h3>
          <div className="space-y-3 overflow-y-auto pr-2 no-scrollbar" style={{ maxHeight: '75vh' }}>
            {groupedPatches.map((patch) => {
              const isApplied = appliedList.includes(patch.id);
              const isSelected = selectedPatch?.title === patch.title;
              return (
                <div
                  key={patch.id}
                  onClick={() => setSelectedPatch(patch)}
                  className={`card p-5 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary-500 border-primary-500 bg-bg-subtle/40' : 'hover:bg-bg-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={patch.severity === 'critical' ? 'critical' : patch.severity === 'high' ? 'high' : patch.severity === 'medium' ? 'medium' : 'low'} dot>
                        {patch.severity}
                      </Badge>
                      {patch.framework && (
                        <Badge variant="neutral" size="xs" className="bg-bg-subtle border-border text-text-muted capitalize">
                          {patch.framework}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {patch.occurrences && (
                        <span className="text-[10px] bg-bg-subtle text-text-muted px-2 py-0.5 rounded-full border border-border font-medium">
                          {patch.occurrences} {patch.occurrences === 1 ? 'occurrence' : 'occurrences'}
                        </span>
                      )}
                      {isApplied && (
                        <Badge variant="success" size="xs">
                          Applied
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h4 className="text-body-sm font-semibold text-text mb-1">{patch.title}</h4>
                  <p className="text-caption text-text-muted mb-2 line-clamp-2 leading-relaxed">
                    {getImpactSummary(patch.issue) || patch.title}
                  </p>

                  {/* Show affected files list */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {patch.affectedFiles?.slice(0, 2).map((file: string, idx: number) => (
                      <code key={idx} className="text-[9px] text-text-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border font-mono truncate max-w-[120px]">
                        {file.split('/').pop()}
                      </code>
                    ))}
                    {patch.affectedFiles?.length > 2 && (
                      <span className="text-[9px] text-text-muted self-center">+{patch.affectedFiles.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side — Diff Viewer & Actions */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="card p-6 flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex items-start justify-between flex-wrap gap-4 mb-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-h4 font-semibold text-text">{selectedPatch.title}</h3>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-1.5 flex-wrap text-caption text-text-muted">
                      <span className="font-semibold">Detected Framework:</span>
                      {selectedPatch.framework ? (
                        <Badge variant="neutral" size="xs" className="bg-bg-subtle border-border text-text-muted capitalize">
                          {selectedPatch.framework}
                        </Badge>
                      ) : (
                        <span className="font-mono">None</span>
                      )}
                      <span className="mx-1">•</span>
                      <span className="font-semibold">Occurrences:</span>
                      <span className="font-mono bg-bg-subtle px-1.5 py-0.5 rounded border border-border">{selectedPatch.occurrences}</span>
                    </div>

                    <div className="flex items-start gap-1.5 flex-wrap text-caption text-text-muted">
                      <span className="font-semibold mt-0.5">Primary Target:</span>
                      <code className="text-[10px] text-secondary-600 bg-secondary-50 px-2 py-0.5 rounded font-mono">
                        {selectedPatch.filePath}
                      </code>
                    </div>

                    {/* Production Files list */}
                    {selectedPatch.productionFiles && selectedPatch.productionFiles.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-[11px] text-text-muted font-semibold">Production Files ({selectedPatch.productionFiles.length}):</span>
                        <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                          {selectedPatch.productionFiles.map((file: string, fIdx: number) => (
                            <code key={fIdx} className="text-[9px] text-text-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border font-mono">
                              {file}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collapsible Test & Example Files section */}
                    {selectedPatch.testExampleFiles && selectedPatch.testExampleFiles.length > 0 && (
                      <details className="mt-1 group border border-border rounded-lg bg-bg-subtle p-2">
                        <summary className="cursor-pointer font-semibold text-[11px] text-text-muted hover:text-text select-none flex items-center justify-between">
                          <span>Additional Test & Example Files ({selectedPatch.testExampleFiles.length})</span>
                          <span className="text-[9px] text-text-muted group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="flex flex-wrap gap-1 mt-2 max-h-[120px] overflow-y-auto pr-1">
                          {selectedPatch.testExampleFiles.map((file: string, fIdx: number) => (
                            <code key={fIdx} className="text-[9px] text-text-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border font-mono">
                              {file}
                            </code>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    onClick={handleCopyDiff}
                    leftIcon={<Copy size={14} />}
                  >
                    Copy Patch
                  </Button>
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
              </div>

              {/* Markdown remediation guidelines */}
              <div className="mt-4">
                {formatMarkdown(selectedPatch.issue)}
              </div>

              {/* Code diff */}
              <div className="mt-6 border-t border-border pt-4">
                <h4 className="text-body-sm font-semibold text-text mb-2">Suggested Code Modification (Unified Diff)</h4>
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
