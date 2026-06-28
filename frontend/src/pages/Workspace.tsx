import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProjectCard } from '@/components/cards/Cards';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton, SkeletonCard } from '@/components/ui/Loading';
import { SearchBar } from '@/components/common/CommandPalette';
import { mockService } from '@/services/mock';
import { ROUTES } from '@/constants';
import type { Project } from '@/types';

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

export default function WorkspacePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    mockService.getProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const filtered = projects.filter((p) =>
    search
      ? p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.framework.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-h1 text-text mb-1">Workspace</h1>
          <p className="text-body-sm text-text-muted">
            {loading ? <Skeleton height={16} className="w-40" /> : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus size={16} />}>
          <Link to={ROUTES.WORKSPACE_UPLOAD}>New Project</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search projects…"
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" leftIcon={<Filter size={14} />}>
          Filter
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          variant={search ? 'no-results' : 'no-projects'}
          action={{ label: 'Upload Repository', onClick: () => {}, icon: <Plus size={16} /> }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project, i) => (
            <motion.div key={project.id} custom={i} variants={fadeUp} initial="hidden" animate="visible">
              <ProjectCard
                project={project}
                onClick={() => window.location.assign(ROUTES.PROJECT_OVERVIEW(project.id))}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
