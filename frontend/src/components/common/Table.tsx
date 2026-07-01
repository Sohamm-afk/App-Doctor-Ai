import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn, sortBy } from '@/utils';
import { Skeleton } from '@/components/ui/Loading';
import { EmptyState } from './EmptyState';
import type { TableColumn, SortState } from '@/types';

// ─── Props ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T extends Record<string, any>> {
  columns:    TableColumn<T>[];
  data:       T[];
  loading?:   boolean;
  emptyLabel?: string;
  getRowKey:  (row: T) => string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  maxHeight?:  string;
  className?:  string;
}

// ─── Sort Icon ────────────────────────────────────────────────────

function SortIcon({ state }: { state: 'asc' | 'desc' | null }) {
  if (state === 'asc')  return <ChevronUp   size={13} className="text-primary-500" />;
  if (state === 'desc') return <ChevronDown size={13} className="text-primary-500" />;
  return <ChevronsUpDown size={13} className="opacity-30" />;
}

// ─── DataTable ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyLabel,
  getRowKey,
  onRowClick,
  stickyHeader = false,
  maxHeight,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });

  const sortedData = useMemo(() => {
    if (!sort.key || !sort.direction) return data;
    return sortBy(data, sort.key as keyof T, sort.direction);
  }, [data, sort]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    setSort((prev) => ({
      key,
      direction:
        prev.key !== key ? 'asc' :
        prev.direction === 'asc' ? 'desc' :
        prev.direction === 'desc' ? null : 'asc',
    }));
  };

  return (
    <div className={cn('rounded-xl border border-border overflow-hidden', className)}>
      <div
        className={cn('overflow-auto no-scrollbar', maxHeight && 'overflow-y-auto')}
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse text-body-sm">
          {/* Head */}
          <thead
            className={cn(
              'bg-bg-subtle border-b border-border',
              stickyHeader && 'sticky top-0 z-10',
            )}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  style={{ width: col.width }}
                  className={cn(
                    'text-left px-4 py-3 text-caption font-semibold text-text-muted uppercase tracking-wider select-none',
                    col.sortable && 'cursor-pointer hover:text-text transition-colors',
                  )}
                  onClick={() => handleSort(String(col.key), col.sortable)}
                  aria-sort={
                    sort.key === String(col.key)
                      ? sort.direction === 'asc' ? 'ascending' : sort.direction === 'desc' ? 'descending' : 'none'
                      : undefined
                  }
                >
                  <span className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <SortIcon state={sort.key === String(col.key) ? sort.direction : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <Skeleton height={16} className={i % 2 === 0 ? 'w-full' : 'w-3/4'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    variant="no-results"
                    description={emptyLabel ?? 'No data to display.'}
                  />
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {sortedData.map((row, idx) => (
                  <motion.tr
                    key={getRowKey(row)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.15) }}
                    className={cn(
                      'border-b border-border last:border-0 bg-bg-card',
                      'transition-colors duration-100',
                      onRowClick && 'cursor-pointer hover:bg-bg-subtle',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3">
                        {col.render
                          ? col.render(row[col.key as keyof T], row)
                          : String(row[col.key as keyof T] ?? '—')}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
