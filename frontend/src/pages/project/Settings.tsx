import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { mockService } from '@/services/mock';
import { Input, Select, Checkbox, Slider } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { Project } from '@/types';

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();
  const [project, setProject] = useState<Project | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [provider, setProvider] = useState('aws');
  const [teamSize, setTeamSize] = useState(3);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (!id) return;
    mockService.getProject(id)
      .then((data) => {
        if (data) {
          setProject(data);
          setName(data.name);
          setDescription(data.description);
          setRepoUrl(data.repositoryUrl);
          setProvider(data.cloudProvider || 'aws');
          setTeamSize(data.teamSize || 3);
        }
        setLoading(false);
      })
      .catch((err) => {
        error('Failed to load settings', err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [id, error]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      success('Settings Saved', 'Project configuration has been updated successfully.');
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-body-sm text-text-muted">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={22} className="text-secondary-500" />
          <h1 className="font-heading text-h1 text-text">Settings</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Configure repository details, provider integrations, and audit criteria.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
        {/* Form Card */}
        <form onSubmit={handleSave} className="card p-8 space-y-6">
          <h3 className="text-h4 font-semibold text-text border-b border-border pb-3">Project Metadata</h3>

          <div className="grid grid-cols-1 gap-5">
            <Input
              label="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HealthTrack API"
              required
            />

            <Input
              label="Project Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Healthcare API built with FastAPI"
            />

            <Input
              label="Repository URL"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="e.g. https://github.com/acme/healthtrack-api"
              required
            />
          </div>

          <h3 className="text-h4 font-semibold text-text border-b border-border pb-3 pt-4">Configuration</h3>

          <div className="grid grid-cols-1 gap-5">
            <Select
              label="Cloud Cost Target Provider"
              options={[
                { value: 'aws', label: 'Amazon Web Services (AWS)' },
                { value: 'gcp', label: 'Google Cloud Platform (GCP)' },
                { value: 'azure', label: 'Microsoft Azure' },
                { value: 'vercel', label: 'Vercel / Next.js hosting' },
              ]}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />

            <Slider
              label="Engineering Team Size"
              min={1}
              max={50}
              value={teamSize}
              onChangeValue={setTeamSize}
              hint="Helps calculate technical debt remediation velocity."
            />

            <div className="pt-2">
              <Checkbox
                label="Enable automatic weekly slack notifications & audit summaries"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="border-t border-border pt-6 flex items-center justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              leftIcon={<Save size={16} />}
            >
              Save Settings
            </Button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="card p-8 border-red-200 bg-red-50/20 space-y-4">
          <h3 className="text-h4 font-semibold text-red-800 border-b border-red-100 pb-3 flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-600" />
            Danger Zone
          </h3>
          <p className="text-body-sm text-red-700">
            Once you delete a project, all historical audits, security issue tracks, and cloud cost predictions will be permanently removed.
          </p>
          <div className="pt-2">
            <Button
              variant="danger"
              leftIcon={<Trash2 size={16} />}
              onClick={() => success('Project Deleted', 'The project was successfully removed from the workspace')}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
