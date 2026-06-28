import {
  LineChart as ReLineChart,
  AreaChart as ReAreaChart,
  BarChart as ReBarChart,
  PieChart as RePieChart,
  RadarChart as ReRadarChart,
  Line, Area, Bar, Pie, Cell, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PolarRadiusAxis, Legend,
} from 'recharts';
import { cn } from '@/utils';
import { Spinner } from '@/components/ui/Loading';

// ─── Shared Types ─────────────────────────────────────────────────

interface BaseChartProps {
  data:      Record<string, unknown>[];
  className?: string;
  height?:   number;
  loading?:  boolean;
}

// ─── Custom Tooltip ───────────────────────────────────────────────

interface CustomTooltipProps {
  active?:  boolean;
  payload?: { name: string; value: number; color: string }[];
  label?:   string;
  formatter?: (v: number) => string;
}

function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl p-3 shadow-dropdown text-body-sm">
      {label && <p className="font-semibold text-text mb-1.5">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-muted">{entry.name}:</span>
          <span className="font-medium text-text">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart container ──────────────────────────────────────────────

function ChartContainer({ loading, height = 220, className, children }: {
  loading?: boolean; height?: number; className?: string; children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      {children as React.ReactElement}
    </ResponsiveContainer>
  );
}

// ─── Color palette ────────────────────────────────────────────────

export const CHART_COLORS = {
  primary:   '#10B981',
  secondary: '#3B82F6',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  purple:    '#8B5CF6',
  cyan:      '#06B6D4',
  pink:      '#EC4899',
  indigo:    '#6366F1',
} as const;

export const CHART_COLOR_LIST = Object.values(CHART_COLORS);

// ─── Line Chart ───────────────────────────────────────────────────

interface LineChartProps extends BaseChartProps {
  xKey:      string;
  lines:     { key: string; color?: string; name?: string }[];
  formatter?: (v: number) => string;
}

export function AppLineChart({ data, xKey, lines, className, height = 220, loading, formatter }: LineChartProps) {
  return (
    <ChartContainer loading={loading} height={height} className={className}>
      <ReLineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name ?? line.key}
            stroke={line.color ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </ReLineChart>
    </ChartContainer>
  );
}

// ─── Area Chart ───────────────────────────────────────────────────

interface AreaChartProps extends BaseChartProps {
  xKey:   string;
  areas:  { key: string; color?: string; name?: string }[];
  formatter?: (v: number) => string;
}

export function AppAreaChart({ data, xKey, areas, className, height = 220, loading, formatter }: AreaChartProps) {
  return (
    <ChartContainer loading={loading} height={height} className={className}>
      <ReAreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          {areas.map((area, i) => {
            const color = area.color ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length];
            return (
              <linearGradient key={area.key} id={`grad-${area.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {areas.map((area, i) => {
          const color = area.color ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length];
          return (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.name ?? area.key}
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${area.key})`}
            />
          );
        })}
      </ReAreaChart>
    </ChartContainer>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────

interface BarChartProps extends BaseChartProps {
  xKey:  string;
  bars:  { key: string; color?: string; name?: string }[];
  horizontal?: boolean;
  formatter?:  (v: number) => string;
}

export function AppBarChart({ data, xKey, bars, className, height = 220, loading, horizontal, formatter }: BarChartProps) {
  return (
    <ChartContainer loading={loading} height={height} className={className}>
      <ReBarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={!horizontal} horizontal={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          </>
        )}
        <Tooltip content={<CustomTooltip formatter={formatter} />} cursor={{ fill: '#F1F5F9' }} />
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name ?? bar.key}
            fill={bar.color ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </ReBarChart>
    </ChartContainer>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────

interface PieChartProps {
  data:        { name: string; value: number; color?: string }[];
  className?:  string;
  height?:     number;
  loading?:    boolean;
  innerRadius?: number;
  showLegend?: boolean;
}

export function AppPieChart({ data, className, height = 220, loading, innerRadius = 0, showLegend = true }: PieChartProps) {
  return (
    <ChartContainer loading={loading} height={height} className={className}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="75%"
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={entry.color ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
      </RePieChart>
    </ChartContainer>
  );
}

// ─── Radar Chart ──────────────────────────────────────────────────

interface RadarChartProps {
  data:       { subject: string; value: number; fullMark?: number }[];
  className?: string;
  height?:    number;
  loading?:   boolean;
  color?:     string;
}

export function AppRadarChart({ data, className, height = 220, loading, color = '#10B981' }: RadarChartProps) {
  return (
    <ChartContainer loading={loading} height={height} className={className}>
      <ReRadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="#E5E7EB" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6B7280' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Score" dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
        <Tooltip content={<CustomTooltip />} />
      </ReRadarChart>
    </ChartContainer>
  );
}
