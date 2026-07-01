import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Download, RefreshCw, FileCode, CheckCircle } from 'lucide-react';
import { mockService } from '@/services/mock';
import { DataTable } from '@/components/common/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatRelativeTime } from '@/utils';
import type { Report, TableColumn } from '@/types';
import axios from 'axios';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const { success, info, error } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    mockService.getReports(id)
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch((err) => {
        error('Failed to load reports', err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [id, error]);

  const handleGenerate = () => {
    if (!id) return;
    setGenerating(true);
    info('Generating Report', 'Creating the executive summary audit report...');
    setTimeout(() => {
      const newReport: Report = {
        id: crypto.randomUUID(),
        projectId: id,
        title: `Full Audit Report — Generated ${new Date().toLocaleDateString()}`,
        type: 'full-audit',
        status: 'ready',
        format: 'pdf',
        size: 1024 * 180,
        createdAt: new Date().toISOString(),
        downloadUrl: '#',
      };
      
      const updated = [newReport, ...reports];
      setReports(updated);
      localStorage.setItem(`reports_list_${id}`, JSON.stringify(updated));
      setGenerating(false);
      success('Report Ready', 'New stakeholder PDF has been successfully generated');
    }, 2000);
  };

  const handleDownload = async (report: Report) => {
    if (!id) return;
    info('Download Started', `Compiling and downloading ${report.title}...`);
    try {
      const localScanData = localStorage.getItem(`scan_result_${id}`);
      const scanResult = localScanData ? JSON.parse(localScanData) : null;
      if (!scanResult) {
        error('Download Failed', 'Scanned repository data is missing. Please run a scan first.');
        return;
      }
      
      const review = localStorage.getItem(`aicto_review_${id}`) || '';
      const localFixes = localStorage.getItem(`one_click_fixes_${id}`);
      const fixes = localFixes ? JSON.parse(localFixes) : [];

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      
      const response = await axios.post(`${apiBaseUrl}/api/ai/report/pdf`, {
        scanResult,
        review,
        fixes
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `appdoctor_report_${id}_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      success('Download Successful', `Saved ${report.title} locally.`);
    } catch (err: any) {
      error('Download Failed', 'Could not compile and download the PDF report.');
      console.error(err);
    }
  };

  const columns: TableColumn<Report>[] = [
    {
      key: 'title',
      header: 'Report Title',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
            {row.format === 'pdf' ? <FileText size={16} /> : <FileCode size={16} />}
          </div>
          <div>
            <p className="font-semibold text-text">{row.title}</p>
            <span className="text-[10px] text-text-subtle font-mono uppercase">{row.type}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Generated',
      sortable: true,
      render: (_, row) => <span className="text-text-muted">{formatRelativeTime(row.createdAt)}</span>,
    },
    {
      key: 'size',
      header: 'File Size',
      render: (_, row) => (
        <span className="text-text-muted font-mono text-caption">
          {row.size ? formatBytes(row.size) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, row) => {
        const isGenerating = row.status === 'generating';
        return (
          <Badge variant={isGenerating ? 'warning' : 'success'} dot>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (_, row) => (
        <Button
          variant="outline"
          size="xs"
          leftIcon={<Download size={12} />}
          disabled={row.status === 'generating'}
          onClick={() => handleDownload(row)}
        >
          Download
        </Button>
      ),
    },
  ];

  const localScanData = id ? localStorage.getItem(`scan_result_${id}`) : null;
  if (!localScanData && !loading) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">No analysis available.</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Please onboard and run a scan on this repository to view stakeholder reports.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={22} className="text-blue-500" />
            <h1 className="font-heading text-h1 text-text">Reports</h1>
          </div>
          <p className="text-body-sm text-text-muted">
            Generate, download, and review stakeholder reports summarizing code compliance and security metrics.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={handleGenerate}
          loading={generating}
        >
          Generate Report
        </Button>
      </motion.div>

      {/* Reports Table */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          getRowKey={(report) => report.id}
        />
      </motion.div>
    </div>
  );
}
